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
        </TabsContent>
      </Tabs>
    </div>
  )
}