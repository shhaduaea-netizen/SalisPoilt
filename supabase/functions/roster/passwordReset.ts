import { db } from "./db.ts";
import { HttpError } from "./http.ts";
import { setFirebasePassword } from "./firebaseAdmin.ts";

const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,12}$/;
const APPROVAL_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ResetStatus = "none" | "pending" | "approved" | "rejected" | "expired";

interface ResetRequestRow {
  id: string;
  member_id: string;
  status: string;
  reviewed_at: string | null;
  requested_at: string;
}

function textField(value: unknown, code: string): string {
  if (typeof value !== "string" || !value.trim()) throw new HttpError(422, code);
  return value.trim();
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function newRequestToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function statusOf(request: ResetRequestRow): ResetStatus {
  if (request.status === "pending") return "pending";
  if (request.status === "rejected") return "rejected";
  if (request.status === "approved") {
    const reviewedAt = request.reviewed_at ? Date.parse(request.reviewed_at) : 0;
    return Date.now() - reviewedAt > APPROVAL_WINDOW_MS ? "expired" : "approved";
  }
  return "none";
}

async function findRequestByToken(email: string, token: string) {
  const { data: member, error: memberError } = await db
    .from("members")
    .select("id, email, firebase_uid, status")
    .eq("email", email)
    .maybeSingle();
  if (memberError) throw memberError;
  if (!member) return null;
  const { data: request, error } = await db
    .from("password_change_requests")
    .select("id, member_id, status, reviewed_at, requested_at")
    .eq("member_id", member.id)
    .eq("reset_token_hash", await sha256Hex(token))
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!request) return null;
  return { member, request: request as ResetRequestRow };
}

export async function requestPasswordByEmail(body: Record<string, unknown>) {
  const email = textField(body.email, "invalid_email").toLowerCase();
  const presentedToken = typeof body.requestToken === "string" && body.requestToken.length > 0 ? body.requestToken : null;
  const { data: member, error } = await db
    .from("members")
    .select("id, company_id, role, status")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  if (!member || member.status === "Suspended") return { requestToken: newRequestToken() };

  if (presentedToken) {
    const existing = await findRequestByToken(email, presentedToken);
    if (existing && existing.request.status === "pending") return { requestToken: presentedToken };
  }

  const token = newRequestToken();
  const isPlatformOwner = member.role === "OWNER" || member.role === "SUPER_ADMIN";
  const { error: insertError } = await db.from("password_change_requests").insert({
    member_id: member.id,
    company_id: member.company_id,
    status: "pending",
    target_role: isPlatformOwner ? "platform" : "company",
    reset_token_hash: await sha256Hex(token),
  });
  if (insertError) throw insertError;
  return { requestToken: token };
}

export async function checkPasswordRequestByEmail(body: Record<string, unknown>) {
  const email = textField(body.email, "invalid_email").toLowerCase();
  if (typeof body.requestToken !== "string" || !body.requestToken) return { status: "none" as ResetStatus };
  const found = await findRequestByToken(email, body.requestToken);
  if (!found) return { status: "none" as ResetStatus };
  return { status: statusOf(found.request) };
}

export async function completePasswordReset(body: Record<string, unknown>) {
  const email = textField(body.email, "invalid_email").toLowerCase();
  const token = textField(body.requestToken, "invalid_token");
  if (typeof body.newPassword !== "string" || !PASSWORD_PATTERN.test(body.newPassword)) {
    throw new HttpError(422, "invalid_password");
  }
  const newPassword = body.newPassword;

  const found = await findRequestByToken(email, token);
  if (!found || statusOf(found.request) !== "approved") throw new HttpError(409, "request_not_approved");
  if (found.member.status === "Suspended") throw new HttpError(403, "suspended");

  const { data: claimed, error: claimError } = await db
    .from("password_change_requests")
    .update({ status: "completing" })
    .eq("id", found.request.id)
    .eq("status", "approved")
    .select("id")
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) throw new HttpError(409, "request_not_approved");

  let localId: string;
  try {
    localId = await setFirebasePassword({ uid: found.member.firebase_uid, email, password: newPassword });
  } catch (error) {
    await db.from("password_change_requests").update({ status: "approved" }).eq("id", found.request.id);
    console.error(error);
    throw new HttpError(502, "password_update_failed");
  }

  const now = new Date().toISOString();
  const { error: doneError } = await db
    .from("password_change_requests")
    .update({ status: "completed", completed_at: now, reset_token_hash: null })
    .eq("id", found.request.id);
  if (doneError) throw doneError;
  const { error: memberError } = await db
    .from("members")
    .update({ firebase_uid: localId, must_change_password: false, temp_password: null, updated_at: now })
    .eq("id", found.member.id);
  if (memberError) throw memberError;
  return { ok: true };
}
