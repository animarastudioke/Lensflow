import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowRight, type LucideIcon } from 'lucide-react'

interface FeatureUpgradePromptProps {
  studioSlug: string
  icon: LucideIcon
  featureName: string
  description: string
  minPlanName: string
  minPlanPrice: number
}

/**
 * Shown instead of a gated feature's create/setup flow when the studio's
 * plan doesn't include it — the nav item itself always stays visible (see
 * the ADR-style note in sidebar.tsx) so this is the moment a Free-plan
 * studio actually discovers the feature exists and how to unlock it,
 * rather than a broken form or an unhelpful crash.
 */
export function FeatureUpgradePrompt({ studioSlug, icon: Icon, featureName, description, minPlanName, minPlanPrice }: FeatureUpgradePromptProps) {
  return (
    <div className="max-w-lg mx-auto py-16">
      <Card>
        <CardContent className="pt-10 pb-10 px-8 text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-7 w-7 text-primary" strokeWidth={1.5} />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-display-sm font-display font-semibold text-foreground">{featureName} isn&apos;t on your Free plan</h1>
            <p className="text-body text-muted-foreground">{description}</p>
          </div>
          <div className="pt-2">
            <Button asChild size="lg">
              <Link href={`/dashboard/${studioSlug}/settings?tab=billing`}>
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade to {minPlanName} — ${minPlanPrice}/mo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
