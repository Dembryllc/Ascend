import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import Stripe from 'stripe'
import * as admin from 'firebase-admin'

admin.initializeApp()

export { syncTeacherSignupToActiveCampaign } from './activecampaign'
export { subscribeLeadMagnet } from './leadMagnet'
export { createPortalSession } from './billingPortal'

export const stripeWebhook = onRequest(
  { secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] },
  async (req, res) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!stripeSecretKey || !webhookSecret) {
      res.status(500).send('Server misconfigured: missing secrets.')
      return
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
    })

    const sig = req.headers['stripe-signature']
    if (!sig) {
      res.status(400).send('Missing stripe-signature header.')
      return
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.error('Webhook signature verification failed:', message)
      res.status(400).send(`Webhook Error: ${message}`)
      return
    }

    const db = admin.firestore()

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          const uid = session.client_reference_id
          if (!uid) {
            logger.warn('checkout.session.completed: no client_reference_id')
            break
          }
          await db.collection('users').doc(uid).update({
            subscriptionStatus: 'pro',
            stripeCustomerId: session.customer ?? null,
          })
          logger.info(`User ${uid} upgraded to pro.`)
          break
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription
          const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
          const snap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get()
          if (snap.empty) {
            logger.warn(`No user found for Stripe customer ${customerId}`)
            break
          }
          await snap.docs[0].ref.update({ subscriptionStatus: 'free' })
          logger.info(`User ${snap.docs[0].id} downgraded to free (subscription cancelled).`)
          break
        }

        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription
          const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
          const isActive = sub.status === 'active' || sub.status === 'trialing'
          const snap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get()
          if (snap.empty) break
          await snap.docs[0].ref.update({ subscriptionStatus: isActive ? 'pro' : 'free' })
          logger.info(`User ${snap.docs[0].id} subscription updated: ${sub.status}`)
          break
        }

        default:
          break
      }

      res.json({ received: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.error('Error processing webhook event:', message)
      res.status(500).send('Internal error.')
    }
  }
)
