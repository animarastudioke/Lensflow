'use client'

import type { ComponentType } from 'react'
import Link from 'next/link'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FEATURE_TABS } from '@/lib/constants/homepage'
import { BrowserFrame } from './lib/browser-frame'
import { SectionHead } from './lib/section-head'
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
    <section className="page-section" id="platform">
      <div className="container-wide">
        <SectionHead
          title="One workspace. Every part of your business."
          caption="The platform"
          intro="From the first inquiry to final delivery, LensFlow keeps your entire client journey connected."
        />

        <TabsPrimitive.Root defaultValue="galleries" className="mt-10">
          <TabsPrimitive.List className="scrollbar-hide -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:mb-0 lg:hidden">
            {FEATURE_TABS.map((tab) => (
              <TabsPrimitive.Trigger
                key={tab.id}
                value={tab.id}
                className="focus-ring shrink-0 rounded-md border border-input px-4 py-2 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {tab.label}
              </TabsPrimitive.Trigger>
            ))}
          </TabsPrimitive.List>

          <div className="grid gap-10 lg:grid-cols-[280px_1fr] lg:gap-12">
            <TabsPrimitive.List className="hidden flex-col lg:flex">
              {FEATURE_TABS.map((tab) => (
                <TabsPrimitive.Trigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    'group focus-ring flex items-start gap-3 border-b border-l-2 border-b-border border-l-transparent px-4 py-4 text-left transition-colors',
                    'data-[state=active]:border-l-primary data-[state=active]:bg-card',
                    'hover:bg-accent/50'
                  )}
                >
                  <span className="pt-1 font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground group-data-[state=active]:text-primary">
                    {tab.number}
                  </span>
                  <span>
                    <span className="block font-display text-heading-lg text-foreground">{tab.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{tab.heading}</span>
                  </span>
                </TabsPrimitive.Trigger>
              ))}
            </TabsPrimitive.List>

            <div>
              {FEATURE_TABS.map((tab, index) => {
                const Demo = DEMO_COMPONENTS[tab.id]!
                return (
                  <TabsPrimitive.Content key={tab.id} value={tab.id} className="focus-visible:outline-none">
                    <div className="animate-in">
                      <div className="mb-6 max-w-xl">
                        <h3 className="text-balance font-display text-display-sm font-medium text-foreground">
                          {tab.heading}
                        </h3>
                        <p className="mt-3 text-muted-foreground">{tab.copy}</p>
                        <Link
                          href={tab.cta.href}
                          className="focus-ring mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary link-underline"
                        >
                          {tab.cta.label}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>

                      <figure>
                        <div className="rounded-md border border-border bg-card p-3 sm:p-4">
                          <BrowserFrame url={tab.id === 'websites' ? 'amarawren.com' : 'app.lensflow.co.ke'}>
                            <div className="min-h-[380px] sm:min-h-[420px]">
                              <Demo />
                            </div>
                          </BrowserFrame>
                        </div>
                        <figcaption className="label-caption mt-3.5 flex flex-wrap justify-between gap-x-4 gap-y-1">
                          <span>
                            Fig. {index + 2} — {tab.label}
                          </span>
                          <span>Sample data</span>
                        </figcaption>
                      </figure>
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
