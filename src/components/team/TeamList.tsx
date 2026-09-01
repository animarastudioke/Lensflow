'use client'

import * as React from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  Crown,
  Camera,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  MoreVertical,
  UserPlus as Invite,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  Users,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { ConfirmDialog } from '@/components/layout/ConfirmDialog'
import { toast } from 'sonner'
import {
  inviteTeamMember,
  removeTeamMember,
  resendTeamInvite,
  updateTeamMemberRole,
  updateTeamMemberStatus,
  type TeamMemberRow,
  type TeamRole,
} from '@/lib/actions/team'

const ROLE_CONFIG: Record<TeamMemberRow['role'], { label: string; variant: 'default' | 'secondary' | 'outline'; icon: typeof Crown }> = {
  studio_owner: { label: 'Owner', variant: 'default', icon: Crown },
  photographer: { label: 'Photographer', variant: 'secondary', icon: Camera },
  team_member: { label: 'Team Member', variant: 'outline', icon: Users },
  editor: { label: 'Editor', variant: 'outline', icon: Edit },
}

const ASSIGNABLE_ROLES: TeamRole[] = ['photographer', 'team_member', 'editor']

function getStatusBadge(status: TeamMemberRow['status']) {
  const config = {
    active: { label: 'Active', variant: 'success' as const, icon: CheckCircle },
    invited: { label: 'Invited', variant: 'warning' as const, icon: Clock },
    suspended: { label: 'Suspended', variant: 'destructive' as const, icon: XCircle },
  }[status]
  const Icon = config.icon
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase() || '?'
}

interface TeamListProps {
  studioSlug: string
  initialMembers: TeamMemberRow[]
  canManage: boolean
}

export function TeamList({ studioSlug, initialMembers, canManage }: TeamListProps) {
  const [members, setMembers] = React.useState(initialMembers)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [isInviteDialogOpen, setIsInviteDialogOpen] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [inviteRole, setInviteRole] = React.useState<TeamRole>('photographer')
  const [isSendingInvite, setIsSendingInvite] = React.useState(false)
  const [inviteError, setInviteError] = React.useState<string | null>(null)
  const [removeConfirm, setRemoveConfirm] = React.useState<string | null>(null)
  const [pendingActionId, setPendingActionId] = React.useState<string | null>(null)

  const filteredMembers = React.useMemo(() => {
    let result = members
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (m) => `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') {
      result = result.filter((m) => m.status === statusFilter)
    }
    return result
  }, [members, searchQuery, statusFilter])

  async function handleInvite() {
    if (!inviteEmail) return
    setIsSendingInvite(true)
    setInviteError(null)

    const formData = new FormData()
    formData.set('email', inviteEmail)
    formData.set('role', inviteRole)
    const result = await inviteTeamMember(studioSlug, formData)

    if ('error' in result) {
      setInviteError(result.error)
      toast.error(result.error)
      setIsSendingInvite(false)
      return
    }

    toast.success(`Invitation sent to ${inviteEmail}`)
    setInviteEmail('')
    setInviteRole('photographer')
    setIsInviteDialogOpen(false)
    setIsSendingInvite(false)
    window.location.reload()
  }

  async function handleRoleChange(memberId: string, role: TeamRole) {
    setPendingActionId(memberId)
    const result = await updateTeamMemberRole(memberId, role, studioSlug)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)))
      toast.success('Role updated')
    }
    setPendingActionId(null)
  }

  async function handleStatusChange(memberId: string, status: 'active' | 'suspended') {
    setPendingActionId(memberId)
    const result = await updateTeamMemberStatus(memberId, status, studioSlug)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, status } : m)))
      toast.success(status === 'active' ? 'Member reactivated' : 'Member suspended')
    }
    setPendingActionId(null)
  }

  async function handleResend(memberId: string) {
    setPendingActionId(memberId)
    const result = await resendTeamInvite(memberId, studioSlug)
    if ('error' in result) toast.error(result.error)
    else toast.success('Invitation resent')
    setPendingActionId(null)
  }

  async function confirmRemove(memberId: string) {
    const result = await removeTeamMember(memberId, studioSlug)
    if ('error' in result) {
      toast.error(result.error)
      throw new Error(result.error)
    }
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
    toast.success('Team member removed')
  }

  const activeCount = members.filter((m) => m.status === 'active').length
  const invitedCount = members.filter((m) => m.status === 'invited').length
  const suspendedCount = members.filter((m) => m.status === 'suspended').length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border border border-border">
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Total members</span>
            <Users className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-foreground tabular-nums">{members.length}</div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Active</span>
            <Activity className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-success tabular-nums">{activeCount}</div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Invited</span>
            <Send className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-warning tabular-nums">{invitedCount}</div>
        </div>
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="label-caption">Suspended</span>
            <UserX className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="mt-2 font-mono text-2xl font-medium text-destructive tabular-nums">{suspendedCount}</div>
        </div>
      </div>

      <PageHeader
        title="Team Members"
        description="Manage studio team and permissions"
        actions={
          canManage ? (
            <Button onClick={() => setIsInviteDialogOpen(true)}>
              <Invite className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Invited</TableHead>
                <TableHead className="hidden xl:table-cell">Joined</TableHead>
                {canManage && <TableHead className="w-16">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No team members found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => {
                  const name = `${member.firstName} ${member.lastName}`.trim() || member.email
                  const roleConfig = ROLE_CONFIG[member.role]
                  const RoleIcon = roleConfig.icon
                  const isPending = pendingActionId === member.id
                  return (
                    <TableRow key={member.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.avatarUrl ?? ''} alt={name} />
                            <AvatarFallback className="text-sm">{getInitials(name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[200px]">{name}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {canManage && !member.isOwner ? (
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleRoleChange(member.id, value as TeamRole)}
                            disabled={isPending}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ASSIGNABLE_ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {ROLE_CONFIG[role].label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={roleConfig.variant} className="gap-1">
                            <RoleIcon className="h-3 w-3" />
                            {roleConfig.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(member.status)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(member.invitedAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                        {member.joinedAt ? format(new Date(member.joinedAt), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          {!member.isOwner && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isPending}>
                                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {member.status === 'invited' && (
                                  <DropdownMenuItem onClick={() => handleResend(member.id)}>
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
                                  <DropdownMenuItem onClick={() => handleStatusChange(member.id, 'active')}>
                                    <UserCheck className="mr-2 h-4 w-4 text-success" />
                                    Reactivate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setRemoveConfirm(member.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove from Team
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>They&apos;ll get a real email invitation to join this studio.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="colleague@studio.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as TeamRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_CONFIG[role].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={isSendingInvite || !inviteEmail}>
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

      <ConfirmDialog
        open={!!removeConfirm}
        onOpenChange={(open) => !open && setRemoveConfirm(null)}
        title="Remove team member"
        description="They'll lose access to this studio immediately. This doesn't delete their LensFlow account."
        confirmLabel="Remove"
        destructive
        onConfirm={async () => { if (removeConfirm) await confirmRemove(removeConfirm) }}
      />
    </div>
  )
}
