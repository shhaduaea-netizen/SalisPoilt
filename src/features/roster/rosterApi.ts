import { currentIdToken } from '@/shared/auth/firebase';

export const ROLE_CODES = [
  'OWNER',
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'BRANCH_MANAGER',
  'TEAM_LEADER',
  'EMPLOYEE',
] as const;

export type RosterRole = (typeof ROLE_CODES)[number];
export type RosterStatus = 'Active' | 'Suspended';

export interface RosterMember {
  id: string;
  email: string;
  fullNameEn: string;
  fullNameAr: string | null;
  userId: string;
  phone: string | null;
  rosterOrder: number | null;
  role: RosterRole;
  status: RosterStatus;
  mustChangePassword: boolean;
  companyId: string | null;
  companyName: string | null;
  branchId: string | null;
  branchName: string | null;
  teamId: string | null;
  teamName: string | null;
  customRankId: string | null;
  customRankName: string | null;
  customRankPermissions: string[];
  canManage: boolean;
}

export interface RosterLookups {
  companies: { id: string; name: string; trade_license?: string | null }[];
  branches: { id: string; company_id: string; name: string }[];
  teams: { id: string; branch_id: string; name: string }[];
}

export interface RosterListResponse {
  members: RosterMember[];
  lookups: RosterLookups;
  assignableRoles: RosterRole[];
}

export interface ProfileFields {
  fullNameEn: string;
  fullNameAr: string | null;
  phone: string | null;
}

export interface RosterMemberFields {
  fullNameEn: string;
  fullNameAr: string | null;
  role: RosterRole;
  status: RosterStatus;
  companyId: string | null;
  branchId: string | null;
  teamId: string | null;
  customRankId?: string | null;
}

export interface RosterImportRow {
  line: number;
  fullNameEn: string;
  fullNameAr: string | null;
  role: string;
  company: string | null;
  branch: string | null;
  team: string | null;
  userId: string;
  email: string;
  status: RosterStatus;
  password?: string;
  customRankId?: string | null;
}

export interface RosterValidationIssue {
  line: number;
  code: string;
}

export interface RosterImportPreview {
  toCreate: number;
  toUpdate: number;
}

export interface RosterImportResult {
  created: number;
  updated: number;
}

export class RosterError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, details: unknown = null) {
    super(code);
    this.name = 'RosterError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const ROSTER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/roster`;

async function callRoster<T>(body: Record<string, unknown>): Promise<T> {
  const token = await currentIdToken();
  const response = await fetch(ROSTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => null);
  const failure = (typeof payload === 'object' && payload !== null ? payload : {}) as {
    error?: unknown;
    details?: unknown;
  };
  if (!response.ok) {
    const code = typeof failure.error === 'string' ? failure.error : 'request_failed';
    throw new RosterError(response.status, code, failure.details ?? null);
  }
  if (typeof payload !== 'object' || payload === null) throw new RosterError(response.status, 'invalid_response');
  return payload as T;
}

export async function fetchCurrentMember(): Promise<RosterMember> {
  const { member } = await callRoster<{ member: RosterMember }>({ action: 'me' });
  return member;
}

export async function updateProfile(fields: ProfileFields): Promise<RosterMember> {
  const { member } = await callRoster<{ member: RosterMember }>({ action: 'profile', fields });
  return member;
}

export async function acknowledgePasswordChange(): Promise<void> {
  await callRoster<{ ok: true }>({ action: 'passwordChanged' });
}

export async function fetchRoster(): Promise<RosterListResponse> {
  const response = await callRoster<RosterListResponse>({ action: 'list' });
  if (!Array.isArray(response.members) || !Array.isArray(response.assignableRoles)) {
    throw new RosterError(200, 'invalid_response');
  }
  return response;
}

export async function createRosterCompany(name: string): Promise<{ id: string; name: string }> {
  const response = await callRoster<{ company: { id: string; name: string } }>({ action: 'createCompany', name });
  return response.company;
}

export interface CreateCompanyWithAdminInput {
  companyName: string;
  tradeLicense?: string | null;
  adminName: string;
  adminNameAr?: string | null;
  adminEmail: string;
  adminPassword: string;
}

export interface CreateCompanyWithAdminResult {
  company: { id: string; name: string; trade_license: string | null };
  admin: { email: string; userId: string };
}

export async function createCompanyWithAdmin(input: CreateCompanyWithAdminInput): Promise<CreateCompanyWithAdminResult> {
  return callRoster<CreateCompanyWithAdminResult>({ action: 'createCompanyWithAdmin', ...input });
}

export async function updateRosterMember(id: string, fields: RosterMemberFields): Promise<void> {
  await callRoster<{ member: RosterMember }>({ action: 'update', id, fields });
}

export async function removeRosterMember(id: string): Promise<void> {
  await callRoster<{ ok: true }>({ action: 'remove', id });
}

export async function resetMemberPassword(id: string, email: string, newPassword: string): Promise<void> {
  await callRoster<{ ok: true }>({ action: 'resetPassword', id, email, newPassword });
}

// ── Branches ──────────────────────────────────────────────────
export async function createBranch(name: string, companyId?: string): Promise<{ id: string; company_id: string; name: string }> {
  const { branch } = await callRoster<{ branch: { id: string; company_id: string; name: string } }>({ action: 'createBranch', name, companyId });
  return branch;
}

export async function updateBranch(id: string, name: string): Promise<void> {
  await callRoster<{ ok: true }>({ action: 'updateBranch', id, name });
}

export async function deleteBranch(id: string): Promise<void> {
  await callRoster<{ ok: true }>({ action: 'deleteBranch', id });
}

// ── Custom Ranks ──────────────────────────────────────────────
export interface CustomRank {
  id: string;
  companyId: string;
  name: string;
  nameAr: string | null;
  scope: 'company' | 'branch' | 'specific';
  permissions: string[];
  memberIds: string[];
  createdAt: string;
}

export const RANK_PERMISSIONS = [
  'branch.manage',
  'employee.import',
  'target.import',
  'sale.create',
  'sale.approve',
  'employee.promote',
  'employee.suspend',
  'employee.revoke',
  'employee.transfer',
  'password.approve',
  'performance.review',
] as const;
export type RankPermission = (typeof RANK_PERMISSIONS)[number];

export async function listRanks(): Promise<{ ranks: CustomRank[] }> {
  return callRoster<{ ranks: CustomRank[] }>({ action: 'listRanks' });
}

export async function createRank(input: {
  name: string;
  nameAr?: string | null;
  permissions: string[];
  scope?: 'company' | 'branch' | 'specific';
  memberIds?: string[];
  companyId?: string;
}): Promise<{ rankId: string }> {
  return callRoster<{ rankId: string }>({ action: 'createRank', ...input });
}

export async function updateRank(input: {
  id: string;
  name?: string;
  nameAr?: string | null;
  permissions?: string[];
  scope?: 'company' | 'branch' | 'specific';
  memberIds?: string[];
}): Promise<void> {
  await callRoster<{ ok: true }>({ action: 'updateRank', ...input });
}

export async function deleteRank(id: string): Promise<void> {
  await callRoster<{ ok: true }>({ action: 'deleteRank', id });
}

// ── Password Change Requests ──────────────────────────────────
export interface PasswordChangeRequest {
  id: string;
  member_id: string;
  company_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  note: string | null;
  target_role: string | null;
  browser_fingerprint: string | null;
  members: { full_name_en: string; email: string; user_id: string } | null;
}

export async function listPasswordRequests(): Promise<{ requests: PasswordChangeRequest[] }> {
  return callRoster<{ requests: PasswordChangeRequest[] }>({ action: 'listPasswordRequests' });
}

export async function createPasswordRequest(browserFingerprint: string): Promise<void> {
  await callRoster<{ ok: true }>({ action: 'createPasswordRequest', browserFingerprint });
}

export async function checkPasswordRequest(browserFingerprint: string): Promise<{ pending: boolean; requestedAt: string | null }> {
  return callRoster<{ pending: boolean; requestedAt: string | null }>({ action: 'checkPasswordRequest', browserFingerprint });
}

export async function createPasswordRequestByEmail(email: string, browserFingerprint: string): Promise<void> {
  const response = await fetch(ROSTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'requestPasswordByEmail', email, browserFingerprint }),
  });
  if (!response.ok) throw new RosterError(response.status, 'request_failed');
}

export async function checkPasswordRequestByEmail(email: string, browserFingerprint: string): Promise<{ pending: boolean; requestedAt: string | null }> {
  const response = await fetch(ROSTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'checkPasswordRequestByEmail', email, browserFingerprint }),
  });
  if (!response.ok) throw new RosterError(response.status, 'request_failed');
  const payload = await response.json().catch(() => null);
  if (typeof payload !== 'object' || payload === null) throw new RosterError(response.status, 'invalid_response');
  return payload as { pending: boolean; requestedAt: string | null };
}

export async function addCompanyAssistant(input: {
  companyId: string;
  name: string;
  nameAr?: string | null;
  email: string;
  password: string;
}): Promise<{ assistant: { email: string; userId: string } }> {
  return callRoster<{ assistant: { email: string; userId: string } }>({ action: 'addCompanyAssistant', ...input });
}

export async function reviewPasswordRequest(id: string, decision: 'approved' | 'rejected'): Promise<void> {
  await callRoster<{ ok: true }>({ action: 'reviewPasswordRequest', id, decision });
}

export async function previewRosterImport(rows: RosterImportRow[]): Promise<RosterImportPreview> {
  return callRoster<RosterImportPreview>({ action: 'import', rows, commit: false });
}

export async function commitRosterImport(rows: RosterImportRow[]): Promise<RosterImportResult> {
  return callRoster<RosterImportResult>({ action: 'import', rows, commit: true });
}
