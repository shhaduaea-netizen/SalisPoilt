import { createClient } from "npm:@supabase/supabase-js@2";
import type { Role } from "./rules.ts";

export const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const MEMBER_SELECT =
  "id, email, firebase_uid, full_name_en, full_name_ar, user_id, username, phone, roster_order, role, company_id, branch_id, team_id, status, must_change_password, temp_password, custom_rank_id, companies(name), branches(name), teams(name), custom_ranks(id, name, name_ar, scope, rank_permissions(permission))";

export interface MemberRow {
  id: string;
  email: string;
  firebase_uid: string | null;
  full_name_en: string;
  full_name_ar: string | null;
  user_id: string;
  username: string;
  phone: string | null;
  roster_order: number | null;
  role: Role;
  company_id: string | null;
  branch_id: string | null;
  team_id: string | null;
  status: "Active" | "Suspended";
  must_change_password: boolean;
  temp_password: string | null;
  custom_rank_id: string | null;
  custom_ranks: { id: string; name: string; name_ar: string | null; scope: string | null; rank_permissions: { permission: string }[] } | null;
  companies: { name: string } | null;
  branches: { name: string } | null;
  teams: { name: string } | null;
}
