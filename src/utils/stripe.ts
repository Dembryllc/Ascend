import type { UserProfile } from '@/types'

const MONTHLY_BASE = import.meta.env.VITE_STRIPE_PRO_MONTHLY_URL as string | undefined
const ANNUAL_BASE = import.meta.env.VITE_STRIPE_PRO_ANNUAL_URL as string | undefined

function buildUrl(base: string | undefined, profile: UserProfile | null | undefined): string | null {
  if (!base) return null
  const params = new URLSearchParams()
  if (profile?.uid) params.set('client_reference_id', profile.uid)
  if (profile?.email) params.set('prefilled_email', profile.email)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

export function stripeMonthlyUrl(profile: UserProfile | null | undefined): string | null {
  return buildUrl(MONTHLY_BASE, profile)
}

export function stripeAnnualUrl(profile: UserProfile | null | undefined): string | null {
  return buildUrl(ANNUAL_BASE, profile)
}
