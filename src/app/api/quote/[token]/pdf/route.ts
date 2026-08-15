import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { getQuoteByToken } from '@/lib/actions/quotes'
import { BillingDocumentPdf } from '@/lib/pdf/BillingDocumentPdf'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const quote = await getQuoteByToken(token)

  if (!quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  const buffer = await renderToBuffer(
    BillingDocumentPdf({
      kind: 'Quote',
      documentNumber: quote.quote_number,
      title: quote.title,
      statusLabel: quote.status,
      issueDate: quote.issue_date,
      secondaryDateLabel: 'Expires',
      secondaryDate: quote.expires_at,
      currency: quote.currency,
      items: quote.items.map((i) => ({ id: i.id, description: i.description, quantity: i.quantity, unitPrice: i.unit_price, total: i.total })),
      subtotal: quote.subtotal,
      tax: quote.tax,
      discount: quote.discount,
      total: quote.total,
      notes: quote.notes,
      client: quote.client,
      studio: {
        name: quote.studio.name,
        logoUrl: quote.studio.logo_url,
        brandColor: quote.studio.brand_color,
        email: quote.studio.email,
        phone: quote.studio.phone,
        address: quote.studio.address,
      },
    })
  )

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${quote.quote_number}.pdf"`,
    },
  })
}
