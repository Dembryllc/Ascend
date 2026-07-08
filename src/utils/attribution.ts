// First-touch signup attribution. Captures utm_source/utm_campaign from the
// URL once per browser session so RegisterPage can tag which marketing
// channel drove a trial signup (see functions/src/activecampaign.ts —
// the `ea-social-signup` AC tag is scoped to the LinkedIn/Instagram push,
// not every signup).
const STORAGE_KEY = 'ea-attribution'

export interface Attribution {
  source: string | null
  campaign: string | null
}

export function captureAttribution(): void {
  if (sessionStorage.getItem(STORAGE_KEY)) return // first-touch only

  const params = new URLSearchParams(window.location.search)
  const source = params.get('utm_source')
  const campaign = params.get('utm_campaign')
  if (!source && !campaign) return

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ source, campaign }))
}

export function getStoredAttribution(): Attribution | null {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Attribution
  } catch {
    return null
  }
}
