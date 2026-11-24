import { NextResponse } from "next/server";
import { adminClient, audit, requireAdmin } from "@/lib/supabaseAdmin";
import { passwordError, type Profile, type Role, usernameError, usernameToEmail } from "@/lib/users";

type Body =
  | { action: "create"; username: string; password: string; role: Role }
  | { action: "reset_password"; id: string; password: string }
  | { action: "set_active"; id: string; active: boolean }
  | { action: "set_role"; id: string; role: Role }
  | { action: "delete"; id: string };

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });
const isRole = (r: unknown): r is Role => r === "user" || r === "admin";
const BANNED_FOREVER = "876000h"; // ~100 years; Supabase has no permanent ban value

async function createUser(me: Profile, { username, password, role }: Extract<Body, { action: "create" }>) {
  const problem = usernameError(username) ?? passwordError(password) ?? (isRole(role) ? null : "Invalid role");
  if (problem) return fail(400, problem);

  const db = adminClient();
  const { data, error } = await db.auth.admin.createUser({ email: usernameToEmail(username), password, email_confirm: true });
  if (error) return fail(error.status === 422 ? 409 : 400, error.code === "email_exists" ? "Username already taken" : error.message);

  const { error: profileError } = await db.from("profiles").insert({ id: data.user.id, username, role });
  if (profileError) {
    await db.auth.admin.deleteUser(data.user.id); // don't leave a login with no profile behind
    return fail(400, profileError.code === "23505" ? "Username already taken" : profileError.message);
  }
  await audit(me, "user.create", username, { role });
  return NextResponse.json({ ok: true });
}

async function changeUser(me: Profile, body: Exclude<Body, { action: "create" }>) {
  const db = adminClient();
  const { data: target } = await db.from("profiles").select("*").eq("id", body.id).maybeSingle<Profile>();
  if (!target) return fail(404, "User not found");
  // An admin can't lock themselves out: no self-disable, self-demote or self-delete.
  if (target.id === me.id && body.action !== "reset_password") return fail(400, "You can't do that to your own account");

  switch (body.action) {
    case "reset_password": {
      const problem = passwordError(body.password);
      if (problem) return fail(400, problem);
      const { error } = await db.auth.admin.updateUserById(target.id, { password: body.password });
      if (error) return fail(400, error.message);
      await audit(me, "user.reset_password", target.username);
      break;
    }
    case "set_active": {
      const active = body.active === true;
      const { error } = await db.auth.admin.updateUserById(target.id, { ban_duration: active ? "none" : BANNED_FOREVER });
      if (error) return fail(400, error.message);
      const { error: dbError } = await db.from("profiles").update({ active }).eq("id", target.id);
      if (dbError) return fail(400, dbError.message);
      await audit(me, active ? "user.enable" : "user.disable", target.username);
      break;
    }
    case "set_role": {
      if (!isRole(body.role)) return fail(400, "Invalid role");
      const { error } = await db.from("profiles").update({ role: body.role }).eq("id", target.id);
      if (error) return fail(400, error.message);
      await audit(me, "user.set_role", target.username, { from: target.role, to: body.role });
      break;
    }
    case "delete": {
      const { error } = await db.auth.admin.deleteUser(target.id); // profile row cascades; audit rows stay
      if (error) return fail(400, error.message);
      await audit(me, "user.delete", target.username, { role: target.role });
      break;
    }
    default:
      return fail(400, "Unknown action");
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  try {
    const me = await requireAdmin(req);
    if (!me) return fail(403, "Admins only");
    const body = (await req.json()) as Body;
    return body.action === "create" ? await createUser(me, body) : await changeUser(me, body);
  } catch (e) {
    console.error("admin users route failed", e);
    return fail(500, "Something went wrong");
  }
}
