'use client'

import type { ComponentType } from 'react'
import Link from 'next/link'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FEATURE_TABS } from '@/lib/constants/homepage'
import { ScrollReveal } from './lib/scroll-reveal'
import { BrowserFrame } from './lib/browser-frame'
import { GalleriesDemo } from './feature-demos/galleries-demo'
import { BookingDemo } from './feature-demos/booking-demo'
import { CrmDemo } from './feature-demos/crm-demo'
import { PaymentsDemo } from './feature-demos/payments-demo'
import { StoreDemo } from './feature-demos/store-demo'
import { WebsiteDemo } from './feature-demos/website-demo'

const DEMO_COMPONENTS: Record<string, ComponentType> = {
  galleries: GalleriesDemo,
  booking: BookingDemo,
  crm: CrmDemo,
  payments: PaymentsDemo,
  store: StoreDemo,
  websites: WebsiteDemo,
}

export function FeatureTabs() {
  return (
    <section className="page-section bg-background" id="platform">
      <div className="container-wide">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="label-caption text-primary">The platform</span>
            <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              One workspace. Every part of your business.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From the first inquiry to final delivery, LensFlow keeps your entire client journey
              connected.
            </p>
          </div>
        </ScrollReveal>

        <TabsPrimitive.Root defaultValue="galleries" className="mt-14">
          <TabsPrimitive.List className="scrollbar-hide -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:mb-0 lg:hidden">
            {FEATURE_TABS.map((tab) => (
              <TabsPrimitive.Trigger
                key={tab.id}
                value={tab.id}
                className="shrink-0 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {tab.label}
              </TabsPrimitive.Trigger>
            ))}
          </TabsPrimitive.List>

          <div className="grid gap-10 lg:grid-cols-[280px_1fr] lg:gap-12">
            <TabsPrimitive.List className="hidden flex-col gap-1 lg:flex">
              {FEATURE_TABS.map((tab) => (
                <TabsPrimitive.Trigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    'group flex items-start gap-3 rounded-lg border border-transparent px-4 py-3.5 text-left transition-colors',
                    'data-[state=active]:border-border data-[state=active]:bg-card',
                    'hover:bg-accent/50'
                  )}
                >
                  <span className="font-mono text-xs text-muted-foreground/60 group-data-[state=active]:text-primary">
                    {tab.number}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-foreground">{tab.label}</span>
                  </span>
                </TabsPrimitive.Trigger>
              ))}
            </TabsPrimitive.List>

            <div>
              {FEATURE_TABS.map((tab) => {
                const Demo = DEMO_COMPONENTS[tab.id]!
                return (
                  <TabsPrimitive.Content key={tab.id} value={tab.id} className="focus-visible:outline-none">
                    <div className="animate-in">
                      <div className="mb-6 max-w-xl">
                        <h3 className="text-balance font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                          {tab.heading}
                        </h3>
                        <p className="mt-3 text-muted-foreground">{tab.copy}</p>
                        <Link
                          href={tab.cta.href}
                          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary link-underline"
                        >
                          {tab.cta.label}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <BrowserFrame url={tab.id === 'websites' ? 'amarawren.com' : 'app.lensflow.io'}>
                        <div className="min-h-[380px] sm:min-h-[420px]">
                          <Demo />
                        </div>
                      </BrowserFrame>
                    </div>
                  </TabsPrimitive.Content>
                )
              })}
            </div>
          </div>
        </TabsPrimitive.Root>
      </div>
    </section>
  )
}
