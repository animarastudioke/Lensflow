'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
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
  Settings,
  Palette,
  Bell,
  Shield,
  CreditCard,
  Zap,
  Database,
  User,
  Mail,
  Key,
  Save,
  Loader2,
  CheckCircle,
  Camera,
  Upload,
  Trash2,
  Edit,
  Eye,
  Download,
  Share2,
  Plus,
  Minus,
  Calendar,
  Cloud,
  Lock,
  Unlock,
  Wifi,
  WifiOff,
  Sun,
  HelpCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Monitor,
  LogOut,
  Calculator,
  MessageSquare,
  Instagram,
  Facebook,
  Twitter,
  Pinterest,
  Youtube,
  Tiktok,
  Linkedin,
  Globe,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'

interface SettingsPageProps {
  studioSlug: string
}

export function SettingsPage({ studioSlug }: SettingsPageProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState<string>('general')
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'success' | 'error'>('idle')

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus('idle')
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
    setSaveStatus('success')
    setTimeout(() => setSaveStatus('idle'), 3000)
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
          <h1 className="text-display-sm font-display font-bold">Settings</h1>
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
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
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

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Studio Information</CardTitle>
              <CardDescription>Basic information about your studio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Studio Name</Label>
                  <Input defaultValue="Animara Studio" placeholder="Enter studio name" />
                </div>
                <div className="space-y-2">
                  <Label>Studio Slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">lensflow.app/</span>
                    <Input defaultValue={studioSlug} placeholder="studio-slug" className="flex-1" />
                  </div>
                  <p className="text-sm text-muted-foreground">This is your public studio URL</p>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    defaultValue="Professional photography and videography studio specializing in weddings, portraits, and commercial work."
                    rows={3}
                    placeholder="Tell visitors about your studio"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input type="url" defaultValue="https://animarastudio.com" placeholder="https://yourwebsite.com" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input type="tel" defaultValue="+1 (555) 123-4567" placeholder="+1 (555) 000-0000" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" defaultValue="hello@animarastudio.com" placeholder="contact@yourstudio.com" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Address</Label>
                  <Textarea
                    defaultValue="123 Creative Ave, Suite 100\nNew York, NY 10001\nUnited States"
                    rows={3}
                    placeholder="Studio address"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
              <CardDescription>Legal and tax information for invoices and contracts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Legal Business Name</Label>
                  <Input defaultValue="Animara Studio LLC" placeholder="Legal business name" />
                </div>
                <div className="space-y-2">
                  <Label>Tax ID / EIN</Label>
                  <Input defaultValue="12-3456789" placeholder="XX-XXXXXXX" />
                </div>
                <div className="space-y-2">
                  <Label>Business Type</Label>
                  <Select defaultValue="llc">
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
                  <Select defaultValue="USD">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="CAD">CAD ($)</SelectItem>
                      <SelectItem value="AUD">AUD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Default Payment Terms</Label>
                  <Select defaultValue="net30">
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

          <Card>
            <CardHeader>
              <CardTitle>Time & Language</CardTitle>
              <CardDescription>Regional settings for your studio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select defaultValue="America/New_York">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                      <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select defaultValue="MMM d, yyyy">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MMM d, yyyy">Jan 15, 2024</SelectItem>
                      <SelectItem value="d MMM yyyy">15 Jan 2024</SelectItem>
                      <SelectItem value="yyyy-MM-dd">2024-01-15</SelectItem>
                      <SelectItem value="MM/dd/yyyy">01/15/2024</SelectItem>
                      <SelectItem value="dd/MM/yyyy">15/01/2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time Format</Label>
                  <Select defaultValue="12h">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12 Hour (3:30 PM)</SelectItem>
                      <SelectItem value="24h">24 Hour (15:30)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="pt">Portuguese</SelectItem>
                      <SelectItem value="ja">Japanese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Week Starts On</Label>
                  <Select defaultValue="sunday">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Measurement Units</Label>
                  <Select defaultValue="imperial">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="imperial">Imperial (ft, in, lbs)</SelectItem>
                      <SelectItem value="metric">Metric (m, cm, kg)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Settings */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo & Favicon</CardTitle>
              <CardDescription>Upload your studio logo and favicon</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <Label>Main Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-48 border-2 border-dashed border-muted rounded-lg flex items-center justify-center bg-muted/50">
                      <Camera className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <div>
                      <Button variant="outline">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </Button>
                      <p className="text-sm text-muted-foreground mt-1">PNG or SVG, max 2MB. Recommended: 200x60px</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <Label>Logo Mark (Square)</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 border-2 border-dashed border-muted rounded-lg flex items-center justify-center bg-muted/50">
                      <Camera className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <div>
      `,
<parameter=command>
cat <<'EOF' >/h/scripts/lensflow/src/components/settings/SettingsPage.tsx
'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
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
  Settings,
  Palette,
  Bell,
  Shield,
  CreditCard,
  Zap,
  Database,
  User,
  Mail,
  Key,
  Save,
  Loader2,
  CheckCircle,
  Camera,
  Upload,
  Trash2,
  Edit,
  Eye,
  Download,
  Share2,
  Plus,
  Minus,
  Calendar,
  Cloud,
  Lock,
  Unlock,
  Wifi,
  WifiOff,
  Sun,
  HelpCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Monitor,
  LogOut,
  Calculator,
  MessageSquare,
  Instagram,
  Facebook,
  Twitter,
  Pinterest,
  Youtube,
  Tiktok,
  Linkedin,
  Globe,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'

interface SettingsPageProps {
  studioSlug: string
}

export function SettingsPage({ studioSlug }: SettingsPageProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState<string>('general')
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'success' | 'error'>('idle')

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus('idle')
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
    setSaveStatus('success')
    setTimeout(() => setSaveStatus('idle'), 3000)
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
          <h1 className="text-display-sm font-display font-bold">Settings</h1>
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
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
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
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Studio Information</CardTitle>
              <CardDescription>Basic information about your studio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Studio Name</Label>
                  <Input defaultValue="Animara Studio" placeholder="Enter studio name" />
                </div>
                <div className="space-y-2">
                  <Label>Studio Slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">lensflow.app/</span>
                    <Input defaultValue={studioSlug} placeholder="studio-slug" className="flex-1" />
                  </div>
                  <p className="text-sm text-muted-foreground">This is your public studio URL</p>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    defaultValue="Professional photography and videography studio specializing in weddings, portraits, and commercial work."
                    rows={3}
                    placeholder="Tell visitors about your studio"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input type="url" defaultValue="https://animarastudio.com" placeholder="https://yourwebsite.com" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input type="tel" defaultValue="+1 (555) 123-4567" placeholder="+1 (555) 000-0000" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" defaultValue="hello@animarastudio.com" placeholder="contact@yourstudio.com" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Address</Label>
                  <Textarea
                    defaultValue="123 Creative Ave, Suite 100\nNew York, NY 10001\nUnited States"
                    rows={3}
                    placeholder="Studio address"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
              <CardDescription>Legal and tax information for invoices and contracts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Legal Business Name</Label>
                  <Input defaultValue="Animara Studio LLC" placeholder="Legal business name" />
                </div>
                <div className="space-y-2">
                  <Label>Tax ID / EIN</Label>
                  <Input defaultValue="12-3456789" placeholder="XX-XXXXXXX" />
                </div>
                <div className="space-y-2">
                  <Label>Business Type</Label>
                  <Select defaultValue="llc">
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
                  <Select defaultValue="USD">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="CAD">CAD ($)</SelectItem>
                      <SelectItem value="AUD">AUD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Default Payment Terms</Label>
                  <Select defaultValue="net30">
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

          <Card>
            <CardHeader>
              <CardTitle>Time & Language</CardTitle>
              <CardDescription>Regional settings for your studio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select defaultValue="America/New_York">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                      <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select defaultValue="MMM d, yyyy">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MMM d, yyyy">Jan 15, 2024</SelectItem>
                      <SelectItem value="d MMM yyyy">15 Jan 2024</SelectItem>
                      <SelectItem value="yyyy-MM-dd">2024-01-15</SelectItem>
                      <SelectItem value="MM/dd/yyyy">01/15/2024</SelectItem>
                      <SelectItem value="dd/MM/yyyy">15/01/2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time Format</Label>
                  <Select defaultValue="12h">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12 Hour (3:30 PM)</SelectItem>
                      <SelectItem value="24h">24 Hour (15:30)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="pt">Portuguese</SelectItem>
                      <SelectItem value="ja">Japanese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Week Starts On</Label>
                  <Select defaultValue="sunday">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Measurement Units</Label>
                  <Select defaultValue="imperial">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="imperial">Imperial (ft, in, lbs)</SelectItem>
                      <SelectItem value="metric">Metric (m, cm, kg)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Settings */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo & Favicon</CardTitle>
              <CardDescription>Upload your studio logo and favicon</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <Label>Main Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-48 border-2 border-dashed border-muted rounded-lg flex items-center justify-center bg-muted/50">
                      <Camera className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <div>
                      <Button variant="outline">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </Button>
                      <p className="text-sm text-muted-foreground mt-1">PNG or SVG, max 2MB. Recommended: 200x60px</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <Label>Logo Mark (Square)</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 border-2 border-dashed border-muted rounded-lg flex items-center justify-center bg-muted/50">
                      <Camera className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <div>
                      <Button variant="outline">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Mark
                      </Button>
                      <p className="text-sm text-muted-foreground mt-1">Used for favicon and social. 1:1 ratio.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <Label>Favicon</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 border-2 border-dashed border-muted rounded flex items-center justify-center bg-muted/50">
                      <Camera className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <div>
                      <Button variant="outline" size="sm">
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        Upload
                      </Button>
                      <p className="text-sm text-muted-foreground mt-1">32x32px .ico or .png</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <Label>Watermark</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-48 border-2 border-dashed border-muted rounded-lg flex items-center justify-center bg-muted/50">
                      <Camera className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <div>
                      <Button variant="outline">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Watermark
                      </Button>
                      <p className="text-sm text-muted-foreground mt-1">PNG with transparency. Applied to gallery images.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Color Scheme</CardTitle>
              <CardDescription>Customize your studio's visual identity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <input type="color" defaultValue="#3B82F6" className="h-10 w-10 rounded border" />
                    <Input defaultValue="#3B82F6" placeholder="#3B82F6" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Secondary Color</Label>
                  <div className="flex items-center gap-3">
                    <input type="color" defaultValue="#8B5CF6" className="h-10 w-10 rounded border" />
                    <Input defaultValue="#8B5CF6" placeholder="#8B5CF6" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex items-center gap-3">
                    <input type="color" defaultValue="#F59E0B" className="h-10 w-10 rounded border" />
                    <Input defaultValue="#F59E0B" placeholder="#F59E0B" />
                  </div>
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Dark Mode Primary</Label>
                  <div className="flex items-center gap-3">
                    <input type="color" defaultValue="#60A5FA" className="h-10 w-10 rounded border" />
                    <Input defaultValue="#60A5FA" placeholder="#60A5FA" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Background Color</Label>
                  <div className="flex items-center gap-3">
                    <input type="color" defaultValue="#FFFFFF" className="h-10 w-10 rounded border" />
                    <Input defaultValue="#FFFFFF" placeholder="#FFFFFF" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Switch defaultChecked />
                  <span>Auto-generate shades for hover/active states</span>
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>Font choices for your studio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Heading Font</Label>
                  <Select defaultValue="inter">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
              `,
<parameter=command>
cat > /h/scripts/lensflow/src/components/settings/SettingsPage.tsx