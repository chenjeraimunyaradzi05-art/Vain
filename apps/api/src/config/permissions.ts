/**
 * Permissions Configuration (Step 21)
 * 
 * Defines granular permissions for role-based access control (RBAC).
 * Permissions follow the format: resource:action
 */

/**
 * All available permissions in the system
 */
export const Permissions = {
  // Job Management
  'job:create': 'Create job listings',
  'job:read': 'View job listings',
  'job:update': 'Update job listings',
  'job:delete': 'Delete job listings',
  'job:publish': 'Publish job listings',
  'job:unpublish': 'Unpublish job listings',
  
  // User/Member Management
  'user:read': 'View user profiles',
  'user:update': 'Update user profiles',
  'user:delete': 'Delete user accounts',
  'user:list': 'List all users',
  'user:impersonate': 'Impersonate other users (admin)',
  
  // Company Management
  'company:create': 'Create company profiles',
  'company:read': 'View company profiles',
  'company:update': 'Update company profiles',
  'company:delete': 'Delete company profiles',
  'company:verify': 'Verify company profiles (admin)',
  
  // Application Management
  'application:create': 'Submit job applications',
  'application:read': 'View applications',
  'application:update': 'Update application status',
  'application:delete': 'Delete applications',
  
  // Mentorship
  'mentor:register': 'Register as mentor',
  'mentor:manage': 'Manage mentorship sessions',
  'mentee:connect': 'Connect with mentors',
  
  // Analytics
  'analytics:view_own': 'View own analytics',
  'analytics:view_company': 'View company analytics',
  'analytics:view_all': 'View platform analytics (admin)',
  'analytics:export': 'Export analytics data',
  
  // Content Management
  'content:create': 'Create content (posts, articles)',
  'content:moderate': 'Moderate user content',
  'content:delete': 'Delete any content',
  
  // Admin Features
  'admin:access': 'Access admin panel',
  'admin:users': 'Manage all users',
  'admin:settings': 'Modify system settings',
  'admin:audit': 'View audit logs',
  'admin:impersonate': 'Impersonate users',
  
  // API Management
  'api:keys': 'Manage API keys',
  'api:webhooks': 'Manage webhooks',
  
  // Data Management
  'data:export': 'Export personal data',
  'data:import': 'Bulk import data',
  'data:delete_all': 'Delete all account data',
} as const;

export type Permission = keyof typeof Permissions;

/**
 * Role definitions with their associated permissions (Step 23)
 */
export const RolePermissions: Record<string, Permission[]> = {
  // Regular job seekers
  MEMBER: [
    'job:read',
    'user:read',
    'user:update', // Own profile only (enforced by ownership check)
    'company:read',
    'application:create',
    'application:read', // Own applications only
    'mentee:connect',
    'analytics:view_own',
    'content:create',
    'data:export',
  ],
  
  // Employers/Companies
  COMPANY: [
    'job:create',
    'job:read',
    'job:update', // Own jobs only
    'job:delete', // Own jobs only
    'job:publish',
    'job:unpublish',
    'user:read',
    'company:read',
    'company:update', // Own company only
    'application:read', // For their jobs
    'application:update', // For their jobs
    'analytics:view_own',
    'analytics:view_company',
    'content:create',
    'data:export',
    'api:keys',
    'api:webhooks',
  ],
  
  // Government/Institutional users
  GOVERNMENT: [
    'job:read',
    'user:read',
    'company:read',
    'analytics:view_own',
    'analytics:view_company',
    'analytics:export',
    'data:export',
  ],
  
  // Educational institutions
  INSTITUTION: [
    'job:read',
    'user:read',
    'company:read',
    'mentor:register',
    'mentor:manage',
    'analytics:view_own',
    'content:create',
    'data:export',
  ],
  
  // FIFO workers (specialized member)
  FIFO: [
    'job:read',
    'user:read',
    'user:update',
    'company:read',
    'application:create',
    'application:read',
    'analytics:view_own',
    'content:create',
    'data:export',
  ],
  
  // Mentors
  MENTOR: [
    'job:read',
    'user:read',
    'user:update',
    'company:read',
    'mentor:register',
    'mentor:manage',
    'analytics:view_own',
    'content:create',
    'data:export',
  ],
  
  // TAFE/Training providers
  TAFE: [
    'job:read',
    'user:read',
    'company:read',
    'mentor:register',
    'mentor:manage',
    'analytics:view_own',
    'analytics:view_company',
    'content:create',
    'data:export',
  ],
  
  // Platform administrators
  ADMIN: [
    // Admin has all permissions
    ...Object.keys(Permissions) as Permission[],
  ],
  
  // Super admin (platform owner)
  SUPER_ADMIN: [
    ...Object.keys(Permissions) as Permission[],
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = RolePermissions[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: string): Permission[] {
  return RolePermissions[role] || [];
}

/**
 * Check if a permission requires ownership validation
 * These permissions are granted but require additional ownership checks
 */
export const OwnershipRequiredPermissions: Permission[] = [
  'user:update',
  'job:update',
  'job:delete',
  'job:publish',
  'job:unpublish',
  'company:update',
  'application:read',
  'application:update',
];

export function requiresOwnershipCheck(permission: Permission): boolean {
  return OwnershipRequiredPermissions.includes(permission);
}

export {};
