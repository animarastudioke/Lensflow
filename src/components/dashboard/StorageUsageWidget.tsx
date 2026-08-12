import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatBytes, cn } from '@/lib/utils'
import type { Plan, StorageUsage } from '@/lib/entitlements'

const STATUS_STYLES: Record<StorageUsage['status'], { bar: string; text: string }> = {
  ok: { bar: 'bg-primary', text: 'text-muted-foreground' },
  warning: { bar: 'bg-warning', text: 'text-warning' },
  critical: { bar: 'bg-destructive', text: 'text-destructive' },
  over_quota: { bar: 'bg-destructive', text: 'text-destructive' },
}

const STATUS_MESSAGES: Record<StorageUsage['status'], string> = {
  ok: '',
  warning: 'Approaching your storage limit.',
  critical: 'Almost out of storage — uploads will be blocked soon.',
  over_quota: 'Over your storage limit. New uploads are blocked until you upgrade or free up space. Your existing photos are safe.',
}

export function StorageUsageWidget({
  plan,
  storage,
  studioSlug,
}: {
  plan: Plan
  storage: StorageUsage
  studioSlug: string
}) {
  const styles = STATUS_STYLES[storage.status]
  const message = STATUS_MESSAGES[storage.status]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Storage</CardTitle>
        <span className="label-caption">{plan.name} plan</span>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-mono tabular-nums text-foreground">
            {formatBytes(storage.usedBytes)} / {formatBytes(storage.limitBytes)}
          </span>
          <span className={cn('font-mono tabular-nums', styles.text)}>
            {storage.percentUsed.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all', styles.bar)}
            style={{ width: `${Math.min(100, storage.percentUsed)}%` }}
          />
        </div>
        {message && (
          <p className={cn('flex items-start gap-1.5 text-xs', styles.text)}>
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            {message}
          </p>
        )}
        {storage.status !== 'ok' && (
          <Link
            href={`/dashboard/${studioSlug}/settings`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Upgrade plan
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
