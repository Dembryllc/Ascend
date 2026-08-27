import { httpsCallable } from 'firebase/functions'
import { functions } from './config'

export async function openBillingPortal(): Promise<string> {
  const call = httpsCallable<{ returnUrl: string }, { url: string }>(functions, 'createPortalSession')
  const result = await call({ returnUrl: window.location.href })
  return result.data.url
}
