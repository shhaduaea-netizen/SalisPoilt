import type { Role, SessionUser } from '@/shared/types/domain';

/**
 * Scope a role has for an action:
 * - platform: cross-tenant (Super Admin only)
 * - company: every record in the user's company
 * - branch: records whose branch is one of the user's branches
 * - team: records belonging to the user's team
 * - self: the user's own records
 */
export type PermissionScope = 'platform' | 'company' | 'branch' | 'team' | 'self';

export const ACTIONS = [
  'platform.manage_companies',
  'platform.view_metrics',
  'platform.impersonate',
  'platform.view_audit',
  'dashboard.view',
  'company.settings.manage',
  'settings.view',
  'roles.view',
  'roles.manage',
  'branch.view',
  'branch.manage',
  'team.view',
  'team.manage',
  'employee.view',
  'employee.manage',
  'sale.view',
  'sale.create',
  'sale.edit',
  'sale.edit_approved',
  'sale.approve',
  'sale.import',
  'sale.import_approve',
  'target.view',
  'target.manage',
  'target.propose',
  'commission.view',
  'commission.approve',
  'report.view',
  'leaderboard.view',
  'customer.manage',
  'product.manage',
  'audit.view',
  'notification.view',
  'account.manage',
  'password.approve',
] as const;
export type Action = (typeof ACTIONS)[number];

export interface PermissionResource {
  companyId?: string;
  branchId?: string;
  teamId?: string | null;
  employeeId?: string;
}

type Matrix = Record<Action, Partial<Record<Role, PermissionScope>>>;

const TENANT_ROLES_ALL: Partial<Record<Role, PermissionScope>> = {
  COMPANY_ADMIN: 'company',
  BRANCH_MANAGER: 'branch',
  TEAM_LEADER: 'team',
  EMPLOYEE: 'self',
};

const ADMIN_AND_BRANCH: Partial<Record<Role, PermissionScope>> = {
  COMPANY_ADMIN: 'company',
  BRANCH_MANAGER: 'branch',
};

const COMPANY_ADMIN_ONLY: Partial<Record<Role, PermissionScope>> = {
  COMPANY_ADMIN: 'company',
};

const SUPER_ADMIN_ONLY: Partial<Record<Role, PermissionScope>> = {
  SUPER_ADMIN: 'platform',
};

/**
 * Single source of truth for who may do what. Screens never compare roles directly.
 */
export const PERMISSION_MATRIX: Matrix = {
  'platform.manage_companies': SUPER_ADMIN_ONLY,
  'platform.view_metrics': SUPER_ADMIN_ONLY,
  'platform.impersonate': SUPER_ADMIN_ONLY,
  'platform.view_audit': SUPER_ADMIN_ONLY,

  'dashboard.view': { ...TENANT_ROLES_ALL, SUPER_ADMIN: 'platform' },
  'company.settings.manage': COMPANY_ADMIN_ONLY,
  'settings.view': { ...TENANT_ROLES_ALL },
  'roles.view': { ...TENANT_ROLES_ALL },
  'roles.manage': COMPANY_ADMIN_ONLY,

  'branch.view': { COMPANY_ADMIN: 'company', BRANCH_MANAGER: 'branch' },
  'branch.manage': COMPANY_ADMIN_ONLY,

  'team.view': { COMPANY_ADMIN: 'company', BRANCH_MANAGER: 'branch', TEAM_LEADER: 'team' },
  'team.manage': ADMIN_AND_BRANCH,

  'employee.view': { ...TENANT_ROLES_ALL },
  'employee.manage': ADMIN_AND_BRANCH,

  'sale.view': { ...TENANT_ROLES_ALL },
  'sale.create': { ...TENANT_ROLES_ALL },
  'sale.edit': { COMPANY_ADMIN: 'company', BRANCH_MANAGER: 'branch', TEAM_LEADER: 'team' },
  'sale.edit_approved': ADMIN_AND_BRANCH,
  'sale.approve': ADMIN_AND_BRANCH,
  'sale.import': ADMIN_AND_BRANCH,
  'sale.import_approve': ADMIN_AND_BRANCH,

  'target.view': { ...TENANT_ROLES_ALL },
  'target.manage': ADMIN_AND_BRANCH,
  'target.propose': { TEAM_LEADER: 'team' },

  'commission.view': { ...TENANT_ROLES_ALL },
  'commission.approve': ADMIN_AND_BRANCH,

  'report.view': { COMPANY_ADMIN: 'company', BRANCH_MANAGER: 'branch', TEAM_LEADER: 'team' },
  'leaderboard.view': { ...TENANT_ROLES_ALL },

  'customer.manage': { COMPANY_ADMIN: 'company', BRANCH_MANAGER: 'branch', TEAM_LEADER: 'team' },
  'product.manage': COMPANY_ADMIN_ONLY,

  'audit.view': COMPANY_ADMIN_ONLY,
  'notification.view': { ...TENANT_ROLES_ALL },
  'account.manage': { ...TENANT_ROLES_ALL, SUPER_ADMIN: 'platform' },
  'password.approve': COMPANY_ADMIN_ONLY,
};

function matchesScope(user: SessionUser, scope: PermissionScope, resource: PermissionResource | undefined): boolean {
  if (scope === 'platform') return true;
  if (!user.companyId) return false;

  if (resource?.companyId !== undefined && resource.companyId !== user.companyId) return false;

  switch (scope) {
    case 'company':
      return true;
    case 'branch':
      return resource?.branchId === undefined || user.branchIds.includes(resource.branchId);
    case 'team':
      return resource?.teamId === undefined || (user.teamId !== null && resource.teamId === user.teamId);
    case 'self':
      return resource?.employeeId === undefined || resource.employeeId === user.id;
  }
}

function customRankAllows(user: SessionUser, action: Action): boolean {
  const permissions = user.customRankPermissions ?? [];
  if (permissions.includes(action)) return true;
  if (action === 'employee.view' && permissions.some((permission) => permission.startsWith('employee.'))) return true;
  if (action === 'employee.manage' && permissions.some((permission) => ['employee.promote', 'employee.suspend', 'employee.revoke', 'employee.transfer'].includes(permission))) return true;
  if (action === 'sale.import' && permissions.includes('employee.import')) return true;
  if (action === 'target.manage' && permissions.includes('target.import')) return true;
  if (action === 'report.view' && permissions.includes('performance.review')) return true;
  return false;
}

export function can(user: SessionUser | null | undefined, action: Action, resource?: PermissionResource): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN' || customRankAllows(user, action)) return true;
  const scope = PERMISSION_MATRIX[action][user.role];
  if (!scope) return false;
  return matchesScope(user, scope, resource);
}
