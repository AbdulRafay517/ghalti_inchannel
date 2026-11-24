"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type SubmitEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import { usernameToEmail } from "@/lib/users";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(String(form.get("username"))),
      password: String(form.get("password")),
    });
    setBusy(false);
    if (error) return setError(error.code === "user_banned" ? "This account is disabled." : "Wrong username or password.");
    const next = new URLSearchParams(window.location.search).get("next");
    // Only same-site paths, so ?next= can't bounce someone to another site.
    router.push(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm flex flex-col gap-4 rounded-xl border-2 border-red-700 bg-black/60 p-6">
        <h1 className="text-2xl font-bold text-center">Login</h1>
        <label className="flex flex-col gap-1 text-sm">
          Username
          <input name="username" required autoComplete="username" autoCapitalize="none" className="rounded-md bg-neutral-900 border border-neutral-600 px-3 py-2 text-base" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input name="password" type="password" required autoComplete="current-password" className="rounded-md bg-neutral-900 border border-neutral-600 px-3 py-2 text-base" />
        </label>
        {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}
        <button type="submit" disabled={busy} className="rounded-lg bg-red-700 text-white py-3 font-medium hover:bg-red-600 disabled:opacity-50">
          {busy ? "Logging in..." : "Login"}
        </button>
        <Link href="/" className="text-center text-sm text-neutral-400 hover:text-white">Back to the board</Link>
      </form>
    </main>
  );
}
