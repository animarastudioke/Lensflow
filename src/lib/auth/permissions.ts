export type UserRole = 'super_admin' | 'studio_owner' | 'photographer' | 'team_member' | 'editor' | 'client'

export type Permission =
  | 'studios:create'
  | 'studios:read'
  | 'studios:update'
  | 'studios:delete'
  | 'studios:manage_billing'
  | 'studios:manage_team'
  | 'team:read'
  | 'team:invite'
  | 'team:update_role'
  | 'team:remove'
  | 'clients:create'
  | 'clients:read'
  | 'clients:update'
  | 'clients:delete'
  | 'clients:export'
  | 'leads:create'
  | 'leads:read'
  | 'leads:update'
  | 'leads:delete'
  | 'leads:convert'
  | 'projects:create'
  | 'projects:read'
  | 'projects:update'
  | 'projects:delete'
  | 'projects:manage'
  | 'galleries:create'
  | 'galleries:read'
  | 'galleries:update'
  | 'galleries:delete'
  | 'galleries:share'
  | 'galleries:manage_settings'
  | 'albums:create'
  | 'albums:read'
  | 'albums:update'
  | 'albums:delete'
  | 'albums:reorder'
  | 'media:upload'
  | 'media:read'
  | 'media:update'
  | 'media:delete'
  | 'media:download'
  | 'media:manage_metadata'
  | 'media:batch_operations'
  | 'bookings:create'
  | 'bookings:read'
  | 'bookings:update'
  | 'bookings:delete'
  | 'bookings:manage_calendar'
  | 'bookings:manage_packages'
  | 'bookings:manage_availability'
  | 'calendar:read'
  | 'tasks:create'
  | 'tasks:read'
  | 'tasks:update'
  | 'tasks:delete'
  | 'expenses:create'
  | 'expenses:read'
  | 'expenses:update'
  | 'expenses:delete'
  | 'questionnaires:create'
  | 'questionnaires:read'
  | 'questionnaires:update'
  | 'questionnaires:delete'
  | 'questionnaires:send'
  | 'contracts:create'
  | 'contracts:read'
  | 'contracts:update'
  | 'contracts:delete'
  | 'contracts:send'
  | 'contracts:sign'
  | 'quotes:create'
  | 'quotes:read'
  | 'quotes:update'
  | 'quotes:delete'
  | 'quotes:send'
  | 'quotes:convert'
  | 'invoices:create'
  | 'invoices:read'
  | 'invoices:update'
  | 'invoices:delete'
  | 'invoices:send'
  | 'invoices:manage_payments'
  | 'payments:create'
  | 'payments:read'
  | 'payments:refund'
  | 'payments:manage_providers'
  | 'payouts:read'
  | 'subscriptions:read'
  | 'store:create'
  | 'store:read'
  | 'store:update'
  | 'store:delete'
  | 'store:manage_products'
  | 'store:manage_orders'
  | 'store:manage_coupons'
  | 'store:manage_gift_cards'
  | 'website:create'
  | 'website:read'
  | 'website:update'
  | 'website:delete'
  | 'website:publish'
  | 'website:manage_theme'
  | 'website:manage_pages'
  | 'analytics:read'
  | 'analytics:export'
  | 'reports:read'
  | 'reports:export'
  | 'notifications:create'
  | 'notifications:read'
  | 'notifications:manage'
  | 'settings:read'
  | 'settings:update'
  | 'settings:manage_billing'
  | 'settings:manage_integrations'
  | 'audit_logs:read'
  | 'audit_logs:export'

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'studios:create',
    'studios:read',
    'studios:update',
    'studios:delete',
    'studios:manage_billing',
    'studios:manage_team',
    'team:read',
    'team:invite',
    'team:update_role',
    'team:remove',
    'clients:create',
    'clients:read',
    'clients:update',
    'clients:delete',
    'clients:export',
    'leads:create',
    'leads:read',
    'leads:update',
    'leads:delete',
    'leads:convert',
    'projects:create',
    'projects:read',
    'projects:update',
    'projects:delete',
    'projects:manage',
    'galleries:create',
    'galleries:read',
    'galleries:update',
    'galleries:delete',
    'galleries:share',
    'galleries:manage_settings',
    'albums:create',
    'albums:read',
    'albums:update',
    'albums:delete',
    'albums:reorder',
    'media:upload',
    'media:read',
    'media:update',
    'media:delete',
    'media:download',
    'media:manage_metadata',
    'media:batch_operations',
    'bookings:create',
    'bookings:read',
    'bookings:update',
    'bookings:delete',
    'bookings:manage_calendar',
    'bookings:manage_packages',
    'bookings:manage_availability',
    'calendar:read',
    'tasks:create',
    'tasks:read',
    'tasks:update',
    'tasks:delete',
    'expenses:create',
    'expenses:read',
    'expenses:update',
    'expenses:delete',
    'questionnaires:create',
    'questionnaires:read',
    'questionnaires:update',
    'questionnaires:delete',
    'questionnaires:send',
    'contracts:create',
    'contracts:read',
    'contracts:update',
    'contracts:delete',
    'contracts:send',
    'contracts:sign',
    'quotes:create',
    'quotes:read',
    'quotes:update',
    'quotes:delete',
    'quotes:send',
    'quotes:convert',
    'invoices:create',
    'invoices:read',
    'invoices:update',
    'invoices:delete',
    'invoices:send',
    'invoices:manage_payments',
    'payments:create',
    'payments:read',
    'payments:refund',
    'payments:manage_providers',
    'payouts:read',
    'subscriptions:read',
    'store:create',
    'store:read',
    'store:update',
    'store:delete',
    'store:manage_products',
    'store:manage_orders',
    'store:manage_coupons',
    'store:manage_gift_cards',
    'website:create',
    'website:read',
    'website:update',
    'website:delete',
    'website:publish',
    'website:manage_theme',
    'website:manage_pages',
    'analytics:read',
    'analytics:export',
    'reports:read',
    'reports:export',
    'notifications:create',
    'notifications:read',
    'notifications:manage',
    'settings:read',
    'settings:update',
    'settings:manage_billing',
    'settings:manage_integrations',
    'audit_logs:read',
    'audit_logs:export',
  ],
  studio_owner: [
    'studios:read',
    'studios:update',
    'studios:manage_billing',
    'studios:manage_team',
    'team:read',
    'team:invite',
    'team:update_role',
    'team:remove',
    'clients:create',
    'clients:read',
    'clients:update',
    'clients:delete',
    'clients:export',
    'leads:create',
    'leads:read',
    'leads:update',
    'leads:delete',
    'leads:convert',
    'projects:create',
    'projects:read',
    'projects:update',
    'projects:delete',
    'projects:manage',
    'galleries:create',
    'galleries:read',
    'galleries:update',
    'galleries:delete',
    'galleries:share',
    'galleries:manage_settings',
    'albums:create',
    'albums:read',
    'albums:update',
    'albums:delete',
    'albums:reorder',
    'media:upload',
    'media:read',
    'media:update',
    'media:delete',
    'media:download',
    'media:manage_metadata',
    'media:batch_operations',
    'bookings:create',
    'bookings:read',
    'bookings:update',
    'bookings:delete',
    'bookings:manage_calendar',
    'bookings:manage_packages',
    'bookings:manage_availability',
    'calendar:read',
    'tasks:create',
    'tasks:read',
    'tasks:update',
    'tasks:delete',
    'expenses:create',
    'expenses:read',
    'expenses:update',
    'expenses:delete',
    'questionnaires:create',
    'questionnaires:read',
    'questionnaires:update',
    'questionnaires:delete',
    'questionnaires:send',
    'contracts:create',
    'contracts:read',
    'contracts:update',
    'contracts:delete',
    'contracts:send',
    'quotes:create',
    'quotes:read',
    'quotes:update',
    'quotes:delete',
    'quotes:send',
    'quotes:convert',
    'invoices:create',
    'invoices:read',
    'invoices:update',
    'invoices:delete',
    'invoices:send',
    'invoices:manage_payments',
    'payments:create',
    'payments:read',
    'payments:refund',
    'payouts:read',
    'subscriptions:read',
    'store:create',
    'store:read',
    'store:update',
    'store:delete',
    'store:manage_products',
    'store:manage_orders',
    'store:manage_coupons',
    'store:manage_gift_cards',
    'website:create',
    'website:read',
    'website:update',
    'website:delete',
    'website:publish',
    'website:manage_theme',
    'website:manage_pages',
    'analytics:read',
    'analytics:export',
    'reports:read',
    'reports:export',
    'notifications:create',
    'notifications:read',
    'notifications:manage',
    'settings:read',
    'settings:update',
    'settings:manage_billing',
    'settings:manage_integrations',
    'audit_logs:read',
    'audit_logs:export',
  ],
  photographer: [
    'team:read',
    'clients:create',
    'clients:read',
    'clients:update',
    'leads:create',
    'leads:read',
    'leads:update',
    'leads:convert',
    'projects:create',
    'projects:read',
    'projects:update',
    'galleries:create',
    'galleries:read',
    'galleries:update',
    'galleries:share',
    'albums:create',
    'albums:read',
    'albums:update',
    'albums:reorder',
    'media:upload',
    'media:read',
    'media:update',
    'media:delete',
    'media:manage_metadata',
    'media:batch_operations',
    'bookings:create',
    'bookings:read',
    'bookings:update',
    'calendar:read',
    'tasks:create',
    'tasks:read',
    'tasks:update',
    'tasks:delete',
    'expenses:create',
    'expenses:read',
    'expenses:update',
    'expenses:delete',
    'questionnaires:create',
    'questionnaires:read',
    'questionnaires:update',
    'questionnaires:send',
    'contracts:create',
    'contracts:read',
    'contracts:update',
    'contracts:send',
    'quotes:create',
    'quotes:read',
    'quotes:update',
    'quotes:send',
    'invoices:create',
    'invoices:read',
    'invoices:update',
    'invoices:send',
    'payments:create',
    'payments:read',
    'store:read',
    'store:manage_products',
    'store:manage_orders',
    'website:read',
    'analytics:read',
    'reports:read',
    'notifications:create',
    'notifications:read',
    'settings:read',
  ],
  team_member: [
    'team:read',
    'clients:read',
    'clients:update',
    'leads:read',
    'leads:update',
    'projects:read',
    'projects:update',
    'galleries:read',
    'galleries:update',
    'albums:read',
    'albums:update',
    'media:upload',
    'media:read',
    'media:update',
    'media:manage_metadata',
    'bookings:read',
    'bookings:update',
    'calendar:read',
    'tasks:read',
    'tasks:update',
    'expenses:read',
    'questionnaires:read',
    'contracts:read',
    'quotes:read',
    'invoices:read',
    'store:read',
    'website:read',
    'notifications:read',
    'settings:read',
  ],
  editor: [
    'galleries:read',
    'galleries:update',
    'albums:read',
    'albums:update',
    'albums:reorder',
    'media:upload',
    'media:read',
    'media:update',
    'media:delete',
    'media:manage_metadata',
    'media:batch_operations',
    'notifications:read',
    'settings:read',
  ],
  client: [
    'galleries:read',
    'media:read',
    'media:download',
    'contracts:read',
    'contracts:sign',
    'quotes:read',
    'invoices:read',
    'payments:create',
    'store:read',
    'website:read',
    'notifications:read',
  ],
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p))
}

export const USER_ROLES: UserRole[] = [
  'super_admin',
  'studio_owner',
  'photographer',
  'team_member',
  'editor',
  'client',
]

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  studio_owner: 'Studio Owner',
  photographer: 'Photographer',
  team_member: 'Team Member',
  editor: 'Editor',
  client: 'Client',
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: 'Full access to all studios and platform administration',
  studio_owner: 'Full access to studio, billing, team, and all features',
  photographer: 'Create and manage galleries, bookings, clients, and projects',
  team_member: 'Assigned galleries, uploads, and tasks',
  editor: 'Gallery editing and media management only',
  client: 'Access to own galleries, favorites, orders, and contracts',
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  studio_owner: 80,
  photographer: 60,
  team_member: 40,
  editor: 30,
  client: 10,
}

export function canManageRole(currentUserRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[currentUserRole] > ROLE_HIERARCHY[targetRole]
}