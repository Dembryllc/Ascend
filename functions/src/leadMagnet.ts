import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import { syncContact, addToList } from './activecampaign'

// List 15 ("Easy Annotate - Free Guide Leads") is deliberately separate from
// list 12 ("Easy Annotate - Teachers", see activecampaign.ts) — list 12 is
// reserved for real trial signups and already has a live Cloud Function
// (syncTeacherSignupToActiveCampaign) writing to it. Mixing lead-magnet
// downloads into that list would pollute whatever nurture sequence eventually
// gets built there. The "Automation for Lead Magnet - Easy Annotate" in AC
// (trigger: subscribes to list 15) sends the actual delivery email — this
// function only handles the subscribe.
const LEAD_MAGNET_LIST_ID = '15'

export const subscribeLeadMagnet = onCall(
  { secrets: ['ACTIVECAMPAIGN_API_URL', 'ACTIVECAMPAIGN_API_KEY'] },
  async (request) => {
    const email = (request.data?.email ?? '').trim().toLowerCase()
    if (!email || !email.includes('@')) {
      throw new HttpsError('invalid-argument', 'Valid email required')
    }
    try {
      const contact = await syncContact(email, '')
      await addToList(contact.id, LEAD_MAGNET_LIST_ID)
      return { subscribed: true }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.error(`Lead magnet subscribe failed for ${email}:`, message)
      return { subscribed: false }
    }
  },
)
