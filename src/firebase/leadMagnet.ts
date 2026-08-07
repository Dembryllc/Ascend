import { httpsCallable } from 'firebase/functions'
import { functions } from './config'

export async function subscribeLeadMagnet(email: string): Promise<boolean> {
  const call = httpsCallable<{ email: string }, { subscribed: boolean }>(functions, 'subscribeLeadMagnet')
  const result = await call({ email })
  return result.data.subscribed
}
