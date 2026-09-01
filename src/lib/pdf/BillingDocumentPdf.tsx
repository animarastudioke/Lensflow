import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { formatCurrency } from '@/lib/currencies'
import { format } from 'date-fns'
import type { BillingDocumentProps } from '@/components/billing/BillingDocumentView'

// A react-pdf equivalent of BillingDocumentView — react-pdf renders to its
// own primitive tree (View/Text/Image), not real DOM/HTML, so the two can't
// share JSX. Kept visually in step with the on-screen version by hand
// rather than by shared code, and both are simple enough that drift is easy
// to catch on review if the layout ever changes.

// react-pdf has no CSS-variable/HSL support, so these are the same
// --destructive/--success tokens (light-mode values, since a PDF page is
// always printed on white) from src/app/globals.css, converted to hex by
// hand rather than picked arbitrarily.
const DESTRUCTIVE_HEX = '#cd3b1d'
const SUCCESS_HEX = '#246042'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#111827' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  logo: { width: 48, height: 48, objectFit: 'contain', marginRight: 12 },
  logoFallback: {
    width: 48,
    height: 48,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  logoFallbackText: { color: '#ffffff', fontSize: 20, fontWeight: 700 },
  studioBlock: { flexDirection: 'row' },
  studioName: { fontSize: 13, fontWeight: 700, marginBottom: 2 },
  muted: { color: '#6b7280' },
  headerRight: { alignItems: 'flex-end' },
  kind: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2, fontWeight: 700 },
  docNumber: { fontSize: 13, fontFamily: 'Courier', marginBottom: 2 },
  statusPill: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontSize: 8,
    textTransform: 'capitalize',
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  balanceDueBox: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 14,
    marginBottom: 20,
  },
  balanceDueLabel: { fontSize: 8, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 4 },
  balanceDueAmount: { fontSize: 20, fontFamily: 'Courier', fontWeight: 700 },
  balanceDueMeta: { marginTop: 4, fontSize: 9 },
  sectionLabel: { fontSize: 8, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 4 },
  table: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8 },
  tableHeaderRow: { flexDirection: 'row', marginBottom: 6 },
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingVertical: 6 },
  colDescription: { flex: 3 },
  colQty: { flex: 1, textAlign: 'right' },
  colRate: { flex: 1.3, textAlign: 'right' },
  colAmount: { flex: 1.3, textAlign: 'right' },
  headerCellText: { fontSize: 8, textTransform: 'uppercase', color: '#6b7280' },
  totals: { alignSelf: 'flex-end', width: 220, marginTop: 12 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalsFinal: { borderTopWidth: 1, borderTopColor: '#111827', paddingTop: 4, marginTop: 2, fontWeight: 700 },
  notes: { marginTop: 24, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12 },
})

export function BillingDocumentPdf(doc: BillingDocumentProps) {
  const accent = doc.studio.brandColor || '#3B82F6'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.studioBlock}>
            {doc.studio.logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image (PDF output, not DOM) has no alt prop
              <Image src={doc.studio.logoUrl} style={styles.logo} />
            ) : (
              <View style={[styles.logoFallback, { backgroundColor: accent }]}>
                <Text style={styles.logoFallbackText}>{doc.studio.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View>
              <Text style={styles.studioName}>{doc.studio.name}</Text>
              {doc.studio.email && <Text style={styles.muted}>{doc.studio.email}</Text>}
              {doc.studio.phone && <Text style={styles.muted}>{doc.studio.phone}</Text>}
              {doc.studio.address && <Text style={styles.muted}>{doc.studio.address}</Text>}
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.kind, { color: accent }]}>{doc.kind}</Text>
            <Text style={styles.docNumber}>{doc.documentNumber}</Text>
            {doc.title && <Text style={styles.muted}>{doc.title}</Text>}
            <Text style={styles.statusPill}>{doc.statusLabel}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.sectionLabel}>Billed to</Text>
            {doc.client ? (
              <>
                <Text>{doc.client.name}</Text>
                <Text style={styles.muted}>{doc.client.email}</Text>
                {doc.client.phone && <Text style={styles.muted}>{doc.client.phone}</Text>}
              </>
            ) : (
              <Text style={styles.muted}>No client attached</Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.muted}>Issued {format(new Date(doc.issueDate), 'MMM d, yyyy')}</Text>
            {doc.secondaryDate && (
              <Text style={styles.muted}>
                {doc.secondaryDateLabel} {format(new Date(doc.secondaryDate), 'MMM d, yyyy')}
              </Text>
            )}
          </View>
        </View>

        {doc.balanceDue !== undefined && (
          <View
            style={[
              styles.balanceDueBox,
              { borderColor: doc.balanceDue > 0 ? DESTRUCTIVE_HEX : SUCCESS_HEX },
            ]}
          >
            <Text style={styles.balanceDueLabel}>Balance due</Text>
            <Text style={[styles.balanceDueAmount, { color: doc.balanceDue > 0 ? DESTRUCTIVE_HEX : SUCCESS_HEX }]}>
              {formatCurrency(doc.balanceDue, doc.currency)}
            </Text>
            {doc.balanceDue > 0 && doc.secondaryDate ? (
              <Text style={[styles.balanceDueMeta, styles.muted]}>
                {doc.secondaryDateLabel} {format(new Date(doc.secondaryDate), 'MMM d, yyyy')}
              </Text>
            ) : doc.balanceDue === 0 ? (
              <Text style={[styles.balanceDueMeta, { color: SUCCESS_HEX }]}>Paid in full</Text>
            ) : null}
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colDescription, styles.headerCellText]}>Description</Text>
            <Text style={[styles.colQty, styles.headerCellText]}>Qty</Text>
            <Text style={[styles.colRate, styles.headerCellText]}>Rate</Text>
            <Text style={[styles.colAmount, styles.headerCellText]}>Amount</Text>
          </View>
          {doc.items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colRate}>{formatCurrency(item.unitPrice, doc.currency)}</Text>
              <Text style={styles.colAmount}>{formatCurrency(item.total, doc.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text style={styles.muted}>Subtotal</Text>
            <Text>{formatCurrency(doc.subtotal, doc.currency)}</Text>
          </View>
          {doc.tax > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.muted}>Tax</Text>
              <Text>{formatCurrency(doc.tax, doc.currency)}</Text>
            </View>
          )}
          {doc.discount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.muted}>Discount</Text>
              <Text>-{formatCurrency(doc.discount, doc.currency)}</Text>
            </View>
          )}
          <View style={[styles.totalsRow, styles.totalsFinal]}>
            <Text>Total</Text>
            <Text>{formatCurrency(doc.total, doc.currency)}</Text>
          </View>
          {doc.amountPaid !== undefined && doc.amountPaid > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.muted}>Paid</Text>
              <Text>{formatCurrency(doc.amountPaid, doc.currency)}</Text>
            </View>
          )}
        </View>

        {doc.notes && (
          <View style={styles.notes}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.muted}>{doc.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}
