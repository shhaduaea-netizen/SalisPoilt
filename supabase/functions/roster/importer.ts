import { db, type MemberRow } from "./db.ts";
import { HttpError } from "./http.ts";
import { assignableRolesBelow, canManage, parseAssignableRole, placementError, type Role } from "./rules.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_ID_PATTERN = /^[0-9]{7}$/;
const MAX_ROWS = 500;

interface ParsedRow {
  line: number;
  fullNameEn: string;
  fullNameAr: string | null;
  role: Role;
  company: string | null;
  branch: string | null;
  team: string | null;
  userId: string;
  email: string;
  status: "Active" | "Suspended";
  customRankId: string | null;
}

interface RowIssue {
  line: number;
  code: string;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseRow(raw: unknown, index: number, issues: RowIssue[], fallbackCompany: string | null): ParsedRow | null {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const line = typeof r.line === "number" ? r.line : index + 1;
  const before = issues.length;
  const fullNameEn = text(r.fullNameEn);
  const email = text(r.email)?.toLowerCase() ?? "";
  const userId = text(r.userId) ?? "";
  const role = parseAssignableRole(text(r.role) ?? "");
  const rawCompany = text(r.company);
  const company = rawCompany ?? fallbackCompany;
  const branch = text(r.branch);
  const team = text(r.team);
  const statusText = text(r.status)?.toLowerCase() ?? "";
  const status = /suspended|inactive|غير نشط|موقوف/.test(statusText) ? "Suspended" : "Active";

  if (!fullNameEn) issues.push({ line, code: "missing_name" });
  if (!EMAIL_PATTERN.test(email)) issues.push({ line, code: "invalid_email" });
  if (!USER_ID_PATTERN.test(userId)) issues.push({ line, code: "invalid_user_id" });
  if (!role) issues.push({ line, code: "invalid_role" });
  if (team && !branch) issues.push({ line, code: "team_without_branch" });
  if (role) {
    const placement = placementError({ role, companyId: company, branchId: branch, teamId: team });
    if (placement) issues.push({ line, code: placement });
  }
  if (issues.length > before || !role || !fullNameEn) return null;
  const customRankId = typeof r.customRankId === "string" && r.customRankId.trim() ? r.customRankId.trim() : null;
  return {
    line,
    fullNameEn,
    fullNameAr: text(r.fullNameAr),
    role,
    company,
    branch,
    team,
    userId,
    email,
    status,
    customRankId,
  };
}

export async function importMembers(actor: MemberRow, body: Record<string, unknown>) {
  const canImportWithCustomRank = actor.custom_ranks?.rank_permissions?.some((item) => item.permission === "employee.import") ?? false;
  if (!Array.isArray(body.rows) || body.rows.length === 0 || body.rows.length > MAX_ROWS) {
    throw new HttpError(422, "invalid_rows");
  }
  const commit = body.commit === true;

  // Resolve the actor's company name so rows without a company column can default to it.
  let fallbackCompanyName: string | null = null;
  if (actor.company_id) {
    const { data: actorCompany } = await db.from("companies").select("name").eq("id", actor.company_id).maybeSingle();
    fallbackCompanyName = actorCompany?.name ?? null;
  }

  const issues: RowIssue[] = [];
  const rows: ParsedRow[] = [];
  body.rows.forEach((raw, index) => {
    const parsed = parseRow(raw, index, issues, fallbackCompanyName);
    if (parsed) rows.push(parsed);
  });

  const { data: existingData, error: existingError } = await db
    .from("members")
    .select("id, email, user_id, role");
  if (existingError) throw existingError;
  const existing = (existingData ?? []) as { id: string; email: string; user_id: string; role: Role }[];
  const byEmail = new Map(existing.map((m) => [m.email, m]));
  const byUserId = new Map(existing.map((m) => [m.user_id, m]));
  const seenEmails = new Set<string>();
  const seenUserIds = new Set<string>();

  for (const row of rows) {
    const current = byEmail.get(row.email);
    if (current?.role === "OWNER") issues.push({ line: row.line, code: "owner_protected" });
    if (seenEmails.has(row.email)) issues.push({ line: row.line, code: "duplicate_email" });
    if (seenUserIds.has(row.userId)) issues.push({ line: row.line, code: "duplicate_user_id" });
    const userIdOwner = byUserId.get(row.userId);
    if (userIdOwner && userIdOwner.email !== row.email) issues.push({ line: row.line, code: "user_id_taken" });
    seenEmails.add(row.email);
    seenUserIds.add(row.userId);
  }

  if (issues.length > 0) throw new HttpError(422, "validation", issues);

  const toUpdate = rows.filter((row) => byEmail.has(row.email)).length;
  if (!commit) return { valid: true, toCreate: rows.length - toUpdate, toUpdate };

  const companyIds = new Map<string, string>();
  const { data: companyData, error: companyError } = await db.from("companies").select("id, name");
  if (companyError) throw companyError;
  for (const c of companyData ?? []) companyIds.set(c.name, c.id);

  for (const name of new Set(rows.map((r) => r.company).filter((n): n is string => !!n))) {
    if (companyIds.has(name)) continue;
    const { data, error } = await db.from("companies").insert({ name }).select("id").single();
    if (error) throw error;
    companyIds.set(name, data.id);
  }

  const branchIds = new Map<string, string>();
  const { data: branchData, error: branchError } = await db.from("branches").select("id, company_id, name");
  if (branchError) throw branchError;
  for (const b of branchData ?? []) branchIds.set(`${b.company_id}|${b.name}`, b.id);
  for (const r of rows.filter((row) => row.branch)) {
    const companyId = companyIds.get(r.company as string) as string;
    const key = `${companyId}|${r.branch}`;
    if (branchIds.has(key)) continue;
    const { data, error } = await db
      .from("branches")
      .insert({ company_id: companyId, name: r.branch })
      .select("id")
      .single();
    if (error) throw error;
    branchIds.set(key, data.id);
  }

  const teamIds = new Map<string, string>();
  const { data: teamData, error: teamError } = await db.from("teams").select("id, branch_id, name");
  if (teamError) throw teamError;
  for (const t of teamData ?? []) teamIds.set(`${t.branch_id}|${t.name}`, t.id);
  for (const r of rows.filter((row) => row.team)) {
    const branchId = branchIds.get(`${companyIds.get(r.company as string)}|${r.branch}`) as string;
    const key = `${branchId}|${r.team}`;
    if (teamIds.has(key)) continue;
    const { data, error } = await db
      .from("teams")
      .insert({ branch_id: branchId, name: r.team })
      .select("id")
      .single();
    if (error) throw error;
    teamIds.set(key, data.id);
  }

  let created = 0;
  let updated = 0;
  for (const r of rows) {
    const companyId = r.company ? (companyIds.get(r.company) ?? null) : null;
    const branchId = r.branch && companyId ? (branchIds.get(`${companyId}|${r.branch}`) ?? null) : null;
    const teamId = r.team && branchId ? (teamIds.get(`${branchId}|${r.team}`) ?? null) : null;
    const targetPlacement = { role: r.role, companyId, branchId, teamId };
    const canAssignRole = assignableRolesBelow(actor.role).includes(r.role) || (canImportWithCustomRank && r.role === "EMPLOYEE");
    const canManageTarget = canManage(
      { role: actor.role, companyId: actor.company_id, branchId: actor.branch_id, teamId: actor.team_id },
      targetPlacement
    ) || (canImportWithCustomRank && companyId === actor.company_id);
    if (!canAssignRole || !canManageTarget) {
      continue;
    }
    const payload = {
      full_name_en: r.fullNameEn,
      full_name_ar: r.fullNameAr,
      user_id: r.userId,
      username: r.userId,
      role: r.role,
      company_id: companyId,
      branch_id: branchId,
      team_id: teamId,
      status: r.status,
      roster_order: r.line,
      custom_rank_id: r.customRankId,
      updated_at: new Date().toISOString(),
    };
    const current = byEmail.get(r.email);
    if (current) {
      const { error } = await db.from("members").update(payload).eq("id", current.id);
      if (error) throw error;
      updated += 1;
    } else {
      const { error } = await db.from("members").insert({ ...payload, email: r.email, must_change_password: true });
      if (error) throw error;
      created += 1;
    }
  }
  return { valid: true, created, updated };
}
