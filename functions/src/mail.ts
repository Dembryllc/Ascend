import { logger } from 'firebase-functions'

// Mailgun transactional send, over the plain HTTP API — no SDK, no new dependency.
//
// This exists because ActiveCampaign cannot be trusted to deliver automation
// email on this account. Campaigns created through the AC v3 API come out with
// can_skip_approval=0 and never clear approval, yet the automation engine marks
// its send block complete the moment it queues them. Automation 27 reported
// 100% completion for every contact while sending exactly zero emails. AC is
// CRM-only now; delivery happens here.
//
// Required secrets:
//   MAILGUN_API_KEY  — private API key ("key-…") from the Mailgun dashboard
//   MAILGUN_DOMAIN   — verified sending domain, e.g. mg.easy-annotate.com
//   MAILGUN_FROM     — From header; its domain MUST be easy-annotate.com or a
//                      subdomain, or DMARC fails. A gmail.com From will bounce.
export const MAIL_SECRETS = ['MAILGUN_API_KEY', 'MAILGUN_DOMAIN', 'MAILGUN_FROM'] as const

const REPLY_TO = 'dembryllc@gmail.com'
const APP_URL = 'https://easy-annotate.com'

export function mailConfigured(): boolean {
  return Boolean(
    process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN && process.env.MAILGUN_FROM,
  )
}

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN
  const from = process.env.MAILGUN_FROM
  if (!apiKey || !domain || !from) {
    throw new Error('Mailgun not configured (MAILGUN_API_KEY / MAILGUN_DOMAIN / MAILGUN_FROM)')
  }

  const body = new URLSearchParams({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    'h:Reply-To': REPLY_TO,
  })

  const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Mailgun send failed: ${res.status} ${detail.slice(0, 200)}`)
  }
  logger.info(`Mailgun accepted message to ${opts.to}`)
}

function emailBase(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Easy Annotate</title></head>
<body style="margin:0;padding:0;background:#F8F9FC;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FC;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.07);">
<tr><td style="background:#1A1D23;padding:24px 32px;">
<span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Easy<span style="color:#4A90D9;">Annotate</span></span>
</td></tr>
<tr><td style="padding:32px;">
${bodyContent}
</td></tr>
<tr><td style="background:#F3F4F6;padding:16px 32px;text-align:center;">
<p style="margin:0;font-size:12px;color:#9CA3AF;">
Easy Annotate &middot; Built for K-12 classrooms &middot;
<a href="${APP_URL}" style="color:#4A90D9;text-decoration:none;">Open the app</a>
</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

// Copy mirrors AC message 261 ("Here's your Free PDF Books & Assignments Guide"),
// which was written and approved but never actually delivered to anyone.
export function freeGuideEmailHtml(email: string): string {
  return emailBase(`
<h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1A1D23;">Your Free PDF Books &amp; Assignments Guide 📚</h1>
<p style="margin:0 0 20px;font-size:15px;color:#4B5563;line-height:1.6;">
8 legitimate, no-cost sources for classroom texts — plus 5 public-domain readings already
paired with a writing prompt, ready to drop straight into Easy Annotate.
</p>
<a href="${APP_URL}/resources/free-pdf-books-resource-guide.pdf" style="display:inline-block;background:#1A1D23;color:#ffffff;font-size:15px;font-weight:700;padding:13px 28px;border-radius:8px;text-decoration:none;">Download Your Guide &darr;</a>
<h2 style="margin:32px 0 8px;font-size:18px;font-weight:800;color:#1A1D23;">Got the text. Now make it interactive.</h2>
<p style="margin:0 0 20px;font-size:15px;color:#4B5563;line-height:1.6;">
Easy Annotate lets students highlight, react with emoji, record notes, and write directly on any
PDF — while you see every step of the reading process. Works with every text in this guide.
</p>
<a href="${APP_URL}" style="display:inline-block;background:#4A90D9;color:#ffffff;font-size:15px;font-weight:700;padding:13px 28px;border-radius:8px;text-decoration:none;">Start for Free, No Credit Card &rarr;</a>
<p style="margin:24px 0 0;font-size:13px;color:#9CA3AF;">
You're receiving this because you requested the guide at easy-annotate.com with ${email}.
<a href="mailto:${REPLY_TO}?subject=Unsubscribe" style="color:#9CA3AF;">Unsubscribe</a>
</p>
`)
}
