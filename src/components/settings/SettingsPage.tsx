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
  Download,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import { cancelSubscription, resumeSubscription, cancelPendingDowngrade } from '@/lib/actions/subscription-payments'
import type { Plan, StorageUsage, SubscriptionAccessState } from '@/lib/entitlements'
import { PRICING_TIERS } from '@/lib/constants/pricing'
import { SubscribeDialog } from '@/components/settings/SubscribeDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import { createBrowserClient } from '@/lib/supabase/client'
import { getAuthErrorMessage } from '@/lib/auth/error-messages'
import { useAuthUser } from '@/lib/auth/hooks'
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
  const [isCancellingDowngrade, setIsCancellingDowngrade] = React.useState(false)

  async function handleCancelPendingDowngrade() {
    setIsCancellingDowngrade(true)
    const result = await cancelPendingDowngrade(studioSlug)
    setIsCancellingDowngrade(false)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    toast.success('Scheduled plan change cancelled — your current plan will keep renewing.')
    router.refresh()
  }

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

  // Only General and Branding actually persist through this button --
  // Notifications/Security/Billing/Integrations/Advanced either have their
  // own dedicated real actions or nothing to save at all. Previously this
  // button was shown on every tab and, for the ones with no real save path,
  // faked a 1-second spinner then reported "Saved" regardless -- showing
  // success for a click that persisted nothing.
  const showSaveButton = activeTab === 'general' || activeTab === 'branding'

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus('idle')

    try {
      if (activeTab === 'general' && generalFormRef.current) {
        const formData = new FormData(generalFormRef.current)
        formData.set('business_type', businessType)
        formData.set('currency', currency)
        formData.set('payment_terms', paymentTerms)

        const result = await updateStudioSettings(studioSlug, formData)
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
        if (result?.error) {
          setSaveStatus('error')
          toast.error(result.error)
          return
        }
        setSaveStatus('success')
        setTimeout(() => setSaveStatus('idle'), 3000)
        return
      }
    } catch {
      // A thrown (as opposed to returned) error here means the Server
      // Action call itself never reached the server -- e.g. the network
      // dropped mid-request -- so there's nothing to report beyond "it
      // didn't go through."
      setSaveStatus('error')
      toast.error('Could not save changes. Check your connection and try again.')
      return
    } finally {
      setIsSaving(false)
    }
  }

  const { user } = useAuthUser()
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmNewPassword, setConfirmNewPassword] = React.useState('')
  const [showPasswords, setShowPasswords] = React.useState(false)
  const [passwordError, setPasswordError] = React.useState<string | null>(null)
  const [isChangingPassword, setIsChangingPassword] = React.useState(false)

  const passwordRequirements = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
    { label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ]
  const isNewPasswordValid = passwordRequirements.every((req) => req.test(newPassword))

  const handleChangePassword = async () => {
    setPasswordError(null)

    if (!user?.email) {
      setPasswordError('Unable to verify your account. Please refresh and try again.')
      return
    }
    if (!isNewPasswordValid) {
      setPasswordError('Your new password does not meet the requirements below.')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    setIsChangingPassword(true)
    const supabase = createBrowserClient()

    // Re-verify the current password before changing it -- Supabase's
    // updateUser() only needs a valid session, not the current password, so
    // without this a hijacked/left-open session could change the password
    // with no knowledge of the original one.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (verifyError) {
      setIsChangingPassword(false)
      setPasswordError('Current password is incorrect.')
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    setIsChangingPassword(false)

    if (updateError) {
      const safeMessage = getAuthErrorMessage(updateError.message)
      setPasswordError(safeMessage)
      toast.error(safeMessage)
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
    toast.success('Password updated')
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
    <div className="flex-1 max-w-5xl mx-auto">
      <PageHeader
        title="Settings"
        description="Manage your studio preferences and configuration"
        actions={
          showSaveButton ? (
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
          ) : undefined
        }
      />

      <div className="space-y-6">
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

        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={Bell}
                title="Per-channel notification preferences aren't configurable yet"
                description="You're still notified inside LensFlow — new bookings, payments, gallery activity, and more show up in the bell icon in the header. Choosing which events also go to email is planned but not built yet."
              />
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
                <Label htmlFor="current_password">Current password</Label>
                <div className="relative">
                  <Input
                    id="current_password"
                    type={showPasswords ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pr-10"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isChangingPassword}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPasswords((v) => !v)}
                    aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                    aria-pressed={showPasswords}
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_password">New password</Label>
                <Input
                  id="new_password"
                  type={showPasswords ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isChangingPassword}
                  autoComplete="new-password"
                  aria-describedby="password-requirements"
                />
                <div id="password-requirements" className="space-y-1 pt-1" role="list" aria-label="Password requirements">
                  {passwordRequirements.map((req) => (
                    <div key={req.label} className="flex items-center gap-2 text-xs">
                      {req.test(newPassword) ? (
                        <CheckCircle className="h-3.5 w-3.5 text-success flex-shrink-0" />
                      ) : (
                        <span className="h-3.5 w-3.5 rounded-full border border-border flex-shrink-0" />
                      )}
                      <span className="text-muted-foreground">{req.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_new_password">Confirm new password</Label>
                <Input
                  id="confirm_new_password"
                  type={showPasswords ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  disabled={isChangingPassword}
                  autoComplete="new-password"
                />
              </div>
              {passwordError && (
                <p className="text-sm text-destructive" role="alert">{passwordError}</p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleChangePassword}
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update password'
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={Shield}
                title="Two-factor authentication and session management aren't available yet"
                description="These are planned but not built. Your password remains the only sign-in credential for now."
                compact
              />
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

                  {isOwner && billing.subscription?.pendingPlanName && billing.accessState === 'active' && (
                    <div className="mt-4 rounded-lg border border-info/40 bg-info/10 p-3 text-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p>
                          Switching to the <strong>{billing.subscription.pendingPlanName}</strong> plan
                          {billing.subscription.currentPeriodEnd && <> on {format(new Date(billing.subscription.currentPeriodEnd), 'MMM d, yyyy')}</>} — already paid for.
                        </p>
                        <Button variant="outline" size="sm" disabled={isCancellingDowngrade} onClick={handleCancelPendingDowngrade}>
                          {isCancellingDowngrade && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                          Keep current plan
                        </Button>
                      </div>
                    </div>
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
    </div>
  )
}
