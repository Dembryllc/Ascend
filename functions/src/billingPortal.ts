import { onCall, HttpsError } from 'firebase-functions/v2/https'
import Stripe from 'stripe'
import * as admin from 'firebase-admin'

// Teachers have no self-serve way to cancel or manage their Pro subscription
// today — the only path is emailing support, who then does it manually in
// Stripe. This opens Stripe's own hosted Billing Portal for the signed-in
// user's Stripe customer, so cancel / update-card / view-invoices become
// self-serve. Requires a Billing Portal configuration to exist for this
// Stripe account (Dashboard → Settings → Billing → Customer portal) — Stripe
// returns a clear error here if none has been set up yet.
const ALLOWED_RETURN_ORIGINS = ['https://easy-annotate.com', 'http://localhost:5173']

function safeReturnUrl(requested: unknown): string {
  const fallback = 'https://easy-annotate.com/teacher'
  if (typeof requested !== 'string') return fallback
  try {
    const url = new URL(requested)
    return ALLOWED_RETURN_ORIGINS.includes(url.origin) ? url.toString() : fallback
  } catch {
    return fallback
  }
}

export const createPortalSession = onCall(
  { secrets: ['STRIPE_SECRET_KEY'] },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Sign in required.')
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      throw new HttpsError('internal', 'Server misconfigured: missing Stripe key.')
    }

    const userDoc = await admin.firestore().collection('users').doc(uid).get()
    const stripeCustomerId = userDoc.data()?.stripeCustomerId as string | undefined
    if (!stripeCustomerId) {
      throw new HttpsError(
        'failed-precondition',
        'No billing account found for this user. This is only available after a Pro checkout has completed.',
      )
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-02-24.acacia' })

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: safeReturnUrl(request.data?.returnUrl),
    })

    return { url: session.url }
  },
)
