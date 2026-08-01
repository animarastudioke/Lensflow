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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ArrowLeft, Link as LinkIcon, Copy, Check, Share2, Lock, Globe, User, Calendar, Eye, Download, Heart, MessageSquare, QrCode, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

interface ShareSettings {
  link_name?: string
  password_protected: boolean
  expires_at?: string
  allow_download: boolean
  allow_comments: boolean
  allow_favorites: boolean
  require_email: boolean
  collect_email: boolean
  custom_branding: boolean
  brand_name?: string
  brand_logo?: string
  brand_color?: string
  cover_image?: string
  notify_on_view: boolean
  notify_on_download: boolean
  notify_on_favorite: boolean
  notify_on_comment: boolean
  allow_embed: boolean
  embed_width: number
  embed_height: number
}

interface Gallery {
  id: string
  name: string
  share_token: string
  studio_id: string
  password_protected: boolean
  allow_download: boolean
  allow_comments: boolean
  allow_favorites: boolean
  watermark_enabled: boolean
  expiry_days?: number
  created_at: string
}

const shareSettingsSchema = z.object({
  // Share link settings
  link_name: z.string().max(50).optional(),
  password_protected: z.boolean().default(false),
  password: z.string().optional(),
  expires_at: z.string().optional(),
  allow_download: z.boolean().default(true),
  allow_comments: z.boolean().default(true),
  allow_favorites: z.boolean().default(true),
  require_email: z.boolean().default(false),
  collect_email: z.boolean().default(false),

  // Branding
  custom_branding: z.boolean().default(false),
  brand_name: z.string().max(50).optional(),
  brand_logo: z.string().url().optional().or(z.literal('')),
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  cover_image: z.string().url().optional().or(z.literal('')),

  // Notifications
  notify_on_view: z.boolean().default(false),
  notify_on_download: z.boolean().default(true),
  notify_on_favorite: z.boolean().default(false),
  notify_on_comment: z.boolean().default(true),

  // Embed settings
  allow_embed: z.boolean().default(false),
  embed_width: z.number().min(300).max(1920).default(800),
  embed_height: z.number().min(200).max(1080).default(600),
}).refine(data => !data.password_protected || data.password, {
  message: 'Password is required when password protection is enabled',
  path: ['password'],
})

type ShareSettingsForm = z.infer<typeof shareSettingsSchema>

interface ShareSettingsContentProps {
  studioSlug: string
  galleryId: string
  gallery: Gallery
  settings?: ShareSettings | null
}

export function ShareSettingsContent({ studioSlug, galleryId, gallery, settings }: ShareSettingsContentProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState<'link' | 'branding' | 'notifications' | 'embed'>('link')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const defaultValues: ShareSettingsForm = {
    link_name: settings?.link_name || gallery.name,
    password_protected: settings?.password_protected ?? gallery.password_protected,
    password: '',
    expires_at: settings?.expires_at || '',
    allow_download: settings?.allow_download ?? gallery.allow_download,
    allow_comments: settings?.allow_comments ?? gallery.allow_comments,
    allow_favorites: settings?.allow_favorites ?? gallery.allow_favorites,
    require_email: settings?.require_email ?? false,
    collect_email: settings?.collect_email ?? false,
    custom_branding: settings?.custom_branding ?? false,
    brand_name: settings?.brand_name || '',
    brand_logo: settings?.brand_logo || '',
    brand_color: settings?.brand_color || '#3b82f6',
    cover_image: settings?.cover_image || '',
    notify_on_view: settings?.notify_on_view ?? false,
    notify_on_download: settings?.notify_on_download ?? true,
    notify_on_favorite: settings?.notify_on_favorite ?? false,
    notify_on_comment: settings?.notify_on_comment ?? true,
    allow_embed: settings?.allow_embed ?? false,
    embed_width: settings?.embed_width ?? 800,
    embed_height: settings?.embed_height ?? 600,
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<ShareSettingsForm>({
    resolver: zodResolver(shareSettingsSchema),
    defaultValues,
  })

  const watchedPasswordProtected = watch('password_protected')
  const watchedCustomBranding = watch('custom_branding')
  const watchedAllowEmbed = watch('allow_embed')

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/g/${gallery.share_token}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const onSubmit = async (data: ShareSettingsForm) => {
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value))
        }
      })
      formData.append('studio_slug', studioSlug)

      const response = await fetch(`/api/galleries/${galleryId}/share`, {
        method: 'PATCH',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      toast.success('Share settings saved!')
      router.refresh()
    } catch (err) {
      toast.error('Failed to save settings')
    } finally {
      setIsSubmitting(false)
    }
  }

  const regenerateToken = async () => {
    if (confirm('This will invalidate the current share link. Are you sure?')) {
      try {
        const response = await fetch(`/api/galleries/${galleryId}/regenerate-token`, {
          method: 'POST',
        })

        if (!response.ok) {
          throw new Error('Failed to regenerate token')
        }

        toast.success('New share link generated!')
        router.refresh()
      } catch {
        toast.error('Failed to regenerate link')
      }
    }
  }

  React.useEffect(() => {
    if (settings) {
      reset({
        ...defaultValues,
        password_protected: settings.password_protected,
        expires_at: settings.expires_at || '',
        allow_download: settings.allow_download,
        allow_comments: settings.allow_comments,
        allow_favorites: settings.allow_favorites,
        require_email: settings.require_email,
        collect_email: settings.collect_email,
        custom_branding: settings.custom_branding,
        brand_name: settings.brand_name || '',
        brand_logo: settings.brand_logo || '',
        brand_color: settings.brand_color || '#3b82f6',
        cover_image: settings.cover_image || '',
        notify_on_view: settings.notify_on_view,
        notify_on_download: settings.notify_on_download,
        notify_on_favorite: settings.notify_on_favorite,
        notify_on_comment: settings.notify_on_comment,
        allow_embed: settings.allow_embed,
        embed_width: settings.embed_width,
        embed_height: settings.embed_height,
      })
    }
  }, [settings, reset])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/${studioSlug}/galleries/${galleryId}`}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Gallery
        </Link>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-display-sm">Share Settings</CardTitle>
              <CardDescription>Configure how your gallery is shared with clients</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={regenerateToken}>
                <LinkIcon className="h-4 w-4 mr-2" />
                Regenerate Link
              </Button>
              <Link href={`/g/${gallery.share_token}`} target="_blank">
                <Button variant="outline">
                  <Share2 className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Current Share Link */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <Label className="font-medium">Share Link</Label>
              <Button variant="ghost" size="icon" onClick={copyLink} disabled={copied} aria-label="Copy link">
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Input value={shareUrl} readOnly className="flex-1 bg-background" />
              <label className="flex items-center gap-1 text-sm text-muted-foreground">
                <Globe className="h-3.5 w-3.5" />
                Public
              </label>
            </div>
            {gallery.password_protected && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                <Lock className="h-3.5 w-3.5" />
                Password protected
              </div>
            )}
            {settings?.expires_at && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                <Calendar className="h-3.5 w-3.5" />
                Expires {new Date(settings.expires_at).toLocaleDateString()}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="link">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Share Link
                </TabsTrigger>
                <TabsTrigger value="branding">
                  <QrCode className="h-4 w-4 mr-2" />
                  Branding
                </TabsTrigger>
                <TabsTrigger value="notifications">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="embed">
                  <Download className="h-4 w-4 mr-2" />
                  Embed
                </TabsTrigger>
              </TabsList>

              {/* Share Link Tab */}
              <TabsContent value="link" className="space-y-6 pt-4">
                <div className="space-y-4 p-4 rounded-lg border border-border">
                  <h4 className="font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Access Control
                  </h4>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Link Name</label>
                        <p className="text-sm text-muted-foreground">Custom name for the share link</p>
                      </div>
                      <Input
                        placeholder="My Gallery Link"
                        {...register('link_name')}
                        className="w-64 h-10 px-4 rounded-lg border border-input bg-background"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Password Protection</label>
                        <p className="text-sm text-muted-foreground">Require password to view gallery</p>
                      </div>
                      <Switch
                        checked={watchedPasswordProtected}
                        onCheckedChange={checked => setValue('password_protected', checked)}
                      />
                    </div>

                    {watchedPasswordProtected && (
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          {...register('password')}
                          placeholder="Enter password"
                        />
                        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Link Expiry</label>
                        <p className="text-sm text-muted-foreground">Set when the link expires (optional)</p>
                      </div>
                      <Input
                        type="date"
                        {...register('expires_at')}
                        className="w-48 h-10 px-4 rounded-lg border border-input bg-background"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4 rounded-lg border border-border">
                  <h4 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Client Permissions
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Allow Downloads</label>
                        <p className="text-sm text-muted-foreground">Clients can download photos</p>
                      </div>
                      <Switch checked={watch('allow_download')} onCheckedChange={checked => setValue('allow_download', checked)} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Allow Comments</label>
                        <p className="text-sm text-muted-foreground">Clients can leave comments on photos</p>
                      </div>
                      <Switch checked={watch('allow_comments')} onCheckedChange={checked => setValue('allow_comments', checked)} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Allow Favorites</label>
                        <p className="text-sm text-muted-foreground">Clients can mark photos as favorites</p>
                      </div>
                      <Switch checked={watch('allow_favorites')} onCheckedChange={checked => setValue('allow_favorites', checked)} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Require Email</label>
                        <p className="text-sm text-muted-foreground">Clients must enter email to view</p>
                      </div>
                      <Switch checked={watch('require_email')} onCheckedChange={checked => setValue('require_email', checked)} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Collect Email</label>
                        <p className="text-sm text-muted-foreground">Optionally collect client emails</p>
                      </div>
                      <Switch checked={watch('collect_email')} onCheckedChange={checked => setValue('collect_email', checked)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4 rounded-lg border border-border">
                  <h4 className="font-medium flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    QR Code
                  </h4>
                  <div className="flex items-center gap-4">
                    <div className="h-32 w-32 bg-muted rounded-lg flex items-center justify-center border border-border">
                      <QrCode className="h-16 w-16 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Gallery QR Code</p>
                      <p className="text-sm text-muted-foreground">Scan to open gallery on mobile</p>
                      <Button variant="outline" className="mt-2" onClick={() => setValue('cover_image', shareUrl)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download QR Code
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Branding Tab */}
              <TabsContent value="branding" className="space-y-6 pt-4">
                <div className="space-y-4 p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      Custom Branding
                    </h4>
                    <Switch checked={watchedCustomBranding} onCheckedChange={checked => setValue('custom_branding', checked)} />
                  </div>
                  <p className="text-sm text-muted-foreground">Enable custom branding for this gallery's client view</p>
                </div>

                {watchedCustomBranding && (
                  <div className="space-y-4 p-4 rounded-lg border border-border">
                    <div className="space-y-2">
                      <Label htmlFor="brand_name">Brand Name</Label>
                      <Input id="brand_name" {...register('brand_name')} placeholder="Your Studio Name" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="brand_logo">Brand Logo URL</Label>
                      <Input id="brand_logo" {...register('brand_logo')} placeholder="https://example.com/logo.png" type="url" />
                      <p className="text-sm text-muted-foreground">Logo displayed in gallery header (recommended: SVG or PNG, max 200px wide)</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="brand_color">Brand Color</Label>
                      <Input id="brand_color" {...register('brand_color')} type="color" className="h-10 w-20 cursor-pointer" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cover_image">Cover Image URL</Label>
                      <Input id="cover_image" {...register('cover_image')} placeholder="https://example.com/cover.jpg" type="url" />
                      <p className="text-sm text-muted-foreground">Custom cover image for the gallery (recommended: 1920x1080)</p>
                    </div>

                    <div className="p-4 bg-muted rounded-lg border border-border">
                      <p className="font-medium mb-2">Preview</p>
                      <div className="h-40 bg-gradient-to-r from-primary/20 to-primary/5 rounded flex items-center justify-center">
                        <span className="text-muted-foreground">Gallery header preview</span>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-6 pt-4">
                <div className="space-y-4 p-4 rounded-lg border border-border">
                  <h4 className="font-medium flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Email Notifications
                  </h4>
                  <p className="text-sm text-muted-foreground">Receive email notifications when clients interact with this gallery</p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Gallery Views</label>
                        <p className="text-sm text-muted-foreground">When someone views the gallery</p>
                      </div>
                      <Switch checked={watch('notify_on_view')} onCheckedChange={checked => setValue('notify_on_view', checked)} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Downloads</label>
                        <p className="text-sm text-muted-foreground">When a client downloads photos</p>
                      </div>
                      <Switch checked={watch('notify_on_download')} onCheckedChange={checked => setValue('notify_on_download', checked)} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Favorites</label>
                        <p className="text-sm text-muted-foreground">When a client favorites a photo</p>
                      </div>
                      <Switch checked={watch('notify_on_favorite')} onCheckedChange={checked => setValue('notify_on_favorite', checked)} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="font-medium">Comments</label>
                        <p className="text-sm text-muted-foreground">When a client leaves a comment</p>
                      </div>
                      <Switch checked={watch('notify_on_comment')} onCheckedChange={checked => setValue('notify_on_comment', checked)} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Embed Tab */}
              <TabsContent value="embed" className="space-y-6 pt-4">
                <div className="space-y-4 p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Allow Embedding
                    </h4>
                    <Switch checked={watchedAllowEmbed} onCheckedChange={checked => setValue('allow_embed', checked)} />
                  </div>
                  <p className="text-sm text-muted-foreground">Allow this gallery to be embedded on other websites</p>
                </div>

                {watchedAllowEmbed && (
                  <div className="space-y-4 p-4 rounded-lg border border-border">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="embed_width">Embed Width (px)</Label>
                        <Input id="embed_width" type="number" min="300" max="1920" {...register('embed_width', { valueAsNumber: true })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="embed_height">Embed Height (px)</Label>
                        <Input id="embed_height" type="number" min="200" max="1080" {...register('embed_height', { valueAsNumber: true })} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Embed Code</Label>
                      <Textarea
                        readOnly
                        rows={4}
                        className="font-mono text-sm bg-muted"
                        value={`<iframe src="${shareUrl}?embed=true" width="${watch('embed_width')}" height="${watch('embed_height')}" frameborder="0" allowfullscreen></iframe>`}
                      />
                      <Button variant="outline" size="sm" onClick={() => {
                        navigator.clipboard.writeText(`<iframe src="${shareUrl}?embed=true" width="${watch('embed_width')}" height="${watch('embed_height')}" frameborder="0" allowfullscreen></iframe>`)
                        toast.success('Embed code copied!')
                      }}>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy Embed Code
                      </Button>
                    </div>

                    <div className="p-4 bg-muted rounded-lg border border-border">
                      <p className="font-medium mb-2">Preview</p>
                      <iframe
                        src={`${shareUrl}?embed=true`}
                        width={watch('embed_width')}
                        height={watch('embed_height')}
                        frameBorder="0"
                        className="w-full max-w-[100%] border border-border rounded"
                      />
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Save button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" loading={isSubmitting} disabled={!isDirty && !isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}