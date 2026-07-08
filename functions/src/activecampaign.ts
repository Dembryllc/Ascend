import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { logger } from 'firebase-functions'

// Marketing sync for new teacher trial signups.
//
// Two distinct AC concepts, easy to conflate — kept separate on purpose:
// 1. List 12 ("Easy Annotate - Teachers") is the actual trigger for the live
//    3-email trial-nurture automation (messages 247/249/248). Every teacher
//    signup must land on this list or the nurture sequence never fires.
// 2. Tag 16 ("ea-social-signup") is narrower — its AC description is
//    "trial signup attributed to the LinkedIn/Instagram campaign." It's an
//    attribution label for reporting, not the automation trigger. Only apply
//    it when signupSource indicates the social campaign actually drove the
//    signup (see src/utils/attribution.ts on the client).
const TEACHER_LIST_ID = '12'
const SOCIAL_SIGNUP_TAG_ID = '16'
const SOCIAL_SOURCES = new Set(['linkedin', 'instagram'])

interface AcContact {
  id: string
}

async function acRequest<T>(path: string, init: RequestInit): Promise<T> {
  const baseUrl = process.env.ACTIVECAMPAIGN_API_URL
  const apiKey = process.env.ACTIVECAMPAIGN_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('ActiveCampaign secrets not configured (ACTIVECAMPAIGN_API_URL / ACTIVECAMPAIGN_API_KEY)')
  }
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Api-Token': apiKey,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`ActiveCampaign ${path} failed: ${res.status} ${body}`)
  }
  return res.json() as Promise<T>
}

async function syncContact(email: string, displayName: string): Promise<AcContact> {
  const { contact } = await acRequest<{ contact: AcContact }>('/api/3/contact/sync', {
    method: 'POST',
    body: JSON.stringify({ contact: { email, firstName: displayName } }),
  })
  return contact
}

async function addToList(contactId: string, listId: string): Promise<void> {
  await acRequest('/api/3/contactLists', {
    method: 'POST',
    body: JSON.stringify({ contactList: { list: listId, contact: contactId, status: 1 } }),
  })
}

async function applyTag(contactId: string, tagId: string): Promise<void> {
  await acRequest('/api/3/contactTags', {
    method: 'POST',
    body: JSON.stringify({ contactTag: { contact: contactId, tag: tagId } }),
  })
}

export const syncTeacherSignupToActiveCampaign = onDocumentCreated(
  { document: 'users/{uid}', secrets: ['ACTIVECAMPAIGN_API_URL', 'ACTIVECAMPAIGN_API_KEY'] },
  async (event) => {
    const data = event.data?.data()
    if (!data) return

    // List 12 is teacher-only per the documented automation; individual-role
    // signups have their own (not-yet-built) sequence — skip them here rather
    // than guess at a list they don't belong to.
    if (data.role !== 'teacher') return
    if (!data.email) {
      logger.warn(`New teacher ${event.params.uid} has no email — skipping AC sync`)
      return
    }

    try {
      const contact = await syncContact(data.email, data.displayName ?? '')
      await addToList(contact.id, TEACHER_LIST_ID)

      const source = typeof data.signupSource === 'string' ? data.signupSource.toLowerCase() : null
      if (source && SOCIAL_SOURCES.has(source)) {
        await applyTag(contact.id, SOCIAL_SIGNUP_TAG_ID)
      }

      logger.info(`Synced teacher ${event.params.uid} to ActiveCampaign (list ${TEACHER_LIST_ID}${source ? `, tagged ${source}` : ''})`)
    } catch (err: unknown) {
      // Non-critical: never let a marketing sync failure look like an account creation error.
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.error(`ActiveCampaign sync failed for teacher ${event.params.uid}:`, message)
    }
  },
)
