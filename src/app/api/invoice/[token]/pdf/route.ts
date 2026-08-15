import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { getInvoiceByToken } from '@/lib/actions/invoices'
import { BillingDocumentPdf } from '@/lib/pdf/BillingDocumentPdf'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const invoice = await getInvoiceByToken(token)

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const balanceDue = Math.max(invoice.total - invoice.amount_paid, 0)

  const buffer = await renderToBuffer(
    BillingDocumentPdf({
      kind: 'Invoice',
      documentNumber: invoice.invoice_number,
      statusLabel: invoice.status,
      issueDate: invoice.issue_date,
      secondaryDateLabel: 'Due',
      secondaryDate: invoice.due_date,
      currency: invoice.currency,
      items: invoice.items.map((i) => ({ id: i.id, description: i.description, quantity: i.quantity, unitPrice: i.unit_price, total: i.total })),
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      discount: invoice.discount,
      total: invoice.total,
      amountPaid: invoice.amount_paid,
      balanceDue,
      notes: invoice.notes,
      client: invoice.client,
      studio: {
        name: invoice.studio.name,
        logoUrl: invoice.studio.logo_url,
        brandColor: invoice.studio.brand_color,
        email: invoice.studio.email,
        phone: invoice.studio.phone,
        address: invoice.studio.address,
      },
    })
  )

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
    },
  })
}
