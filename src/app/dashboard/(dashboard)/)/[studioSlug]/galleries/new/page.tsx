'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ArrowLeft, Image as ImageIcon, Calendar, Users, Building2, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

const gallerySchema = z.object({
  name: z.string().min(1, 'Gallery name is required').max(100),
  description: z.string().max(1000).optional(),
  type: z.enum(['wedding', 'portrait', 'commercial', 'event', 'other']),
  shootDate: z.string().optional(),
  clientId: z.string().optional(),
  status: z.enum(['draft', 'published', 'private']),
  passwordProtected: z.boolean().default(false),
  password: z.string().optional(),
  allowDownload: z.boolean().default(true),
  allowComments: z.boolean().default(true),
  allowFavorites: z.boolean().default(true),
  watermarkEnabled: z.boolean().default(false),
  expiryDays: z.number().min(1).max(365).optional(),
  seoTitle: z.string().max(60).optional(),
  seoDescription: z.string().max(160).optional(),
  customDomain: z.string().optional(),
}).refine(data => !data.passwordProtected || data.password, {
  message: 'Password is required when password protection is enabled',
  path: ['password'],
})

type GalleryForm = z.infer<typeof gallerySchema>

const galleryTypes = [
  { value: 'wedding', label: 'Wedding', icon: <Users className="h-4 w-4" /> },
  { value: 'portrait', label: 'Portrait', icon: <Users className="h-4 w-4" /> },
  { value: 'commercial', label: 'Commercial', icon: <Building2 className="h-4 w-4" /> },
  { value: 'event', label: 'Event', icon: <Calendar className="h-4 w-4" /> },
  { value: 'other', label: 'Other', icon: <MoreHorizontal className="h-4 w-4" /> },
]

export default function NewGalleryPage({ params }: { params: Promise<{ studioSlug: string }> }) {
  const router = useRouter()
  const [studioSlug] = React.useState('')
  const [activeStep, setActiveStep] = React.useState(1)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Initialize studioSlug from params
  React.useEffect(() => {
    params.then(p => {
      // studioSlug would be set from params
    })
  }, [params])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<GalleryForm>({
    resolver: zodResolver(gallerySchema),
    defaultValues: {
      type: 'wedding',
      status: 'draft',
      passwordProtected: false,
      allowDownload: true,
      allowComments: true,
      allowFavorites: true,
      watermarkEnabled: false,
    },
  })

  const watchedStatus = watch('status')
  const watchedPasswordProtected = watch('passwordProtected')
  const watchedType = watch('type')

  const nextStep = () => {
    if (activeStep < 3) setActiveStep(activeStep + 1)
  }

  const prevStep = () => {
    if (activeStep > 1) setActiveStep(activeStep - 1)
  }

  const onSubmit = async (data: GalleryForm) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // In a real app, this would call a server action
      // const gallery = await createGallery({ ...data, studioSlug })

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast.success('Gallery created successfully!')
      router.push(`/dashboard/${studioSlug}/galleries`)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create gallery'
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const steps = [
    { number: 1, title: 'Basic Info', description: 'Name, type, and description' },
    { number: 2, title: 'Settings', description: 'Access, sharing, and permissions' },
    { number: 3, title: 'Advanced', description: 'SEO, watermarking, and expiry' },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress indicator */}
      <div className="hidden md:flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all',
                  activeStep > index
                    ? 'bg-primary text-primary-foreground'
                    : activeStep === index
                    ? 'bg-primary/20 text-primary border-2 border-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {activeStep > index ? <ImageIcon className="h-5 w-5" /> : step.number}
              </div>
              <span className="mt-2 text-xs font-medium text-center max-w-[100px]">
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-1 mx-2 transition-colors',
                  activeStep > index ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Mobile step indicator */}
      <div className="md:hidden flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Step {activeStep} of {steps.length}</span>
        <span className="font-medium">{steps[activeStep - 1].title}</span>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Link
                href={`/dashboard/${studioSlug}/galleries`}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Galleries
              </Link>
              <CardTitle className="text-display-sm">Create Gallery</CardTitle>
              <CardDescription>{steps[activeStep - 1].description}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4 border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Basic Info */}
            {activeStep === 1 && (
              <div className="space-y-6" data-step="1">
                <div className="space-y-2">
                  <Label htmlFor="name">Gallery Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Smith Wedding - June 2024"
                    {...register('name')}
                    disabled={isSubmitting}
                    aria-invalid={errors.name ? 'true' : 'false'}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                  />
                  {errors.name && (
                    <p id="name-error" className="text-sm text-destructive" role="alert">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Gallery Type *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {galleryTypes.map(type => (
                      <label
                        key={type.value}
                        className={cn(
                          'relative cursor-pointer',
                          watchedType === type.value && 'ring-2 ring-primary ring-offset-2'
                        )}
                      >
                        <input
                          type="radio"
                          value={type.value}
                          {...register('type')}
                          className="sr-only"
                          aria-label={type.label}
                        />
                        <div className={cn(
                          'p-4 rounded-lg border-2 transition-all text-center',
                          watchedType === type.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}>
                          <div className="flex justify-center mb-2">{type.icon}</div>
                          <span className="font-medium">{type.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.type && (
                    <p className="text-sm text-destructive" role="alert">{errors.type.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe this gallery for your clients..."
                    {...register('description')}
                    disabled={isSubmitting}
                    rows={3}
                    aria-invalid={errors.description ? 'true' : 'false'}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive" role="alert">{errors.description.message}</p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="shootDate">Shoot Date</Label>
                    <Input
                      id="shootDate"
                      type="date"
                      {...register('shootDate')}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientId">Client (optional)</Label>
                    <Select
                      value={watch('clientId') || ''}
                      onValueChange={value => setValue('clientId', value || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No client assigned</SelectItem>
                        {/* Clients would be fetched from database */}
                        <SelectItem value="1">Sarah & John Smith</SelectItem>
                        <SelectItem value="2">Marcus Johnson</SelectItem>
                        <SelectItem value="3">TechCorp Inc.</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Initial Status *</Label>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { value: 'draft', label: 'Draft', desc: 'Private, only you can see it' },
                      { value: 'published', label: 'Published', desc: 'Live and accessible via link' },
                      { value: 'private', label: 'Private', desc: 'Link only, not listed publicly' },
                    ].map(status => (
                      <label
                        key={status.value}
                        className={cn(
                          'flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all min-w-[140px]',
                          watchedStatus === status.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <input
                          type="radio"
                          value={status.value}
                          {...register('status')}
                          className="sr-only"
                        />
                        <span className="font-medium">{status.label}</span>
                        <span className="text-xs text-muted-foreground text-center mt-1">{status.desc}</span>
                      </label>
                    ))}
                  </div>
                  {errors.status && (
                    <p className="text-sm text-destructive" role="alert">{errors.status.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Settings */}
            {activeStep === 2 && (
              <div className="space-y-6" data-step="2">
                <div className="space-y-4 p-4 rounded-lg border border-border">
                  <h4 className="font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Access Control
                  </h4>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Password Protection</label>
                        <p className="text-sm text-muted-foreground">Require password to view gallery</p>
                      </div>
                      <Switch
                        checked={watchedPasswordProtected}
                        onCheckedChange={checked => setValue('passwordProtected', checked)}
                        disabled={isSubmitting}
                      />
                    </div>

                    {watchedPasswordProtected && (
                      <div className="space-y-2">
                        <Label htmlFor="password">Gallery Password *</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter a secure password"
                          {...register('password')}
                          disabled={isSubmitting}
                          aria-invalid={errors.password ? 'true' : 'false'}
                        />
                        {errors.password && (
                          <p className="text-sm text-destructive" role="alert">{errors.password.message}</p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Allow Downloads</label>
                        <p className="text-sm text-muted-foreground">Clients can download photos</p>
                      </div>
                      <Switch
                        checked={watch('allowDownload')}
                        onCheckedChange={checked => setValue('allowDownload', checked)}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Allow Comments</label>
                        <p className="text-sm text-muted-foreground">Clients can leave comments on photos</p>
                      </div>
                      <Switch
                        checked={watch('allowComments')}
                        onCheckedChange={checked => setValue('allowComments', checked)}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Allow Favorites</label>
                        <p className="text-sm text-muted-foreground">Clients can mark photos as favorites</p>
                      </div>
                      <Switch
                        checked={watch('allowFavorites')}
                        onCheckedChange={checked => setValue('allowFavorites', checked)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4 rounded-lg border border-border">
                  <h4 className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Sharing & Expiry
                  </h4>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiryDays">Link Expiry (days)</Label>
                      <Input
                        id="expiryDays"
                        type="number"
                        min="1"
                        max="365"
                        placeholder="30"
                        {...register('expiryDays', { valueAsNumber: true })}
                        disabled={isSubmitting}
                      />
                      <p className="text-sm text-muted-foreground">
                        Leave empty for no expiry. Gallery links will expire after this many days.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Advanced */}
            {activeStep === 3 && (
              <div className="space-y-6" data-step="3">
                <div className="space-y-4 p-4 rounded-lg border border-border">
                  <h4 className="font-medium flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Watermarking
                  </h4>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Enable Watermark</label>
                        <p className="text-sm text-muted-foreground">Apply watermark to all gallery images</p>
                      </div>
                      <Switch
                        checked={watch('watermarkEnabled')}
                        onCheckedChange={checked => setValue('watermarkEnabled', checked)}
                        disabled={isSubmitting}
                      />
                    </div>

                    {watch('watermarkEnabled') && (
                      <div className="space-y-2">
                        <Label>Watermark Position</Label>
                        <Select
                          value="bottom-right"
                          onValueChange={() => {}} // Would register to form
                        >
                          <SelectTrigger className="w-full max-w-xs">
                            <SelectValue placeholder="Select position" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="top-left">Top Left</SelectItem>
                            <SelectItem value="top-right">Top Right</SelectItem>
                            <SelectItem value="bottom-left">Bottom Left</SelectItem>
                            <SelectItem value="bottom-right">Bottom Right</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 p-4 rounded-lg border border-border">
                  <h4 className="font-medium flex items-center gap-2">
                    <MoreHorizontal className="h-4 w-4" />
                    SEO & Custom Domain
                  </h4>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="seoTitle">SEO Title</Label>
                      <Input
                        id="seoTitle"
                        placeholder="Custom title for search engines (max 60 chars)"
                        maxLength={60}
                        {...register('seoTitle')}
                        disabled={isSubmitting}
                      />
                      <p className="text-sm text-muted-foreground">Defaults to gallery name</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="seoDescription">SEO Description</Label>
                      <Textarea
                        id="seoDescription"
                        placeholder="Custom description for search engines (max 160 chars)"
                        maxLength={160}
                        {...register('seoDescription')}
                        disabled={isSubmitting}
                        rows={2}
                      />
                      <p className="text-sm text-muted-foreground">Defaults to gallery description</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customDomain">Custom Domain (optional)</Label>
                      <Input
                        id="customDomain"
                        placeholder="gallery.yourdomain.com"
                        {...register('customDomain')}
                        disabled={isSubmitting}
                      />
                      <p className="text-sm text-muted-foreground">Configure DNS to point to LensFlow</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={activeStep === 1 || isSubmitting}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <div className="flex items-center gap-3">
                {activeStep < 3 ? (
                  <Button type="button" onClick={nextStep} disabled={isSubmitting}>
                    Next
                    <ArrowLeft className="h-4 w-4 -rotate-90 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Create Gallery'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}