import { db, MEMBER_SELECT, type MemberRow } from "./db.ts";
import { HttpError } from "./http.ts";
import { importMembers } from "./importer.ts";
import {
  assignableRolesBelow,
  canManage,
  isPlatformRole,
  parseAssignableRole,
  placementError,
  type Placement,
} from "./rules.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_WHILE_PASSWORD_CHANGE = new Set(["me", "passwordChanged"]);

export function placementOf(row: MemberRow): Placement {
  return { role: row.role, companyId: row.company_id, branchId: row.branch_id, teamId: row.team_id };
}

export function toMemberDto(row: MemberRow, manageable: boolean) {
  return {
    id: row.id,
    email: row.email,
    fullNameEn: row.full_name_en,
    fullNameAr: row.full_name_ar,
    userId: row.user_id,
    phone: row.phone,
    rosterOrder: row.roster_order,
    role: row.role,
    status: row.status,
    mustChangePassword: row.must_change_password,
    companyId: row.company_id,
    companyName: row.companies?.name ?? null,
    branchId: row.branch_id,
    branchName: row.branches?.name ?? null,
    teamId: row.team_id,
    teamName: row.teams?.name ?? null,
    customRankId: row.custom_rank_id ?? null,
    customRankName: row.custom_ranks?.name_ar ?? row.custom_ranks?.name ?? null,
    customRankPermissions: row.custom_ranks?.rank_permissions?.map((item) => item.permission) ?? [],
    canManage: manageable,
  };
}

export async function performAction(actor: MemberRow, body: Record<string, unknown>) {
  if (actor.must_change_password && !ALLOWED_WHILE_PASSWORD_CHANGE.has(String(body.action))) {
    throw new HttpError(403, "password_change_required");
  }
  switch (body.action) {
    case "me":
      return { member: toMemberDto(actor, false) };
    case "list":
      return listMembers(actor);
    case "import":
      return importMembers(actor, body);
    case "createCompany":
      return createCompany(actor, body);
    case "createCompanyWithAdmin":
      return createCompanyWithAdmin(actor, body);
    case "addCompanyAssistant":
      return addCompanyAssistant(actor, body);
    case "update":
      return updateMember(actor, body);
    case "remove":
      return removeMember(actor, body);
    case "passwordChanged":
      return finishPasswordChange(actor);
    case "resetPassword":
      return resetMemberPassword(actor, body);
    case "profile":
      return updateProfile(actor, body);
    case "createBranch":
      return createBranch(actor, body);
    case "updateBranch":
      return updateBranch(actor, body);
    case "deleteBranch":
      return deleteBranch(actor, body);
    case "listRanks":
      return listRanks(actor);
    case "createRank":
      return createRank(actor, body);
    case "updateRank":
      return updateRank(actor, body);
    case "deleteRank":
      return deleteRank(actor, body);
    case "listPasswordRequests":
      return listPasswordRequests(actor);
    case "createPasswordRequest":
      return createPasswordRequest(actor, body);
    case "checkPasswordRequest":
      return checkPasswordRequest(actor, body);
    case "reviewPasswordRequest":
      return reviewPasswordRequest(actor, body);
    default:
      throw new HttpError(400, "unknown_action");
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new HttpError(422, `invalid_${field}`);
  return value.trim();
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalUuid(value: unknown, field: string): string | null {
  const text = optionalString(value);
  if (text === null) return null;
  if (!UUID_PATTERN.test(text)) throw new HttpError(422, `invalid_${field}`);
  return text;
}

async function loadMember(id: string): Promise<MemberRow> {
  const { data, error } = await db.from("members").select(MEMBER_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "not_found");
  return data as MemberRow;
}

function hasCustomPermission(actor: MemberRow, permission: string): boolean {
  return actor.custom_ranks?.rank_permissions?.some((item) => item.permission === permission) ?? false;
}

async function customRankMemberIds(actor: MemberRow): Promise<string[] | null> {
  if (!actor.custom_rank_id) return null;
  const { data: rank, error } = await db.from("custom_ranks").select("scope").eq("id", actor.custom_rank_id).maybeSingle();
  if (error || !rank) return null;
  if (rank.scope === "company") return null;
  if (rank.scope === "branch" && actor.branch_id) return null;
  if (rank.scope === "specific") {
    const { data: rmembers, error: rmError } = await db.from("rank_members").select("member_id").eq("rank_id", actor.custom_rank_id);
    if (rmError) return null;
    return (rmembers ?? []).map((m: { member_id: string }) => m.member_id);
  }
  return null;
}

function scopedMembersQuery(actor: MemberRow) {
  const query = db
    .from("members")
    .select(MEMBER_SELECT)
    .order("roster_order", { ascending: true, nullsFirst: false })
    .order("full_name_en");
  if (isPlatformRole(actor.role)) return query;
  if (actor.role === "COMPANY_ADMIN" && actor.company_id) return query.eq("company_id", actor.company_id);
  if (actor.role === "BRANCH_MANAGER" && actor.branch_id) return query.eq("branch_id", actor.branch_id);
  if (actor.company_id && (hasCustomPermission(actor, "employee.view") || hasCustomPermission(actor, "employee.import") || hasCustomPermission(actor, "employee.transfer"))) {
    if (actor.branch_id && actor.custom_ranks?.scope === "branch") return query.eq("branch_id", actor.branch_id);
    return query.eq("company_id", actor.company_id);
  }
  if (actor.role === "TEAM_LEADER" && actor.team_id) return query.eq("team_id", actor.team_id);
  return query.eq("id", actor.id);
}

async function listMembers(actor: MemberRow) {
  let baseQuery = scopedMembersQuery(actor);
  const specificIds = await customRankMemberIds(actor);
  if (specificIds) {
    baseQuery = baseQuery.in("id", specificIds.length > 0 ? specificIds : [actor.id]);
  }
  const { data, error } = await baseQuery;
  if (error) throw error;
  const me = placementOf(actor);
  const customCanManage = hasCustomPermission(actor, "employee.promote") || hasCustomPermission(actor, "employee.suspend") || hasCustomPermission(actor, "employee.revoke") || hasCustomPermission(actor, "employee.transfer");
  const members = ((data ?? []) as MemberRow[]).map((row) =>
    toMemberDto(
      row,
      row.id !== actor.id && (customCanManage
        ? (specificIds
            ? specificIds.includes(row.id)
            : actor.custom_ranks?.scope === "branch"
              ? row.branch_id === actor.branch_id && row.role !== "COMPANY_ADMIN" && !isPlatformRole(row.role)
              : row.company_id === actor.company_id && row.role !== "OWNER" && row.role !== "SUPER_ADMIN")
        : canManage(me, placementOf(row))),
    ),
  );
  return {
    members,
    lookups: await loadLookups(actor),
    assignableRoles: assignableRolesBelow(actor.role),
  };
}

async function loadLookups(actor: MemberRow) {
  const empty = { companies: [], branches: [], teams: [] };
  if (actor.role === "EMPLOYEE" && !hasCustomPermission(actor, "employee.view") && !hasCustomPermission(actor, "employee.import")) return empty;
  const platform = isPlatformRole(actor.role);
  if (!platform && !actor.company_id) return empty;
  if (actor.role === "EMPLOYEE" && actor.company_id) {
    const { data: companyData, error: companyError } = await db.from("companies").select("id, name, trade_license").eq("id", actor.company_id);
    if (companyError) throw companyError;
    const { data: branchData, error: branchError } = await db.from("branches").select("id, company_id, name").eq("company_id", actor.company_id).order("name");
    if (branchError) throw branchError;
    const branchIds = (branchData ?? []).map((branch: { id: string }) => branch.id);
    const { data: teamData, error: teamError } = branchIds.length > 0
      ? await db.from("teams").select("id, branch_id, name").in("branch_id", branchIds).order("name")
      : { data: [], error: null };
    if (teamError) throw teamError;
    return { companies: companyData ?? [], branches: branchData ?? [], teams: teamData ?? [] };
  }
  if (!platform && actor.role !== "COMPANY_ADMIN" && !actor.branch_id) return empty;
  if (!platform && actor.role === "TEAM_LEADER" && !actor.team_id) return empty;

  let companies = db.from("companies").select("id, name, trade_license").order("name");
  let branches = db.from("branches").select("id, company_id, name").order("name");
  if (!platform) {
    companies = companies.eq("id", actor.company_id);
    branches =
      actor.role === "COMPANY_ADMIN"
        ? branches.eq("company_id", actor.company_id)
        : branches.eq("id", actor.branch_id as string);
  }
  const [companyRes, branchRes] = await Promise.all([companies, branches]);
  if (companyRes.error) throw companyRes.error;
  if (branchRes.error) throw branchRes.error;

  let teams = db.from("teams").select("id, branch_id, name").order("name");
  if (actor.role === "TEAM_LEADER") teams = teams.eq("id", actor.team_id as string);
  else if (!platform) teams = teams.in("branch_id", (branchRes.data ?? []).map((b: { id: string }) => b.id));
  const teamRes = (branchRes.data ?? []).length === 0 && !platform ? { data: [], error: null } : await teams;
  if (teamRes.error) throw teamRes.error;

  return { companies: companyRes.data ?? [], branches: branchRes.data ?? [], teams: teamRes.data ?? [] };
}

async function assertPlacementExists(p: Placement) {
  if (p.companyId) {
    const { data, error } = await db.from("companies").select("id").eq("id", p.companyId).maybeSingle();
    if (error) throw error;
    if (!data) throw new HttpError(422, "invalid_placement");
  }
  if (p.branchId) {
    const { data, error } = await db.from("branches").select("id, company_id").eq("id", p.branchId).maybeSingle();
    if (error) throw error;
    if (!data || data.company_id !== p.companyId) throw new HttpError(422, "invalid_placement");
  }
  if (p.teamId) {
    const { data, error } = await db.from("teams").select("id, branch_id").eq("id", p.teamId).maybeSingle();
    if (error) throw error;
    if (!data || data.branch_id !== p.branchId) throw new HttpError(422, "invalid_placement");
  }
}

async function updateMember(actor: MemberRow, body: Record<string, unknown>) {
  const id = optionalUuid(body.id, "id");
  if (!id) throw new HttpError(422, "invalid_id");
  const target = await loadMember(id);
  if (target.id === actor.id) throw new HttpError(403, "cannot_edit_self");

  const me = placementOf(actor);
  if (!canManage(me, placementOf(target))) throw new HttpError(403, "forbidden");

  const fields = (typeof body.fields === "object" && body.fields !== null ? body.fields : {}) as Record<string, unknown>;
  const fullNameEn = requireString(fields.fullNameEn, "name");
  const fullNameAr = optionalString(fields.fullNameAr);
  const role = parseAssignableRole(requireString(fields.role, "role"));
  if (!role || !assignableRolesBelow(actor.role).includes(role)) throw new HttpError(403, "forbidden_role");
  if (fields.status !== "Active" && fields.status !== "Suspended") throw new HttpError(422, "invalid_status");

  const next: Placement = {
    role,
    companyId: optionalUuid(fields.companyId, "company"),
    branchId: optionalUuid(fields.branchId, "branch"),
    teamId: optionalUuid(fields.teamId, "team"),
  };
  const missing = placementError(next);
  if (missing) throw new HttpError(422, missing);
  await assertPlacementExists(next);
  if (!canManage(me, next)) throw new HttpError(403, "out_of_scope");

  const { error } = await db
    .from("members")
    .update({
      full_name_en: fullNameEn,
      full_name_ar: fullNameAr,
      role: next.role,
      status: fields.status,
      company_id: next.companyId,
      branch_id: next.branchId,
      team_id: next.teamId,
      custom_rank_id: optionalUuid(fields.customRankId, "rank") ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  return { member: toMemberDto(await loadMember(id), true) };
}

async function removeMember(actor: MemberRow, body: Record<string, unknown>) {
  const id = optionalUuid(body.id, "id");
  if (!id) throw new HttpError(422, "invalid_id");
  const target = await loadMember(id);
  if (target.id === actor.id) throw new HttpError(403, "cannot_edit_self");
  if (!canManage(placementOf(actor), placementOf(target))) throw new HttpError(403, "forbidden");
  const { error } = await db.from("members").delete().eq("id", id);
  if (error) throw error;
  return { ok: true };
}

async function createCompany(actor: MemberRow, body: Record<string, unknown>) {
  if (!isPlatformRole(actor.role)) throw new HttpError(403, "forbidden");
  const name = requireString(body.name, "company");
  const tradeLicense = optionalString(body.tradeLicense);
  const { data, error } = await db.from("companies").insert({ name, trade_license: tradeLicense }).select("id, name, trade_license").maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(422, "invalid_company");
  return { company: data };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_ID_PATTERN = /^[0-9]{7}$/;

async function createCompanyWithAdmin(actor: MemberRow, body: Record<string, unknown>) {
  if (!isPlatformRole(actor.role)) throw new HttpError(403, "forbidden");
  const name = requireString(body.companyName, "company");
  const tradeLicense = optionalString(body.tradeLicense);
  const adminName = requireString(body.adminName, "admin_name");
  const adminNameAr = optionalString(body.adminNameAr);
  const adminEmail = requireString(body.adminEmail, "admin_email").toLowerCase();
  if (!EMAIL_PATTERN.test(adminEmail)) throw new HttpError(422, "invalid_admin_email");
  const adminPassword = requireString(body.adminPassword, "admin_password");
  if (adminPassword.length < 8) throw new HttpError(422, "password_too_short");

  const { data: companyData, error: companyError } = await db
    .from("companies").insert({ name, trade_license: tradeLicense }).select("id, name, trade_license").maybeSingle();
  if (companyError) throw companyError;
  if (!companyData) throw new HttpError(422, "invalid_company");

  const { data: existingMember, error: checkError } = await db
    .from("members").select("id").eq("email", adminEmail).maybeSingle();
  if (checkError) throw checkError;
  if (existingMember) {
    await db.from("companies").delete().eq("id", companyData.id);
    throw new HttpError(422, "email_taken");
  }

  const { data: maxRow, error: maxError } = await db
    .from("members").select("user_id").order("user_id", { ascending: false }).limit(1).maybeSingle();
  if (maxError) throw maxError;
  const nextUserId = maxRow?.user_id
    ? String(Number(maxRow.user_id) + 1).padStart(7, "0")
    : "1000001";
  if (!USER_ID_PATTERN.test(nextUserId)) throw new HttpError(500, "user_id_overflow");

  const { error: memberError } = await db.from("members").insert({
    email: adminEmail,
    full_name_en: adminName,
    full_name_ar: adminNameAr,
    username: nextUserId,
    user_id: nextUserId,
    role: "COMPANY_ADMIN",
    company_id: companyData.id,
    status: "Active",
    must_change_password: true,
    temp_password: adminPassword,
  });
  if (memberError) {
    await db.from("companies").delete().eq("id", companyData.id);
    throw memberError;
  }

  return { company: companyData, admin: { email: adminEmail, userId: nextUserId } };
}

async function updateProfile(actor: MemberRow, body: Record<string, unknown>) {
  const fields = (typeof body.fields === "object" && body.fields !== null ? body.fields : {}) as Record<string, unknown>;
  const fullNameEn = requireString(fields.fullNameEn, "name");
  const fullNameAr = optionalString(fields.fullNameAr);
  const phone = optionalString(fields.phone);
  if (phone && !/^[+0-9 ()-]{7,24}$/.test(phone)) throw new HttpError(422, "invalid_phone");
  const { error } = await db
    .from("members")
    .update({ full_name_en: fullNameEn, full_name_ar: fullNameAr, phone, updated_at: new Date().toISOString() })
    .eq("id", actor.id);
  if (error) throw error;
  return { member: toMemberDto(await loadMember(actor.id), false) };
}

async function finishPasswordChange(actor: MemberRow) {
  const { error } = await db
    .from("members")
    .update({ must_change_password: false, temp_password: null, updated_at: new Date().toISOString() })
    .eq("id", actor.id);
  if (error) throw error;
  return { ok: true };
}

async function resetMemberPassword(actor: MemberRow, body: Record<string, unknown>) {
  const id = optionalUuid(body.id, "id");
  if (!id) throw new HttpError(422, "invalid_id");
  const target = await loadMember(id);
  if (target.id === actor.id) throw new HttpError(403, "cannot_edit_self");
  if (!canManage(placementOf(actor), placementOf(target))) throw new HttpError(403, "forbidden");

  const email = requireString(body.email, "email");
  if (email !== target.email.toLowerCase()) throw new HttpError(422, "email_mismatch");

  const newPassword = requireString(body.newPassword, "password");
  if (newPassword.length < 8) throw new HttpError(422, "password_too_short");

  const { error } = await db
    .from("members")
    .update({
      temp_password: newPassword,
      must_change_password: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  return { ok: true };
}

// ── Branches ──────────────────────────────────────────────────

async function createBranch(actor: MemberRow, body: Record<string, unknown>) {
  if (!actor.company_id) throw new HttpError(403, "forbidden");
  if (actor.role !== "COMPANY_ADMIN" && !isPlatformRole(actor.role)) throw new HttpError(403, "forbidden");
  const name = requireString(body.name, "branch");
  const companyId = isPlatformRole(actor.role) ? optionalUuid(body.companyId, "company") : actor.company_id;
  if (!companyId) throw new HttpError(422, "invalid_company");
  const { data, error } = await db
    .from("branches").insert({ name, company_id: companyId }).select("id, company_id, name").maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(422, "invalid_branch");
  return { branch: data };
}

async function loadBranchForActor(actor: MemberRow, body: Record<string, unknown>) {
  const id = optionalUuid(body.id, "branch");
  if (!id) throw new HttpError(422, "invalid_branch");
  const query = db.from("branches").select("id, company_id, name").eq("id", id);
  const scoped = isPlatformRole(actor.role) ? query : query.eq("company_id", actor.company_id);
  const { data, error } = await scoped.maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "not_found");
  return data as { id: string; company_id: string; name: string };
}

async function updateBranch(actor: MemberRow, body: Record<string, unknown>) {
  if (actor.role !== "COMPANY_ADMIN" && !isPlatformRole(actor.role)) throw new HttpError(403, "forbidden");
  const branch = await loadBranchForActor(actor, body);
  const name = requireString(body.name, "branch");
  const { error } = await db.from("branches").update({ name }).eq("id", branch.id);
  if (error) throw error;
  return { ok: true };
}

async function deleteBranch(actor: MemberRow, body: Record<string, unknown>) {
  if (actor.role !== "COMPANY_ADMIN" && !isPlatformRole(actor.role)) throw new HttpError(403, "forbidden");
  const branch = await loadBranchForActor(actor, body);
  const { count, error: countError } = await db.from("members").select("id", { count: "exact", head: true }).eq("branch_id", branch.id);
  if (countError) throw countError;
  if ((count ?? 0) > 0) throw new HttpError(409, "branch_has_members");
  const { count: teamCount, error: teamError } = await db.from("teams").select("id", { count: "exact", head: true }).eq("branch_id", branch.id);
  if (teamError) throw teamError;
  if ((teamCount ?? 0) > 0) throw new HttpError(409, "branch_has_teams");
  const { error } = await db.from("branches").delete().eq("id", branch.id);
  if (error) throw error;
  return { ok: true };
}

// ── Custom Ranks ──────────────────────────────────────────────

const VALID_PERMISSIONS = [
  "branch.manage",
  "employee.import",
  "target.import",
  "sale.create",
  "sale.approve",
  "employee.promote",
  "employee.suspend",
  "employee.revoke",
  "employee.transfer",
  "password.approve",
  "performance.review",
] as const;

function assertCompanyAdmin(actor: MemberRow) {
  if (actor.role !== "COMPANY_ADMIN" && !isPlatformRole(actor.role)) throw new HttpError(403, "forbidden");
  if (!actor.company_id && !isPlatformRole(actor.role)) throw new HttpError(403, "forbidden");
}

function rankCompanyId(actor: MemberRow, body: Record<string, unknown>): string {
  if (isPlatformRole(actor.role)) {
    const id = optionalUuid(body.companyId, "company");
    if (!id) throw new HttpError(422, "invalid_company");
    return id;
  }
  return actor.company_id as string;
}

async function listRanks(actor: MemberRow) {
  assertCompanyAdmin(actor);
  const cid = isPlatformRole(actor.role) ? null : actor.company_id;
  let query = db.from("custom_ranks").select("id, company_id, name, name_ar, scope, created_at").order("created_at", { ascending: false });
  if (cid) query = query.eq("company_id", cid);
  const { data: ranks, error } = await query;
  if (error) throw error;
  if (!ranks || ranks.length === 0) return { ranks: [] };
  const rankIds = ranks.map((r: { id: string }) => r.id);
  const { data: perms, error: permError } = await db
    .from("rank_permissions").select("rank_id, permission").in("rank_id", rankIds);
  if (permError) throw permError;
  const { data: rmembers, error: rmError } = await db
    .from("rank_members").select("rank_id, member_id").in("rank_id", rankIds);
  if (rmError) throw rmError;
  const permMap = new Map<string, string[]>();
  for (const p of (perms ?? []) as { rank_id: string; permission: string }[]) {
    const arr = permMap.get(p.rank_id) ?? [];
    arr.push(p.permission);
    permMap.set(p.rank_id, arr);
  }
  const memberMap = new Map<string, string[]>();
  for (const m of (rmembers ?? []) as { rank_id: string; member_id: string }[]) {
    const arr = memberMap.get(m.rank_id) ?? [];
    arr.push(m.member_id);
    memberMap.set(m.rank_id, arr);
  }
  return {
    ranks: ranks.map((r: { id: string; company_id: string; name: string; name_ar: string | null; scope: string; created_at: string }) => ({
      id: r.id,
      companyId: r.company_id,
      name: r.name,
      nameAr: r.name_ar,
      scope: r.scope,
      permissions: permMap.get(r.id) ?? [],
      memberIds: memberMap.get(r.id) ?? [],
      createdAt: r.created_at,
    })),
  };
}

const VALID_SCOPES = ["company", "branch", "specific"] as const;

async function createRank(actor: MemberRow, body: Record<string, unknown>) {
  assertCompanyAdmin(actor);
  const name = requireString(body.name, "rank_name");
  const nameAr = optionalString(body.nameAr);
  const cid = rankCompanyId(actor, body);
  const permissions = Array.isArray(body.permissions) ? body.permissions : [];
  for (const p of permissions) {
    if (!VALID_PERMISSIONS.includes(p as (typeof VALID_PERMISSIONS)[number])) throw new HttpError(422, "invalid_permission");
  }
  const scope = typeof body.scope === "string" && VALID_SCOPES.includes(body.scope as (typeof VALID_SCOPES)[number]) ? body.scope : "company";
  const { data: rank, error: rankError } = await db
    .from("custom_ranks").insert({ name, name_ar: nameAr, company_id: cid, scope }).select("id").maybeSingle();
  if (rankError) throw rankError;
  if (!rank) throw new HttpError(422, "invalid_rank");
  if (permissions.length > 0) {
    const rows = permissions.map((p: string) => ({ rank_id: rank.id, permission: p }));
    const { error: permError } = await db.from("rank_permissions").insert(rows);
    if (permError) throw permError;
  }
  await syncRankMembers(rank.id, cid, body.memberIds);
  return { rankId: rank.id };
}

async function updateRank(actor: MemberRow, body: Record<string, unknown>) {
  assertCompanyAdmin(actor);
  const id = optionalUuid(body.id, "id");
  if (!id) throw new HttpError(422, "invalid_id");
  const cid = isPlatformRole(actor.role) ? null : actor.company_id;
  let checkQuery = db.from("custom_ranks").select("id, company_id").eq("id", id);
  if (cid) checkQuery = checkQuery.eq("company_id", cid);
  const { data: existing, error: checkError } = await checkQuery.maybeSingle();
  if (checkError) throw checkError;
  if (!existing) throw new HttpError(404, "not_found");
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
  if (typeof body.nameAr === "string") updates.name_ar = body.nameAr.trim() || null;
  if (Object.keys(updates).length > 1) {
    const { error: updateError } = await db.from("custom_ranks").update(updates).eq("id", id);
    if (updateError) throw updateError;
  }
  if (Array.isArray(body.permissions)) {
    for (const p of body.permissions) {
      if (!VALID_PERMISSIONS.includes(p as (typeof VALID_PERMISSIONS)[number])) throw new HttpError(422, "invalid_permission");
    }
    const { error: delError } = await db.from("rank_permissions").delete().eq("rank_id", id);
    if (delError) throw delError;
    if (body.permissions.length > 0) {
      const rows = (body.permissions as string[]).map((p) => ({ rank_id: id, permission: p }));
      const { error: insError } = await db.from("rank_permissions").insert(rows);
      if (insError) throw insError;
    }
  }
  if (typeof body.scope === "string" && VALID_SCOPES.includes(body.scope as (typeof VALID_SCOPES)[number])) {
    const { error: scopeError } = await db.from("custom_ranks").update({ scope: body.scope, updated_at: new Date().toISOString() }).eq("id", id);
    if (scopeError) throw scopeError;
  }
  if (Array.isArray(body.memberIds)) {
    await syncRankMembers(id, (existing as { company_id: string }).company_id, body.memberIds);
  }
  return { ok: true };
}

async function syncRankMembers(rankId: string, companyId: string, rawMemberIds: unknown) {
  if (!Array.isArray(rawMemberIds)) return;
  const memberIds = (rawMemberIds as unknown[]).filter((m): m is string => typeof m === "string" && UUID_PATTERN.test(m));
  if (memberIds.length === 0) return;
  const { data: valid, error } = await db.from("members").select("id").eq("company_id", companyId).in("id", memberIds);
  if (error) throw error;
  const validIds = (valid ?? []).map((m: { id: string }) => m.id);
  if (validIds.length === 0) return;
  const { error: delError } = await db.from("rank_members").delete().eq("rank_id", rankId);
  if (delError) throw delError;
  const rows = validIds.map((mid: string) => ({ rank_id: rankId, member_id: mid }));
  const { error: insError } = await db.from("rank_members").insert(rows);
  if (insError) throw insError;
}

async function deleteRank(actor: MemberRow, body: Record<string, unknown>) {
  assertCompanyAdmin(actor);
  const id = optionalUuid(body.id, "id");
  if (!id) throw new HttpError(422, "invalid_id");
  const cid = isPlatformRole(actor.role) ? null : actor.company_id;
  let checkQuery = db.from("custom_ranks").select("id, company_id").eq("id", id);
  if (cid) checkQuery = checkQuery.eq("company_id", cid);
  const { data: existing, error: checkError } = await checkQuery.maybeSingle();
  if (checkError) throw checkError;
  if (!existing) throw new HttpError(404, "not_found");
  const { error } = await db.from("custom_ranks").delete().eq("id", id);
  if (error) throw error;
  return { ok: true };
}

async function addCompanyAssistant(actor: MemberRow, body: Record<string, unknown>) {
  if (!isPlatformRole(actor.role)) throw new HttpError(403, "forbidden");
  const companyId = optionalUuid(body.companyId, "company");
  if (!companyId) throw new HttpError(422, "invalid_company");
  const name = requireString(body.name, "assistant_name");
  const nameAr = optionalString(body.nameAr);
  const email = requireString(body.email, "assistant_email").toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw new HttpError(422, "invalid_email");
  const password = requireString(body.password, "assistant_password");
  if (password.length < 8) throw new HttpError(422, "password_too_short");

  const { data: existing } = await db.from("members").select("id").eq("email", email).maybeSingle();
  if (existing) throw new HttpError(422, "email_taken");

  const { data: maxRow } = await db.from("members").select("user_id").order("user_id", { ascending: false }).limit(1).maybeSingle();
  const nextUserId = maxRow?.user_id ? String(Number(maxRow.user_id) + 1).padStart(7, "0") : "1000001";
  if (!USER_ID_PATTERN.test(nextUserId)) throw new HttpError(500, "user_id_overflow");

  const { error } = await db.from("members").insert({
    email,
    full_name_en: name,
    full_name_ar: nameAr,
    username: nextUserId,
    user_id: nextUserId,
    role: "COMPANY_ADMIN",
    company_id: companyId,
    is_assistant: true,
    status: "Active",
    must_change_password: true,
    temp_password: password,
  });
  if (error) throw error;
  return { assistant: { email, userId: nextUserId } };
}

// ── Password Change Requests ──────────────────────────────────

async function listPasswordRequests(actor: MemberRow) {
  if (actor.role === "EMPLOYEE" && !hasCustomPermission(actor, "password.approve")) throw new HttpError(403, "forbidden");
  const platform = isPlatformRole(actor.role);
  const cid = platform ? null : actor.company_id;
  let query = db
    .from("password_change_requests")
    .select("id, member_id, company_id, status, requested_at, reviewed_at, reviewed_by, note, target_role, browser_fingerprint, members!member_id(full_name_en, email, user_id)")
    .order("requested_at", { ascending: false })
    .neq("member_id", actor.id);
  if (cid) query = query.eq("company_id", cid);
  if (platform) query = query.or(`target_role.eq.platform,company_id.is.null,target_role.is.null`);
  const { data, error } = await query;
  if (error) throw error;
  return { requests: data ?? [] };
}

export async function requestPasswordByEmail(body: Record<string, unknown>) {
  const email = requireString(body.email, "email").toLowerCase();
  const fingerprint = optionalString(body.browserFingerprint);
  const { data: member, error } = await db.from("members").select("id, company_id, role").eq("email", email).maybeSingle();
  if (error) throw error;
  if (member) {
    const isPlatformOwner = member.role === "OWNER" || member.role === "SUPER_ADMIN";
    const targetRole = isPlatformOwner ? "platform" : "company";
    let existingQuery = db
      .from("password_change_requests")
      .select("id")
      .eq("member_id", member.id)
      .eq("status", "pending");
    if (fingerprint) existingQuery = existingQuery.eq("browser_fingerprint", fingerprint);
    const { data: existing } = await existingQuery.maybeSingle();
    if (!existing) {
      const { error: insertError } = await db.from("password_change_requests").insert({
        member_id: member.id,
        company_id: member.company_id,
        status: "pending",
        browser_fingerprint: fingerprint,
        target_role: targetRole,
      });
      if (insertError) throw insertError;
    }
  }
  return { ok: true };
}

async function createPasswordRequest(actor: MemberRow, body: Record<string, unknown>) {
  const fingerprint = optionalString(body.browserFingerprint);
  const isPlatformOwner = isPlatformRole(actor.role);
  if (!isPlatformOwner && !actor.company_id) throw new HttpError(403, "forbidden");

  let existingQuery = db
    .from("password_change_requests")
    .select("id")
    .eq("member_id", actor.id)
    .eq("status", "pending");
  if (fingerprint) existingQuery = existingQuery.eq("browser_fingerprint", fingerprint);
  const { data: existing } = await existingQuery.maybeSingle();
  if (existing) throw new HttpError(422, "request_already_pending");

  const targetRole = isPlatformOwner ? "platform" : "company";
  const { error } = await db.from("password_change_requests").insert({
    member_id: actor.id,
    company_id: actor.company_id,
    status: "pending",
    browser_fingerprint: fingerprint,
    target_role: targetRole,
  });
  if (error) throw error;
  return { ok: true };
}

async function checkPasswordRequest(actor: MemberRow, body: Record<string, unknown>) {
  const fingerprint = optionalString(body.browserFingerprint);
  if (!fingerprint) return { pending: false };
  const { data, error } = await db
    .from("password_change_requests")
    .select("id, status, requested_at")
    .eq("member_id", actor.id)
    .eq("status", "pending")
    .eq("browser_fingerprint", fingerprint)
    .maybeSingle();
  if (error) throw error;
  return { pending: Boolean(data), requestedAt: data?.requested_at ?? null };
}

async function reviewPasswordRequest(actor: MemberRow, body: Record<string, unknown>) {
  if (actor.role === "EMPLOYEE" && !hasCustomPermission(actor, "password.approve")) throw new HttpError(403, "forbidden");
  const id = optionalUuid(body.id, "id");
  if (!id) throw new HttpError(422, "invalid_id");
  const decision = requireString(body.decision, "decision");
  if (decision !== "approved" && decision !== "rejected") throw new HttpError(422, "invalid_decision");
  const platform = isPlatformRole(actor.role);
  const cid = platform ? null : actor.company_id;
  let checkQuery = db.from("password_change_requests").select("id, company_id, member_id, status, target_role").eq("id", id).eq("status", "pending");
  if (cid) checkQuery = checkQuery.eq("company_id", cid);
  const { data: req, error: checkError } = await checkQuery.maybeSingle();
  if (checkError) throw checkError;
  if (!req) throw new HttpError(404, "not_found");
  if ((req as { member_id: string }).member_id === actor.id) throw new HttpError(403, "cannot_review_own_request");
  const { error } = await db.from("password_change_requests").update({
    status: decision,
    reviewed_at: new Date().toISOString(),
    reviewed_by: actor.id,
  }).eq("id", id);
  if (error) throw error;
  if (decision === "approved") {
    await db.from("members").update({
      must_change_password: true,
      temp_password: null,
      updated_at: new Date().toISOString(),
    }).eq("id", (req as { member_id: string }).member_id);
  }
  return { ok: true };
}

export async function checkPasswordRequestByEmail(body: Record<string, unknown>) {
  const email = requireString(body.email, "email").toLowerCase();
  const fingerprint = optionalString(body.browserFingerprint);
  if (!fingerprint) return { pending: false };
  const { data: member, error: mError } = await db.from("members").select("id").eq("email", email).maybeSingle();
  if (mError) throw mError;
  if (!member) return { pending: false };
  const { data, error } = await db
    .from("password_change_requests")
    .select("id, status, requested_at")
    .eq("member_id", member.id)
    .eq("status", "pending")
    .eq("browser_fingerprint", fingerprint)
    .maybeSingle();
  if (error) throw error;
  return { pending: Boolean(data), requestedAt: data?.requested_at ?? null };
}
