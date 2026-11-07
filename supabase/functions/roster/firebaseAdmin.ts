import { importPKCS8, SignJWT } from "npm:jose@5";

const FIREBASE_PROJECT_ID = "salespilot-e581d";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ADMIN_BASE = `https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}`;

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function loadServiceAccount(): ServiceAccount {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) throw new Error("missing_firebase_service_account");
  const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
  if (typeof parsed.client_email !== "string" || typeof parsed.private_key !== "string") {
    throw new Error("invalid_firebase_service_account");
  }
  return { client_email: parsed.client_email, private_key: parsed.private_key };
}

async function accessToken(): Promise<string> {
  const account = loadServiceAccount();
  const key = await importPKCS8(account.private_key, "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/cloud-platform" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(account.client_email)
    .setSubject(account.client_email)
    .setAudience(TOKEN_URL)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(key);
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const payload = (await response.json().catch(() => null)) as { access_token?: string } | null;
  if (!response.ok || !payload?.access_token) throw new Error("firebase_token_failed");
  return payload.access_token;
}

async function adminPost(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const token = await accessToken();
  const response = await fetch(`${ADMIN_BASE}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || !payload) throw new Error(`firebase_${path}_failed`);
  return payload;
}

async function findLocalId(email: string): Promise<string | null> {
  const payload = await adminPost("accounts:lookup", { email: [email] });
  const users = Array.isArray(payload.users) ? (payload.users as { localId?: unknown }[]) : [];
  const localId = users[0]?.localId;
  return typeof localId === "string" ? localId : null;
}

export async function setFirebasePassword(params: { uid: string | null; email: string; password: string }): Promise<string> {
  const localId = params.uid ?? (await findLocalId(params.email));
  if (!localId) throw new Error("firebase_user_not_found");
  await adminPost("accounts:update", { localId, password: params.password });
  return localId;
}
