import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";
import { performAction, requestPasswordByEmail, checkPasswordRequestByEmail } from "./actions.ts";
import { db, MEMBER_SELECT, type MemberRow } from "./db.ts";
import { corsHeaders, HttpError, json } from "./http.ts";

const FIREBASE_PROJECT_ID = "salespilot-e581d";
const ROSTER_FUNCTION_VERSION = "2026-11-06-rev3";
const FIREBASE_KEYS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

interface FirebaseClaims {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

async function verifyFirebaseToken(token: string): Promise<FirebaseClaims> {
  try {
    const { payload } = await jwtVerify(token, FIREBASE_KEYS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    if (typeof payload.sub !== "string" || !payload.sub) throw new Error("missing subject");
    return {
      uid: payload.sub,
      email: typeof payload.email === "string" ? payload.email.toLowerCase() : null,
      emailVerified: payload.email_verified === true,
    };
  } catch {
    throw new HttpError(401, "unauthenticated");
  }
}

async function resolveActor(claims: FirebaseClaims): Promise<MemberRow> {
  const { data: linked, error } = await db
    .from("members")
    .select(MEMBER_SELECT)
    .eq("firebase_uid", claims.uid)
    .maybeSingle();
  if (error) throw error;

  let member = linked as MemberRow | null;
  if (!member) {
    if (!claims.email) throw new HttpError(403, "not_registered");
    const { data: byEmail, error: emailError } = await db
      .from("members")
      .select(MEMBER_SELECT)
      .eq("email", claims.email)
      .is("firebase_uid", null)
      .maybeSingle();
    if (emailError) throw emailError;
    if (!byEmail) throw new HttpError(403, "not_registered");

    const { error: linkError } = await db
      .from("members")
      .update({ firebase_uid: claims.uid, updated_at: new Date().toISOString() })
      .eq("id", byEmail.id)
      .is("firebase_uid", null);
    if (linkError) throw linkError;
    member = { ...(byEmail as MemberRow), firebase_uid: claims.uid };
  }

  if (member.status === "Suspended") throw new HttpError(403, "suspended");
  return member;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    void ROSTER_FUNCTION_VERSION;
    const body = (await req.json().catch(() => {
      throw new HttpError(400, "invalid_body");
    })) as Record<string, unknown>;

    if (body.action === "requestPasswordByEmail") {
      return json(await requestPasswordByEmail(body));
    }
    if (body.action === "checkPasswordRequestByEmail") {
      return json(await checkPasswordRequestByEmail(body));
    }
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) throw new HttpError(401, "unauthenticated");
    const claims = await verifyFirebaseToken(token);
    const actor = await resolveActor(claims);
    return json(await performAction(actor, body));
  } catch (err) {
    if (err instanceof HttpError) {
      return json({ error: err.code, details: err.details ?? null }, err.status);
    }
    console.error(err);
    return json({ error: "internal" }, 500);
  }
});
