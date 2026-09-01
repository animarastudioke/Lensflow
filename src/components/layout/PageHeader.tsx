import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export interface PageHeaderBreadcrumb {
  label: string
  href?: string
}

export interface PageHeaderProps {
  title: string
  description?: string
  eyebrow?: string
  breadcrumbs?: PageHeaderBreadcrumb[]
  actions?: React.ReactNode
  backHref?: string
  className?: string
}

/**
 * The one authoritative page-title pattern for authenticated dashboard
 * screens. Every dashboard page should render this instead of hand-rolling
 * its own h1 -- previously every screen picked a different heading size
 * (text-display-md, text-display-sm, text-heading-lg) for the same role.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  breadcrumbs,
  actions,
  backHref,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6 space-y-3 sm:mb-8', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1
              return (
                <React.Fragment key={`${crumb.label}-${index}`}>
                  <BreadcrumbItem
                    className={cn(!isLast && index < breadcrumbs.length - 2 && 'hidden sm:inline-flex')}
                  >
                    {isLast || !crumb.href ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && (
                    <BreadcrumbSeparator
                      className={cn(index < breadcrumbs.length - 2 && 'hidden sm:inline-flex')}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          {backHref && (
            <Button variant="ghost" size="sm" className="-ml-2 mb-1 h-8 px-2 text-muted-foreground" asChild>
              <Link href={backHref}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Link>
            </Button>
          )}
          {eyebrow && <p className="label-caption text-primary">{eyebrow}</p>}
          <h1 className="text-display-sm font-display font-semibold text-foreground">{title}</h1>
          {description && <p className="text-body text-muted-foreground">{description}</p>}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">{actions}</div>
        )}
      </div>
    </div>
  )
}
