'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
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
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Search,
  Filter,
  User,
  Mail,
  Phone,
  Shield,
  Crown,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  MoreVertical,
  Invite,
  Settings,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  Key,
  Bell,
  Eye,
  EyeOff,
  Users,
  LayoutList,
  LayoutGrid,
  DollarSign,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface TeamMember {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'client_manager' | 'billing'
  status: 'active' | 'invited' | 'suspended'
  permissions: string[]
  lastActive: string
  joinedAt: string
  phone?: string
  department?: string
  notes?: string
}

const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Alexandra Chen',
    email: 'alex@animarastudio.com',
    avatar: '',
    role: 'owner',
    status: 'active',
    permissions: ['all'],
    lastActive: '2024-01-15T14:30:00Z',
    joinedAt: '2023-01-15T10:00:00Z',
    phone: '+1 (555) 100-0001',
    department: 'Management',
    notes: 'Studio founder and lead photographer',
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    email: 'marcus@animarastudio.com',
    avatar: '',
    role: 'admin',
    status: 'active',
    permissions: ['galleries', 'clients', 'bookings', 'projects', 'team', 'settings'],
    lastActive: '2024-01-15T13:15:00Z',
    joinedAt: '2023-03-20T09:00:00Z',
    phone: '+1 (555) 100-0002',
    department: 'Operations',
    notes: 'Studio manager, handles client relations',
  },
  {
    id: '3',
    name: 'Sarah Williams',
    email: 'sarah@animarastudio.com',
    avatar: '',
    role: 'editor',
    status: 'active',
    permissions: ['galleries', 'clients', 'projects'],
    lastActive: '2024-01-15T12:00:00Z',
    joinedAt: '2023-06-10T10:00:00Z',
    phone: '+1 (555) 100-0003',
    department: 'Photography',
    notes: 'Senior photographer, wedding specialist',
  },
  {
    id: '4',
    name: 'David Park',
    email: 'david@animarastudio.com',
    avatar: '',
    role: 'editor',
    status: 'active',
    permissions: ['galleries', 'projects'],
    lastActive: '2024-01-14T16:45:00Z',
    joinedAt: '2023-09-05T10:00:00Z',
    department: 'Photography',
    notes: 'Portrait and commercial photographer',
  },
  {
    id: '5',
    name: 'Emily Rodriguez',
    email: 'emily@animarastudio.com',
    avatar: '',
    role: 'client_manager',
    status: 'active',
    permissions: ['clients', 'bookings', 'contracts', 'invoices'],
    lastActive: '2024-01-15T11:30:00Z',
    joinedAt: '2023-11-12T10:00:00Z',
    phone: '+1 (555) 100-0005',
    department: 'Client Services',
    notes: 'Client coordinator and booking manager',
  },
  {
    id: '6',
    name: 'James Liu',
    email: 'james@freelance.com',
    avatar: '',
    role: 'editor',
    status: 'invited',
    permissions: ['galleries', 'projects'],
    lastActive: '',
    joinedAt: '2024-01-10T10:00:00Z',
    department: 'Photography',
    notes: 'Freelance photographer - pending invitation',
  },
  {
    id: '7',
    name: 'Lisa Thompson',
    email: 'lisa@animarastudio.com',
    avatar: '',
    role: 'viewer',
    status: 'suspended',
    permissions: ['galleries'],
    lastActive: '2023-12-01T10:00:00Z',
    joinedAt: '2023-08-01T10:00:00Z',
    department: 'Marketing',
    notes: 'Former marketing contractor',
  },
]

function getRoleBadge(role: TeamMember['role']) {
  const roleConfig = {
    owner: { label: 'Owner', className: 'bg-purple-100 text-purple-800', icon: Crown },
    admin: { label: 'Admin', className: 'bg-blue-100 text-blue-800', icon: Shield },
    editor: { label: 'Editor', className: 'bg-green-100 text-green-800', icon: Edit },
    viewer: { label: 'Viewer', className: 'bg-gray-100 text-gray-800', icon: Eye },
    client_manager: { label: 'Client Mgr', className: 'bg-orange-100 text-orange-800', icon: UserCheck },
    billing: { label: 'Billing', className: 'bg-yellow-100 text-yellow-800', icon: DollarSign },
  }
  const config = roleConfig[role]
  const Icon = config.icon
  return (
    <Badge className={cn(config.className, 'gap-1')}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

function getStatusBadge(status: TeamMember['status']) {
  const statusConfig = {
    active: { label: 'Active', className: 'bg-green-100 text-green-800', icon: CheckCircle },
    invited: { label: 'Invited', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
    suspended: { label: 'Suspended', className: 'bg-red-100 text-red-800', icon: XCircle },
  }
  const config = statusConfig[status]
  const Icon = config.icon
  return (
    <Badge className={cn(config.className, 'gap-1')}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

interface TeamListProps {
  studioSlug: string
  isLoading?: boolean
}

export function TeamList({ studioSlug, isLoading = false }: TeamListProps) {
  const router = useRouter()

  const [members, setMembers] = React.useState<TeamMember[]>(mockTeamMembers)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState<string>('all')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('table')
  const [selectedMembers, setSelectedMembers] = React.useState<string[]>([])
  const [isInviteDialogOpen, setIsInviteDialogOpen] = React.useState(false)
  const [inviteForm, setInviteForm] = React.useState({
    email: '',
    role: 'editor' as TeamMember['role'],
    message: '',
  })
  const [isSendingInvite, setIsSendingInvite] = React.useState(false)

  const filteredMembers = React.useMemo(() => {
    let result = [...members]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        m =>
          m.name.toLowerCase().includes(query) ||
          m.email.toLowerCase().includes(query) ||
          m.department?.toLowerCase().includes(query)
      )
    }

    if (roleFilter !== 'all') {
      result = result.filter(m => m.role === roleFilter)
    }

    if (statusFilter !== 'all') {
      result = result.filter(m => m.status === statusFilter)
    }

    return result
  }, [members, searchQuery, roleFilter, statusFilter])

  const handleInvite = async () => {
    if (!inviteForm.email) return
    setIsSendingInvite(true)
    await new Promise(resolve => setTimeout(resolve, 1000))

    const newMember: TeamMember = {
      id: String(Date.now()),
      name: inviteForm.email.split('@')[0],
      email: inviteForm.email,
      role: inviteForm.role,
      status: 'invited',
      permissions: [],
      lastActive: '',
      joinedAt: new Date().toISOString(),
      notes: inviteForm.message,
    }

    setMembers(prev => [...prev, newMember])
    setInviteForm({ email: '', role: 'editor', message: '' })
    setIsInviteDialogOpen(false)
    setIsSendingInvite(false)
  }

  const handleRoleChange = (memberId: string, newRole: TeamMember['role']) => {
    setMembers(prev =>
      prev.map(m =>
        m.id === memberId ? { ...m, role: newRole } : m
      )
    )
  }

  const handleStatusChange = (memberId: string, newStatus: TeamMember['status']) => {
    setMembers(prev =>
      prev.map(m =>
        m.id === memberId ? { ...m, status: newStatus } : m
      )
    )
  }

  const handleRemove = (memberId: string) => {
    if (confirm('Are you sure you want to remove this team member?')) {
      setMembers(prev => prev.filter(m => m.id !== memberId))
      setSelectedMembers(prev => prev.filter(g => g !== memberId))
    }
  }

  const handleResendInvite = (memberId: string) => {
    // Resend invitation logic
    console.log('Resend invite to', memberId)
  }

  const toggleSelect = (id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedMembers.length === filteredMembers.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(filteredMembers.map(m => m.id))
    }
  }

  const roles: TeamMember['role'][] = ['admin', 'editor', 'client_manager', 'viewer', 'billing']

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="animate-pulse">
          <div className="h-12 bg-muted rounded-lg" />
          <div className="space-y-3 mt-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const activeCount = members.filter(m => m.status === 'active').length
  const invitedCount = members.filter(m => m.status === 'invited').length
  const suspendedCount = members.filter(m => m.status === 'suspended').length

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold">{members.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-success">{activeCount}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Invited</p>
                <p className="text-2xl font-bold text-warning">{invitedCount}</p>
              </div>
              <Send className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Suspended</p>
                <p className="text-2xl font-bold text-destructive">{suspendedCount}</p>
              </div>
              <UserX className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-sm font-display font-bold text-foreground">Team Members</h1>
          <p className="text-body text-muted-foreground mt-1">Manage studio team and permissions</p>
        </div>
        <Button onClick={() => setIsInviteDialogOpen(true)}>
          <Invite className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* View Toggle & Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <LayoutList className="h-4 w-4 mr-2" />
                List
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Grid
              </Button>
            </div>

            <div className="flex-1" />

            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search team members..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="client_manager">Client Manager</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedMembers.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  selectedMembers.forEach(id => handleStatusChange(id, 'active'))
                  setSelectedMembers([])
                }}>
                  <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                  Activate
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  selectedMembers.forEach(id => handleStatusChange(id, 'suspended'))
                  setSelectedMembers([])
                }}>
                  <UserX className="h-3.5 w-3.5 mr-1.5" />
                  Suspend
                </Button>
                <Button variant="destructive" size="sm" onClick={() => {
                  if (confirm(`Remove ${selectedMembers.length} member(s)?`)) {
                    selectedMembers.forEach(id => handleRemove(id))
                    setSelectedMembers([])
                  }
                }}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Remove
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Content */}
      {viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedMembers.length === filteredMembers.length && filteredMembers.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-input"
                    />
                  </TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Department</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Active</TableHead>
                  <TableHead className="hidden xl:table-cell">Joined</TableHead>
                  <TableHead className="w-56">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No team members found</p>
                      <Button className="mt-4" onClick={() => setIsInviteDialogOpen(true)}>
                        <Invite className="h-4 w-4 mr-2" />
                        Invite Your First Member
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id} className="hover:bg-muted/50">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => toggleSelect(member.id)}
                          className="rounded border-input"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.avatar || ''} alt={member.name} />
                            <AvatarFallback className="text-sm">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[200px]">{member.name}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">{member.email}</p>
                          </div>
                          {member.role === 'owner' && (
                            <Crown className="h-4 w-4 text-yellow-500 ml-1" title="Owner" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={member.role}
                          onValueChange={value => handleRoleChange(member.id, value as TeamMember['role'])}
                          disabled={member.role === 'owner'}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map(role => (
                              <SelectItem key={role} value={role}>
                                {role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(member.status)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {member.department || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {member.lastActive ? (
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(member.lastActive), { addSuffix: true })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                        {format(new Date(member.joinedAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/${studioSlug}/team/${member.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Profile
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/${studioSlug}/team/${member.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'admin')}>
                              <Shield className="mr-2 h-4 w-4" />
                              Make Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'editor')}>
                              <Edit className="mr-2 h-4 w-4" />
                              Make Editor
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'viewer')}>
                              <EyeOff className="mr-2 h-4 w-4" />
                              Make Viewer
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {member.status === 'invited' && (
                              <>
                                <DropdownMenuItem onClick={() => handleResendInvite(member.id)}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Resend Invitation
                                </DropdownMenuItem>
                              </>
                            )}
                            {member.status === 'active' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(member.id, 'suspended')}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <UserX className="mr-2 h-4 w-4" />
                                  Suspend
                                </DropdownMenuItem>
                              </>
                            )}
                            {member.status === 'suspended' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(member.id, 'active')}
                                >
                                  <UserCheck className="mr-2 h-4 w-4 text-green-600" />
                                  Reactivate
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            {member.role !== 'owner' && (
                              <DropdownMenuItem
                                onClick={() => handleRemove(member.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove from Team
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        // Grid View
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredMembers.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No team members found</p>
              <Button className="mt-4" onClick={() => setIsInviteDialogOpen(true)}>
                <Invite className="h-4 w-4 mr-2" />
                Invite Your First Member
              </Button>
            </div>
          ) : (
            filteredMembers.map((member) => (
              <Card key={member.id} className="card-hover">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => toggleSelect(member.id)}
                      className="rounded border-input mt-1"
                    />
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={member.avatar || ''} alt={member.name} />
                      <AvatarFallback className="text-base">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{member.name}</h3>
                        {member.role === 'owner' && (
                          <Crown className="h-4 w-4 text-yellow-500" title="Owner" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                      {member.department && (
                        <p className="text-xs text-muted-foreground">{member.department}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      {getRoleBadge(member.role)}
                      {getStatusBadge(member.status)}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/${studioSlug}/team/${member.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {member.status === 'invited' && (
                          <DropdownMenuItem onClick={() => handleResendInvite(member.id)}>
                            <Send className="mr-2 h-4 w-4" />
                            Resend Invitation
                          </DropdownMenuItem>
                        )}
                        {member.status === 'active' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(member.id, 'suspended')}
                            className="text-destructive focus:text-destructive"
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Suspend
                          </DropdownMenuItem>
                        )}
                        {member.status === 'suspended' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(member.id, 'active')}
                          >
                            <UserCheck className="mr-2 h-4 w-4 text-green-600" />
                            Reactivate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {member.role !== 'owner' && (
                          <DropdownMenuItem
                            onClick={() => handleRemove(member.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove from Team
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredMembers.length} of {members.length} members
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm" disabled>Next</Button>
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="colleague@studio.com"
                value={inviteForm.email}
                onChange={e => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={value => setInviteForm(prev => ({ ...prev, role: value as TeamMember['role'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="client_manager">Client Manager</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Permissions Preview</Label>
              <div className="flex flex-wrap gap-1">
                {(() => {
                  const rolePermissions: Record<TeamMember['role'], string[]> = {
                    owner: ['All permissions'],
                    admin: ['Galleries', 'Clients', 'Bookings', 'Projects', 'Team', 'Settings'],
                    editor: ['Galleries', 'Clients', 'Projects'],
                    client_manager: ['Clients', 'Bookings', 'Contracts', 'Invoices'],
                    viewer: ['Galleries (read-only)'],
                    billing: ['Invoices', 'Payments', 'Billing Settings'],
                  }
                  return rolePermissions[inviteForm.role].map((perm) => (
                    <Badge key={perm} variant="outline" className="text-xs">
                      {perm}
                    </Badge>
                  ))
                })()}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Personal Message (Optional)</Label>
              <Textarea
                placeholder="Add a personal message to the invitation..."
                value={inviteForm.message}
                onChange={e => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={isSendingInvite || !inviteForm.email}>
              {isSendingInvite ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

