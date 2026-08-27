import { Badge } from '@/components/ui/badge'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'

/**
 * The one authoritative status -> semantic-token mapping.
 *
 * Status semantics describe STATE, not entity type: "archived" must mean
 * the same thing (quiet/neutral, not alarming) everywhere it appears,
 * whether the entity is a client, a gallery, a website, or a product.
 * Before this mapping existed, ClientList colored "archived" destructive
 * (red) while every other entity (galleries, websites, products, projects)
 * colored it secondary (neutral gray) -- an accidental inconsistency, not
 * a deliberate product distinction.
 *
 * This is intentionally a lookup by normalized status string, not a
 * component every screen must adopt immediately -- existing local
 * statusConfig maps (ClientList, ProjectList, StoreList, WebsiteList,
 * GalleryList) may keep their own label text and entity-specific status
 * sets; migrate them to consume this map's variant, or to render
 * <StatusBadge> directly, incrementally.
 */
export const STATUS_VARIANT_MAP: Record<string, BadgeVariant> = {
  // Positive / completed / live states
  active: 'success',
  published: 'success',
  paid: 'success',
  completed: 'success',
  delivered: 'success',
  confirmed: 'success',

  // Needs-attention states
  pending: 'warning',
  overdue: 'warning',
  processing: 'warning',
  editing: 'warning',
  review: 'warning',
  'in-progress': 'warning',
  in_progress: 'warning',
  invited: 'warning',
  // The client didn't attend -- distinct from cancelled, matches the
  // 'warning' tone BookingList already used before adopting this map.
  no_show: 'warning',
  // An invoice partially paid still needs action, same tone as overdue --
  // matches InvoiceList's pre-existing local mapping.
  partial: 'warning',

  // Informational / in-progress-but-not-urgent states
  draft: 'secondary',
  scheduled: 'info',
  planning: 'info',
  lead: 'info',
  private: 'info',
  inquiry: 'info',
  // Matches InvoiceList's pre-existing local mapping (sent: info).
  sent: 'info',
  viewed: 'outline',

  // Negative / failure / stopped states
  failed: 'destructive',
  cancelled: 'destructive',
  expired: 'destructive',
  suspended: 'destructive',

  // Neutral / inactive / archival states -- quiet, not alarming
  archived: 'secondary',
  inactive: 'secondary',
  refunded: 'secondary',
}

export interface StatusBadgeProps {
  /** Any status string -- matched case-insensitively against the semantic map. */
  status: string
  /** Override display text; defaults to the status string, capitalized. */
  label?: string
  className?: string
}

function defaultLabel(status: string): string {
  return status
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const variant = STATUS_VARIANT_MAP[status.toLowerCase()] ?? 'secondary'
  return (
    <Badge variant={variant} className={className}>
      {label ?? defaultLabel(status)}
    </Badge>
  )
}
