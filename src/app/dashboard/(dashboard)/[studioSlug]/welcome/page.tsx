import { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getStudioForSettings } from '@/lib/actions/studios'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LogoMark } from '@/components/marketing/home/lib/logo'
import { Images, Users, CalendarDays, Settings, ArrowRight } from 'lucide-react'

interface WelcomePageProps {
  params: Promise<{ studioSlug: string }>
}

export async function generateMetadata({
  params,
}: WelcomePageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Welcome - ${studioSlug}`,
    description: 'Your studio is ready',
  }
}

const NEXT_ACTIONS = [
  {
    icon: Images,
    title: 'Create your first gallery',
    description: 'Deliver photos to a client with proofing, favorites, and downloads.',
    hrefSuffix: '/galleries/new',
  },
  {
    icon: Users,
    title: 'Add your first client',
    description: 'Keep contact details, bookings, and invoices in one place.',
    hrefSuffix: '/clients/new',
  },
  {
    icon: CalendarDays,
    title: 'Create a booking',
    description: 'Schedule a session and track its status from inquiry to delivery.',
    hrefSuffix: '/bookings/new',
  },
  {
    icon: Settings,
    title: 'Complete your studio profile',
    description: 'Add your logo, brand color, and contact details.',
    hrefSuffix: '/settings',
  },
]

export default async function WelcomePage({ params }: WelcomePageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const studio = await getStudioForSettings(studioSlug)
  if (!studio) {
    notFound()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <LogoMark className="h-7 w-7 text-primary" />
          </div>
        </div>
        <h1 className="font-display text-display-md font-semibold text-foreground">
          {studio.name} is ready
        </h1>
        <p className="text-body text-muted-foreground max-w-md mx-auto">
          Here&apos;s where most studios start. Pick one, or head straight to your dashboard.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {NEXT_ACTIONS.map((action) => (
          <Link key={action.title} href={`/dashboard/${studioSlug}${action.hrefSuffix}`}>
            <Card className="card-hover h-full">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <action.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{action.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{action.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex justify-center">
        <Button asChild size="lg">
          <Link href={`/dashboard/${studioSlug}`}>
            Go to dashboard
            <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
