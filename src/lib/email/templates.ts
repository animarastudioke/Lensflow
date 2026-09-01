import { formatCurrency } from '@/lib/currencies'
import { APP_CONSTANTS } from '@/lib/constants'

// Shared branded shell + a handful of transactional templates. Kept as plain
// string-building rather than a templating engine — five short emails don't
// warrant one, and this matches the rest of this codebase's "no premature
// abstraction" bias.

export interface StudioBranding {
  name: string
  logoUrl?: string | null
  brandColor?: string | null
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function appUrl(path: string): string {
  return `${APP_CONSTANTS.URL.replace(/\/$/, '')}${path}`
}

function button(url: string, label: string, color: string): string {
  return `<a href="${url}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">${escapeHtml(label)}</a>`
}

function shell(studio: StudioBranding, bodyHtml: string): string {
  const color = studio.brandColor || '#3b82f6'
  const initial = studio.name.charAt(0).toUpperCase()
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;padding:40px 16px;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <div style="text-align:center;margin-bottom:28px;">
      ${studio.logoUrl
        ? `<img src="${escapeHtml(studio.logoUrl)}" alt="${escapeHtml(studio.name)}" style="height:48px;max-width:200px;object-fit:contain;border-radius:8px;" />`
        : `<div style="display:inline-flex;align-items:center;justify-content:center;height:48px;width:48px;border-radius:8px;background:${color};color:#ffffff;font-weight:600;font-size:20px;">${escapeHtml(initial)}</div>`
      }
    </div>
    ${bodyHtml}
    <p style="margin-top:32px;padding-top:20px;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af;text-align:center;">
      Sent by ${escapeHtml(studio.name)} via LensFlow
    </p>
  </div>
</div>`.trim()
}

export interface EmailContent {
  subject: string
  html: string
}

export function invoiceSentEmail(params: {
  studio: StudioBranding
  clientName: string
  invoiceNumber: string
  total: number
  currency: string
  dueDate?: string | null
  shareToken: string
}): EmailContent {
  const color = params.studio.brandColor || '#3b82f6'
  const url = appUrl(`/invoice/${params.shareToken}`)
  const html = shell(params.studio, `
    <h1 style="font-size:20px;color:#111827;margin:0 0 12px;">New invoice from ${escapeHtml(params.studio.name)}</h1>
    <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0 0 8px;">Hi ${escapeHtml(params.clientName)},</p>
    <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0 0 20px;">
      You have a new invoice <strong>${escapeHtml(params.invoiceNumber)}</strong> for <strong>${formatCurrency(params.total, params.currency)}</strong>${params.dueDate ? ` due ${escapeHtml(params.dueDate)}` : ''}.
    </p>
    <div style="text-align:center;">${button(url, 'View & pay invoice', color)}</div>
  `)
  return { subject: `Invoice ${params.invoiceNumber} from ${params.studio.name}`, html }
}

export function quoteSentEmail(params: {
  studio: StudioBranding
  clientName: string
  quoteNumber: string
  total: number
  currency: string
  shareToken: string
}): EmailContent {
  const color = params.studio.brandColor || '#3b82f6'
  const url = appUrl(`/quote/${params.shareToken}`)
  const html = shell(params.studio, `
    <h1 style="font-size:20px;color:#111827;margin:0 0 12px;">New quote from ${escapeHtml(params.studio.name)}</h1>
    <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0 0 8px;">Hi ${escapeHtml(params.clientName)},</p>
    <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0 0 20px;">
      You have a new quote <strong>${escapeHtml(params.quoteNumber)}</strong> for <strong>${formatCurrency(params.total, params.currency)}</strong>. Take a look and let us know what you think.
    </p>
    <div style="text-align:center;">${button(url, 'View quote', color)}</div>
  `)
  return { subject: `Quote ${params.quoteNumber} from ${params.studio.name}`, html }
}

export function paymentReceiptEmail(params: {
  studio: StudioBranding
  clientName: string
  referenceNumber: string
  amountKes: number
  receiptNumber?: string | null
  documentUrl?: string | null
}): EmailContent {
  const color = params.studio.brandColor || '#3b82f6'
  const html = shell(params.studio, `
    <h1 style="font-size:20px;color:#111827;margin:0 0 12px;">Payment received</h1>
    <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0 0 8px;">Hi ${escapeHtml(params.clientName)},</p>
    <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0 0 20px;">
      Thanks — we've received your payment of <strong>${formatCurrency(params.amountKes, 'KES')}</strong> for ${escapeHtml(params.referenceNumber)} via M-Pesa${params.receiptNumber ? ` (receipt ${escapeHtml(params.receiptNumber)})` : ''}.
    </p>
    ${params.documentUrl ? `<div style="text-align:center;">${button(params.documentUrl, 'View receipt', color)}</div>` : ''}
  `)
  return { subject: `Payment received — ${params.referenceNumber}`, html }
}

export function galleryPublishedEmail(params: {
  studio: StudioBranding
  clientName: string
  galleryName: string
  shareToken: string
}): EmailContent {
  const color = params.studio.brandColor || '#3b82f6'
  const url = appUrl(`/g/${params.shareToken}`)
  const html = shell(params.studio, `
    <h1 style="font-size:20px;color:#111827;margin:0 0 12px;">Your gallery is ready</h1>
    <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0 0 8px;">Hi ${escapeHtml(params.clientName)},</p>
    <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0 0 20px;">
      <strong>${escapeHtml(params.galleryName)}</strong> is ready to view.
    </p>
    <div style="text-align:center;">${button(url, 'View gallery', color)}</div>
  `)
  return { subject: `${params.galleryName} is ready to view`, html }
}

export function bookingConfirmationEmail(params: {
  studio: StudioBranding
  clientName: string
  sessionName: string
  sessionDate?: string | null
  location?: string | null
}): EmailContent {
  const html = shell(params.studio, `
    <h1 style="font-size:20px;color:#111827;margin:0 0 12px;">Booking received</h1>
    <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0 0 8px;">Hi ${escapeHtml(params.clientName)},</p>
    <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0 0 12px;">
      Your booking with ${escapeHtml(params.studio.name)} for <strong>${escapeHtml(params.sessionName)}</strong> has been recorded.
    </p>
    <table style="font-size:14px;color:#4b5563;width:100%;border-collapse:collapse;">
      ${params.sessionDate ? `<tr><td style="padding:4px 0;color:#9ca3af;">Date</td><td style="padding:4px 0;text-align:right;">${escapeHtml(params.sessionDate)}</td></tr>` : ''}
      ${params.location ? `<tr><td style="padding:4px 0;color:#9ca3af;">Location</td><td style="padding:4px 0;text-align:right;">${escapeHtml(params.location)}</td></tr>` : ''}
    </table>
  `)
  return { subject: `Booking received — ${params.sessionName}`, html }
}
