'use client'

import * as React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Settings,
  Palette,
  Bell,
  Shield,
  CreditCard,
  Zap,
  Database,
  Save,
  Loader2,
  CheckCircle,
  Upload,
  Instagram,
  Facebook,
  ImageIcon,
  Smartphone,
  Monitor,
  Download,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CURRENCIES, formatCurrency } from '@/lib/currencies'
import { toast } from 'sonner'
import { deleteStudio, updateStudioSettings, updateStudioBranding, uploadStudioLogo, type StudioSettingsRow } from '@/lib/actions/studios'
import type { SubscriptionInfo, SubscriptionPaymentRow } from '@/lib/actions/billing'
import { cancelSubscription, resumeSubscription } from '@/lib/actions/subscription-payments'
import type { Plan, StorageUsage, SubscriptionAccessState } from '@/lib/entitlements'
import { PRICING_TIERS } from '@/lib/constants/pricing'
import { SubscribeDialog } from '@/components/settings/SubscribeDialog'
import { format } from 'date-fns'

interface SettingsPageProps {
  studioSlug: string
  studioName: string
  isOwner: boolean
  settings: StudioSettingsRow | null
  billing: {
    plan: Plan
    storage: StorageUsage
    subscription: SubscriptionInfo | null
    accessState: SubscriptionAccessState
    graceEndsAt: string | null
  } | null
  paymentHistory: SubscriptionPaymentRow[]
}

function NotificationRow({
  title,
  description,
  defaultChecked = true,
}: {
  title: string
  description: string
  defaultChecked?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  )
}

function IntegrationCard({
  name,
  description,
}: {
  name: string
  description: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
          <Zap className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Badge variant="outline" className="shrink-0">
        Coming soon
      </Badge>
    </div>
  )
}

export function SettingsPage({ studioSlug, studioName, isOwner, settings, billing, paymentHistory }: SettingsPageProps) {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = React.useState<string>(searchParams.get('tab') ?? 'general')
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'success' | 'error'>('idle')
  const [deleteConfirmText, setDeleteConfirmText] = React.useState('')
  const [isDeletingStudio, setIsDeletingStudio] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)

  const router = useRouter()
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false)
  const [isCancelling, setIsCancelling] = React.useState(false)
  const [isResuming, setIsResuming] = React.useState(false)

  async function handleCancelSubscription() {
    setIsCancelling(true)
    const result = await cancelSubscription(studioSlug)
    setIsCancelling(false)
    setCancelDialogOpen(false)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    toast.success('Your plan will move to Free at the end of the current period.')
    router.refresh()
  }

  async function handleResumeSubscription() {
    setIsResuming(true)
    const result = await resumeSubscription(studioSlug)
    setIsResuming(false)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    toast.success('Your plan will keep renewing as normal.')
    router.refresh()
  }

  const generalFormRef = React.useRef<HTMLFormElement>(null)
  const [businessType, setBusinessType] = React.useState(settings?.business_type ?? 'llc')
  const [currency, setCurrency] = React.useState(settings?.currency ?? 'USD')
  const [paymentTerms, setPaymentTerms] = React.useState(settings?.payment_terms ?? 'net30')

  const [logoUrl, setLogoUrl] = React.useState(settings?.logo_url ?? null)
  const [isUploadingLogo, setIsUploadingLogo] = React.useState(false)
  const [brandColor, setBrandColor] = React.useState(settings?.brand_color ?? '#3B82F6')
  const logoInputRef = React.useRef<HTMLInputElement>(null)

  const handleLogoFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setIsUploadingLogo(true)
    const formData = new FormData()
    formData.set('logo', file)
    const result = await uploadStudioLogo(studioSlug, formData)
    setIsUploadingLogo(false)

    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setLogoUrl(result.logoUrl)
    toast.success('Logo updated')
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus('idle')

    if (activeTab === 'general' && generalFormRef.current) {
      const formData = new FormData(generalFormRef.current)
      formData.set('business_type', businessType)
      formData.set('currency', currency)
      formData.set('payment_terms', paymentTerms)

      const result = await updateStudioSettings(studioSlug, formData)
      setIsSaving(false)
      if (result?.error) {
        setSaveStatus('error')
        toast.error(result.error)
        return
      }
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
      return
    }

    if (activeTab === 'branding') {
      const formData = new FormData()
      formData.set('brand_color', brandColor)
      const result = await updateStudioBranding(studioSlug, formData)
      setIsSaving(false)
      if (result?.error) {
        setSaveStatus('error')
        toast.error(result.error)
        return
      }
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
      return
    }

    // Other tabs have no backing data yet
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
    setSaveStatus('success')
    setTimeout(() => setSaveStatus('idle'), 3000)
  }

  const handleDeleteStudio = async () => {
    setIsDeletingStudio(true)
    try {
      const result = await deleteStudio(studioSlug, deleteConfirmText)
      if (result?.error) {
        toast.error(result.error)
        setIsDeletingStudio(false)
      }
      // On success, deleteStudio redirects (throws NEXT_REDIRECT) and this component unmounts.
    } catch (err) {
      if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
        toast.error(err.message || 'Failed to delete studio')
        setIsDeletingStudio(false)
      } else if (!(err instanceof Error)) {
        throw err
      }
    }
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'integrations', label: 'Integrations', icon: Zap },
    { id: 'advanced', label: 'Advanced', icon: Database },
  ]

  return (
    <div className="flex-1 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-sm font-display font-semibold">Settings</h1>
          <p className="text-body text-muted-foreground mt-1">Manage your studio preferences and configuration</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saveStatus === 'success' ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2 text-success" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 gap-1 mb-6">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm"
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="space-y-6">
          <form ref={generalFormRef} onSubmit={(e) => e.preventDefault()}>
            <Card>
              <CardHeader>
                <CardTitle>Studio Information</CardTitle>
                <CardDescription>Basic information about your studio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Studio Name</Label>
                    <Input id="name" name="name" defaultValue={studioName} placeholder="Enter studio name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Studio Slug</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">lensflow.app/</span>
                      <Input defaultValue={studioSlug} placeholder="studio-slug" className="flex-1" disabled />
                    </div>
                    <p className="text-sm text-muted-foreground">This is your public studio URL</p>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={settings?.description ?? ''}
                      rows={3}
                      placeholder="Tell visitors about your studio"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website_url">Website</Label>
                    <Input id="website_url" name="website_url" type="url" defaultValue={settings?.website_url ?? ''} placeholder="https://yourwebsite.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" type="tel" defaultValue={settings?.phone ?? ''} placeholder="+1 (555) 000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" defaultValue={settings?.email ?? ''} placeholder="contact@yourstudio.com" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      name="address"
                      defaultValue={settings?.address ?? ''}
                      rows={3}
                      placeholder="Studio address"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Business Details</CardTitle>
                <CardDescription>Legal and tax information for invoices and contracts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="legal_business_name">Legal Business Name</Label>
                    <Input id="legal_business_name" name="legal_business_name" defaultValue={settings?.legal_business_name ?? ''} placeholder="Legal business name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax_id">Tax ID / EIN</Label>
                    <Input id="tax_id" name="tax_id" defaultValue={settings?.tax_id ?? ''} placeholder="XX-XXXXXXX" />
                  </div>
                  <div className="space-y-2">
                    <Label>Business Type</Label>
                    <Select value={businessType} onValueChange={setBusinessType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sole">Sole Proprietorship</SelectItem>
                        <SelectItem value="llc">LLC</SelectItem>
                        <SelectItem value="corp">Corporation</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                        <SelectItem value="nonprofit">Non-Profit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.code} ({c.symbol}) — {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">Used for invoices, quotes, and your store</p>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Default Payment Terms</Label>
                    <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                        <SelectItem value="net7">Net 7</SelectItem>
                        <SelectItem value="net15">Net 15</SelectItem>
                        <SelectItem value="net30">Net 30</SelectItem>
                        <SelectItem value="net45">Net 45</SelectItem>
                        <SelectItem value="net60">Net 60</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>Shown in your dashboard and on client-facing galleries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Studio logo" className="h-20 w-20 rounded-lg object-contain bg-muted shrink-0" />
                ) : (
                  <div className="h-20 w-20 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-display text-2xl font-semibold shrink-0">
                    {studioName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="space-y-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={handleLogoFileSelected}
                  />
                  <Button variant="outline" size="sm" disabled={isUploadingLogo} onClick={() => logoInputRef.current?.click()}>
                    {isUploadingLogo ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {isUploadingLogo ? 'Uploading…' : 'Upload logo'}
                  </Button>
                  <p className="text-sm text-muted-foreground">PNG, JPEG, WebP, or SVG, up to 5MB</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brand Colors</CardTitle>
              <CardDescription>Used across your galleries, invoices, and client-facing pages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="h-10 w-16 p-1"
                    />
                    <Input
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="flex-1 font-mono"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Default Gallery Cover</CardTitle>
              <CardDescription>Used when a gallery doesn&apos;t have photos yet</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="h-20 w-32 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload cover image
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
              <CardDescription>Linked from your public studio page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Instagram className="h-4 w-4" /> Instagram</Label>
                <Input placeholder="https://instagram.com/yourstudio" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Facebook className="h-4 w-4" /> Facebook</Label>
                <Input placeholder="https://facebook.com/yourstudio" />
              </div>
              <div className="space-y-2">
                <Label>Pinterest</Label>
                <Input placeholder="https://pinterest.com/yourstudio" />
              </div>
              <div className="space-y-2">
                <Label>TikTok</Label>
                <Input placeholder="https://tiktok.com/@yourstudio" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Choose what you get notified about</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <NotificationRow
                title="New booking inquiry"
                description="When a client requests a new session"
              />
              <NotificationRow
                title="Gallery viewed"
                description="The first time a client opens a gallery you shared"
              />
              <NotificationRow
                title="Photo favorited"
                description="When a client favorites photos in a gallery"
                defaultChecked={false}
              />
              <NotificationRow
                title="Payment received"
                description="When an invoice is paid"
              />
              <NotificationRow
                title="Contract signed"
                description="When a client signs a contract"
              />
              <NotificationRow
                title="Quote accepted or declined"
                description="When a client responds to a quote"
              />
              <NotificationRow
                title="Weekly summary"
                description="A recap of bookings, revenue, and gallery activity"
                defaultChecked={false}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Email</CardTitle>
              <CardDescription>Where studio notifications are sent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-md">
                <Label>Email address</Label>
                <Input type="email" defaultValue="hello@animarastudio.com" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Change your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Current password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>New password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>Confirm new password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <Button variant="outline" size="sm">Update password</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Authenticator app</p>
                  <p className="text-sm text-muted-foreground">Not enabled</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Devices currently signed in to your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 py-2">
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Windows · Chrome</p>
                    <p className="text-sm text-muted-foreground">Nairobi, Kenya</p>
                  </div>
                </div>
                <Badge variant="success">This device</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4 py-2">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">iPhone · Safari</p>
                    <p className="text-sm text-muted-foreground">Last active 2 days ago</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">Sign out</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Manage your LensFlow subscription</CardDescription>
            </CardHeader>
            <CardContent>
              {billing ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-xl font-semibold">{billing.plan.name} Plan</span>
                        <Badge variant={billing.plan.slug === 'free' ? 'secondary' : 'success'}>
                          {billing.plan.slug === 'free' ? 'Free' : 'Active'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {billing.plan.priceCents > 0 ? `$${billing.plan.priceCents / 100}/month` : 'No cost'}
                        {billing.subscription?.currentPeriodEnd && billing.plan.slug !== 'free' && billing.accessState === 'active' && (
                          billing.subscription.cancelAtPeriodEnd
                            ? <> · Cancels {format(new Date(billing.subscription.currentPeriodEnd), 'MMM d, yyyy')} — moves to Free</>
                            : <> · Renews {format(new Date(billing.subscription.currentPeriodEnd), 'MMM d, yyyy')}</>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(billing.storage.usedBytes / 1_073_741_824).toFixed(1)} GB of {(billing.storage.limitBytes / 1_073_741_824).toFixed(0)} GB storage used
                      </p>
                    </div>
                  </div>

                  {billing.accessState === 'grace' && (
                    <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
                      <p className="font-medium">Your {billing.plan.name} period ended{billing.subscription?.currentPeriodEnd ? ` on ${format(new Date(billing.subscription.currentPeriodEnd), 'MMM d, yyyy')}` : ''}.</p>
                      <p className="mt-1 text-muted-foreground">
                        Galleries, downloads, and everything else keep working as normal, but new uploads are paused
                        {billing.graceEndsAt && <> until you renew — after {format(new Date(billing.graceEndsAt), 'MMM d, yyyy')} this studio moves to the Free plan</>}.
                      </p>
                    </div>
                  )}
                  {billing.accessState === 'expired' && (
                    <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
                      <p className="font-medium text-destructive">Your subscription has expired.</p>
                      <p className="mt-1 text-muted-foreground">This studio is back on the Free plan. Your galleries and data are safe — subscribe again to restore your previous plan&apos;s features and storage.</p>
                    </div>
                  )}

                  {isOwner && (
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {PRICING_TIERS.filter((t) => t.id !== 'free').map((tier) => {
                        const isCurrent = billing.plan.slug === tier.id
                        return (
                          <div key={tier.id} className={`rounded-lg border p-3 ${isCurrent ? 'border-primary bg-primary/5' : 'border-border'}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{tier.name}</span>
                              <span className="text-sm text-muted-foreground">${tier.price}/mo</span>
                            </div>
                            {isCurrent ? (
                              <Badge variant="outline" className="mt-2">Current plan</Badge>
                            ) : (
                              <SubscribeDialog
                                studioSlug={studioSlug}
                                planSlug={tier.id as 'starter' | 'studio' | 'team'}
                                planName={tier.name}
                                priceUsd={tier.price}
                                trigger={
                                  <Button variant="outline" size="sm" className="mt-2 w-full">
                                    {billing.plan.slug === 'free' ? 'Subscribe' : 'Switch plan'}
                                  </Button>
                                }
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {!isOwner && (
                    <p className="text-sm text-muted-foreground mt-4">Only the studio owner can change the subscription plan.</p>
                  )}

                  {isOwner && billing.plan.slug !== 'free' && billing.subscription && billing.accessState === 'active' && (
                    <div className="mt-5 border-t border-border pt-4">
                      {billing.subscription.cancelAtPeriodEnd ? (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <p className="text-sm text-muted-foreground">
                            Your plan won&apos;t renew and moves to Free on{' '}
                            {billing.subscription.currentPeriodEnd && format(new Date(billing.subscription.currentPeriodEnd), 'MMM d, yyyy')}.
                          </p>
                          <Button variant="outline" size="sm" disabled={isResuming} onClick={handleResumeSubscription}>
                            {isResuming && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                            Keep my plan
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setCancelDialogOpen(true)}>
                          Cancel subscription
                        </Button>
                      )}
                      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel your {billing.plan.name} plan?</AlertDialogTitle>
                            <AlertDialogDescription>
                              You&apos;ll keep {billing.plan.name} access until{' '}
                              {billing.subscription?.currentPeriodEnd && format(new Date(billing.subscription.currentPeriodEnd), 'MMM d, yyyy')},
                              then this studio moves to the Free plan. Your galleries and data are safe either way — you can resubscribe anytime.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isCancelling}>Keep my plan</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={isCancelling}
                              onClick={(e) => {
                                e.preventDefault()
                                handleCancelSubscription()
                              }}
                            >
                              {isCancelling ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Cancelling...
                                </>
                              ) : (
                                'Cancel subscription'
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Unable to load billing information.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>Subscription payments collected via M-Pesa</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {paymentHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground p-6 text-center">No subscription payments yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{format(new Date(row.createdAt), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{row.planName ?? '—'}</TableCell>
                        <TableCell className="font-mono">{formatCurrency(row.amount, row.currency)}</TableCell>
                        <TableCell>
                          <Badge variant={row.status === 'completed' ? 'success' : row.status === 'pending' ? 'warning' : 'destructive'}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground font-mono">
                          {row.receiptNumber ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connected Apps</CardTitle>
              <CardDescription>Connect the tools you already use</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <IntegrationCard
                name="Stripe"
                description="Accept online payments for invoices and store orders"
              />
              <IntegrationCard
                name="Google Calendar"
                description="Sync bookings and sessions two-way"
              />
              <IntegrationCard
                name="Mailchimp"
                description="Sync clients to email marketing lists"
              />
              <IntegrationCard
                name="Zapier"
                description="Connect LensFlow to thousands of other apps"
              />
              <IntegrationCard
                name="QuickBooks"
                description="Sync invoices and payments to your books"
              />
              <IntegrationCard
                name="Slack"
                description="Get studio notifications in a Slack channel"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
              <CardDescription>Download all your studio data as a ZIP archive</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" disabled>
                <Download className="h-4 w-4 mr-2" />
                Request data export
              </Button>
              <p className="text-sm text-muted-foreground mt-2">Coming soon — will include galleries, clients, invoices, and contracts, emailed as a download link.</p>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>These actions are permanent and cannot be undone</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Delete this studio</p>
                  <p className="text-sm text-muted-foreground">Permanently deletes all galleries, clients, and data</p>
                  {!isOwner && (
                    <p className="text-sm text-destructive mt-1">Only the studio owner can delete this studio</p>
                  )}
                </div>
                <AlertDialog
                  open={deleteDialogOpen}
                  onOpenChange={(open) => {
                    setDeleteDialogOpen(open)
                    if (!open) setDeleteConfirmText('')
                  }}
                >
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={!isOwner}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete studio
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this studio?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all galleries, photos, clients, bookings, invoices, quotes,
                        contracts, and other data for <strong>{studioName}</strong>. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                      <Label htmlFor="delete-confirm">
                        Type <strong>{studioName}</strong> to confirm
                      </Label>
                      <Input
                        id="delete-confirm"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={studioName}
                        autoComplete="off"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeletingStudio}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={deleteConfirmText !== studioName || isDeletingStudio}
                        onClick={(e) => {
                          e.preventDefault()
                          handleDeleteStudio()
                        }}
                      >
                        {isDeletingStudio ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          'Delete studio'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
