"use client";

import Link from "next/link";
import { type SubmitEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import type { Profile } from "@/lib/users";

type Person = { side: "left" | "right"; name: string; count: number };
type AuditRow = { id: number; at: string; actor_username: string; action: string; target: string | null; details: Record<string, unknown> };

const input = "rounded-md bg-neutral-900 border border-neutral-600 px-3 py-2";
const smallBtn = "rounded-md border border-neutral-500 px-2 py-1 text-xs hover:bg-neutral-800 disabled:opacity-40";

export default function AdminPage() {
  const { loading, session, profile: me } = useProfile();
  const [users, setUsers] = useState<Profile[]>([]);
  const [log, setLog] = useState<AuditRow[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isAdmin = me?.role === "admin" && me.active;

  const reload = useCallback(async () => {
    const [u, a, p] = await Promise.all([
      supabase.from("profiles").select("*").order("username"),
      supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(200),
      supabase.from("people").select("side, name, count").order("side"),
    ]);
    if (u.error || a.error || p.error) setError("Couldn't load users, counts or the audit log.");
    setPeople((p.data as Person[]) ?? []);
    setUsers((u.data as Profile[]) ?? []);
    setLog((a.data as AuditRow[]) ?? []);
  }, []);

  useEffect(() => {
    if (isAdmin) void reload();
  }, [isAdmin, reload]);

  async function call(body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) setError(json.error ?? "Request failed");
    await reload();
    setBusy(false);
    return res.ok;
  }

  async function create(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const ok = await call({ action: "create", username: f.get("username"), password: f.get("password"), role: f.get("role") });
    if (ok) form.reset();
  }

  function setCount(e: SubmitEvent<HTMLFormElement>, side: Person["side"]) {
    e.preventDefault();
    void call({ action: "set_count", side, count: Number(new FormData(e.currentTarget).get("count")) });
  }

  function resetPassword(u: Profile) {
    const password = window.prompt(`New password for ${u.username} (8-72 characters):`);
    if (password) void call({ action: "reset_password", id: u.id, password });
  }

  function remove(u: Profile) {
    if (window.confirm(`Delete ${u.username}? Their audit history is kept.`)) void call({ action: "delete", id: u.id });
  }

  if (loading) return <main className="p-8">Loading...</main>;
  if (!me) {
    return (
      <main className="p-8">
        <Link href="/login?next=/admin" className="underline">Login</Link> to open the admin portal.
      </main>
    );
  }
  if (!isAdmin) return <main className="p-8">Admins only. <Link href="/" className="underline">Back to the board</Link></main>;

  return (
    <main className="mx-auto max-w-5xl flex flex-col gap-10 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Admin portal</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/" className="underline">Board</Link>
          <button type="button" onClick={() => void supabase.auth.signOut()} className="underline">Logout</button>
        </nav>
      </header>

      {error && <p role="alert" className="rounded-md bg-red-950 px-3 py-2 text-red-200">{error}</p>}

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Counts</h2>
        <div className="flex flex-wrap gap-6">
          {people.map((p) => (
            // key includes count so the box resets to the saved value after each change
            <form key={`${p.side}-${p.count}`} onSubmit={(e) => setCount(e, p.side)} className="flex items-end gap-3">
              <label className="flex flex-col gap-1 text-sm">
                {p.name} <span className="text-neutral-400">(now {p.count})</span>
                <input name="count" type="number" step={1} required defaultValue={p.count} className={`${input} w-32`} />
              </label>
              <button type="submit" disabled={busy} className="rounded-lg bg-red-700 px-4 py-2 font-medium hover:bg-red-600 disabled:opacity-50">Set</button>
            </form>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Create user</h2>
        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Username
            <input name="username" required pattern="[a-z0-9_]{3,32}" title="3-32 characters: a-z, 0-9 or _" autoCapitalize="none" className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Password
            <input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Role
            <select name="role" defaultValue="user" className={input}>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <button type="submit" disabled={busy} className="rounded-lg bg-red-700 px-4 py-2 font-medium hover:bg-red-600 disabled:opacity-50">Create</button>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Users ({users.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-neutral-400">
              <tr><th className="py-2">Username</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const self = u.id === me.id;
                return (
                  <tr key={u.id} className="border-t border-neutral-800">
                    <td className="py-2 font-medium">{u.username}{self && " (you)"}</td>
                    <td>
                      <select
                        aria-label={`Role for ${u.username}`}
                        value={u.role}
                        disabled={busy || self}
                        onChange={(e) => void call({ action: "set_role", id: u.id, role: e.target.value })}
                        className="rounded bg-neutral-900 border border-neutral-700 px-1 py-0.5"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className={u.active ? "text-green-400" : "text-red-400"}>{u.active ? "active" : "disabled"}</td>
                    <td className="text-neutral-400">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="flex flex-wrap gap-2 py-2">
                      <button type="button" disabled={busy} onClick={() => resetPassword(u)} className={smallBtn}>Reset password</button>
                      <button type="button" disabled={busy || self} onClick={() => void call({ action: "set_active", id: u.id, active: !u.active })} className={smallBtn}>
                        {u.active ? "Disable" : "Enable"}
                      </button>
                      <button type="button" disabled={busy || self} onClick={() => remove(u)} className={`${smallBtn} text-red-300`}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Audit trail <span className="text-sm font-normal text-neutral-400">(latest 200)</span></h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-neutral-400">
              <tr><th className="py-2">When</th><th>Who</th><th>Action</th><th>Target</th><th>Details</th></tr>
            </thead>
            <tbody>
              {log.map((r) => (
                <tr key={r.id} className="border-t border-neutral-800">
                  <td className="py-2 whitespace-nowrap text-neutral-400">{new Date(r.at).toLocaleString()}</td>
                  <td className="font-medium">{r.actor_username}</td>
                  <td>{r.action}</td>
                  <td>{r.target}</td>
                  <td className="font-mono text-xs text-neutral-400">{Object.keys(r.details).length ? JSON.stringify(r.details) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
