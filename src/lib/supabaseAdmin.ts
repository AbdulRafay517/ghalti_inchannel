// Server only: uses the service role key. Never import this from a "use client" file.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./users";

let client: SupabaseClient | null = null;

// Lazy so `next build` (which has no service key) doesn't throw at import time.
export function adminClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

// Resolves the caller from their bearer token; null unless they are an active admin.
export async function requireAdmin(req: Request): Promise<Profile | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  const db = adminClient();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: me } = await db.from("profiles").select("*").eq("id", data.user.id).maybeSingle<Profile>();
  return me?.role === "admin" && me.active ? me : null;
}

export async function audit(actor: Profile, action: string, target: string, details: Record<string, unknown> = {}) {
  const { error } = await adminClient()
    .from("audit_log")
    .insert({ actor_id: actor.id, actor_username: actor.username, action, target, details });
  if (error) throw error;
}
