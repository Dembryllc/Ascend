import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import Stripe from 'stripe'

admin.initializeApp()

// ---------------------------------------------------------------------------
// SETUP REQUIRED (manual steps before deploying):
//
// 1. Get your Stripe secret key from dashboard.stripe.com → Developers → API keys
//    Run: firebase functions:secrets:set STRIPE_SECRET_KEY
//
// 2. Create a Stripe webhook endpoint pointing to this function's URL:
//    URL: https://us-central1-ascend-annotate.cloudfunctions.net/stripeWebhook
//    Events to listen for:
//      - checkout.session.completed
//      - customer.subscription.deleted
//      - customer.subscription.updated
//    Copy the "Signing secret" shown after creating the endpoint.
//    Run: firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
//
// 3. Create Stripe Payment Links in the Stripe dashboard:
//    - One for Pro Monthly ($8/month)
//    - One for Pro Annual ($72/year)
//    Under "Advanced" → enable "Collect customer email" and "Allow promotion codes"
//    Under "After payment" → set client_reference_id passthrough (this is set by the app URL)
//    Paste both URLs into your Vite env:
//      VITE_STRIPE_PRO_MONTHLY_URL=https://buy.stripe.com/...
//      VITE_STRIPE_PRO_ANNUAL_URL=https://buy.stripe.com/...
//    Add these to .github/workflows/firebase-deploy.yml as env vars (same pattern as VITE_FIREBASE_*)
//
// 4. Deploy functions:
//    cd functions && npm install
//    cd .. && firebase deploy --only functions --project ascend-annotate
// ---------------------------------------------------------------------------

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-04-30.basil',
})

export const stripeWebhook = functions
  .runWith({ secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] })
  .https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature']
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!sig || !webhookSecret) {
      res.status(400).send('Missing signature or webhook secret.')
      return
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      functions.logger.error('Webhook signature verification failed:', message)
      res.status(400).send(`Webhook Error: ${message}`)
      return
    }

    const db = admin.firestore()

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          // client_reference_id is set by the frontend to profile.uid
          const uid = session.client_reference_id
          if (!uid) {
            functions.logger.warn('checkout.session.completed: no client_reference_id')
            break
          }
          await db.collection('users').doc(uid).update({
            subscriptionStatus: 'pro',
            stripeCustomerId: session.customer ?? null,
          })
          functions.logger.info(`User ${uid} upgraded to pro.`)
          break
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription
          const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
          // Find the user by stripeCustomerId
          const snap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get()
          if (snap.empty) {
            functions.logger.warn(`No user found for Stripe customer ${customerId}`)
            break
          }
          await snap.docs[0].ref.update({ subscriptionStatus: 'free' })
          functions.logger.info(`User ${snap.docs[0].id} downgraded to free (subscription cancelled).`)
          break
        }

        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription
          const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
          const isActive = sub.status === 'active' || sub.status === 'trialing'
          const snap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get()
          if (snap.empty) break
          await snap.docs[0].ref.update({ subscriptionStatus: isActive ? 'pro' : 'free' })
          functions.logger.info(`User ${snap.docs[0].id} subscription updated: ${sub.status}`)
          break
        }

        default:
          // Ignore other event types
          break
      }

      res.json({ received: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      functions.logger.error('Error processing webhook event:', message)
      res.status(500).send('Internal error.')
    }
  })
