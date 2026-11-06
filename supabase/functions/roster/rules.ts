export const ROLES = [
  "OWNER",
  "SUPER_ADMIN",
  "COMPANY_ADMIN",
  "BRANCH_MANAGER",
  "TEAM_LEADER",
  "EMPLOYEE",
] as const;

export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = {
  OWNER: 60,
  SUPER_ADMIN: 50,
  COMPANY_ADMIN: 40,
  BRANCH_MANAGER: 30,
  TEAM_LEADER: 20,
  EMPLOYEE: 10,
};

const ASSIGNABLE_ROLES = ROLES.filter((role) => role !== "OWNER");

export interface Placement {
  role: Role;
  companyId: string | null;
  branchId: string | null;
  teamId: string | null;
}

export function parseAssignableRole(raw: string): Role | null {
  const text = raw.trim().toLowerCase();
  const arabicRoles: Record<string, Role> = {
    "مدير النظام": "SUPER_ADMIN",
    "مدير المنصة": "SUPER_ADMIN",
    "مدير الشركة": "COMPANY_ADMIN",
    "مدير فرع": "BRANCH_MANAGER",
    "قائد فريق": "TEAM_LEADER",
    "موظف": "EMPLOYEE",
    "موظف مبيعات": "EMPLOYEE",
  };
  return arabicRoles[raw.trim()] ?? ASSIGNABLE_ROLES.find((role) => role.toLowerCase().replace(/_/g, " ") === text) ?? null;
}

export function assignableRolesBelow(actor: Role): Role[] {
  return ASSIGNABLE_ROLES.filter((role) => RANK[role] < RANK[actor]);
}

export function isPlatformRole(role: Role): boolean {
  return role === "OWNER" || role === "SUPER_ADMIN";
}

export function canManage(actor: Placement, target: Placement): boolean {
  if (RANK[actor.role] <= RANK[target.role]) return false;
  if (isPlatformRole(actor.role)) return true;
  if (actor.role === "COMPANY_ADMIN") return actor.companyId !== null && actor.companyId === target.companyId;
  if (actor.role === "BRANCH_MANAGER") return actor.branchId !== null && actor.branchId === target.branchId;
  if (actor.role === "TEAM_LEADER") return actor.teamId !== null && actor.teamId === target.teamId;
  return false;
}

export function placementError(p: Placement): string | null {
  if (isPlatformRole(p.role)) return null;
  if (!p.companyId) return "company_required";
  if (p.role === "COMPANY_ADMIN") return null;
  if (!p.branchId) return "branch_required";
  if (p.role === "TEAM_LEADER" && !p.teamId) return "team_required";
  return null;
}
