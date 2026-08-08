import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import { syncContact, addToList } from './activecampaign'
import { MAIL_SECRETS, freeGuideEmailHtml, mailConfigured, sendEmail } from './mail'

// List 15 ("Easy Annotate - Free Guide Leads") is deliberately separate from
// list 12 ("Easy Annotate - Teachers", see activecampaign.ts) — list 12 is
// reserved for real trial signups and already has a live Cloud Function
// (syncTeacherSignupToActiveCampaign) writing to it. Mixing lead-magnet
// downloads into that list would pollute whatever nurture sequence eventually
// gets built there.
//
// AC no longer sends the delivery email. "Automation for Lead Magnet - Easy
// Annotate" (27) reported every contact complete while campaign 198 sat at
// send_amt=0 — see mail.ts for why. This function now sends the guide itself
// via Mailgun and keeps AC purely as the CRM record. Automation 27 must stay
// disabled, or a subscriber who does get through gets the email twice.
const LEAD_MAGNET_LIST_ID = '15'

export const subscribeLeadMagnet = onCall(
  { secrets: ['ACTIVECAMPAIGN_API_URL', 'ACTIVECAMPAIGN_API_KEY', ...MAIL_SECRETS] },
  async (request) => {
    const email = (request.data?.email ?? '').trim().toLowerCase()
    if (!email || !email.includes('@')) {
      throw new HttpsError('invalid-argument', 'Valid email required')
    }

    // The CRM write happens regardless of mail state — a missing Mailgun key
    // should cost the subscriber their guide, not their place on the list.
    let subscribed = false
    if (mailConfigured()) {
      try {
        await sendEmail({
          to: email,
          subject: "Here's your Free PDF Books & Assignments Guide",
          html: freeGuideEmailHtml(email),
        })
        subscribed = true
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        logger.error(`Lead magnet email failed for ${email}:`, message)
      }
    } else {
      logger.warn(`Mailgun not configured — captured ${email} but did not deliver the guide`)
    }

    // Best-effort: a CRM sync failure must never cost the subscriber their guide.
    try {
      const contact = await syncContact(email, '')
      await addToList(contact.id, LEAD_MAGNET_LIST_ID)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.error(`Lead magnet CRM sync failed for ${email}:`, message)
    }

    return { subscribed }
  },
)
