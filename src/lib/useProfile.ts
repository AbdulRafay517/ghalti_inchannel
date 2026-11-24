"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Profile } from "./users";

export type Auth = { loading: boolean; session: Session | null; profile: Profile | null };

// Browser-only session (localStorage) plus the caller's own profile row.
export function useProfile(): Auth {
  const [auth, setAuth] = useState<Auth>({ loading: true, session: null, profile: null });

  useEffect(() => {
    let alive = true;
    async function load(session: Session | null) {
      const profile = session
        ? (await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle<Profile>()).data
        : null;
      if (alive) setAuth({ loading: false, session, profile });
    }
    void supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Token refreshes don't change who's logged in; skip the extra query.
      if (event !== "TOKEN_REFRESHED") void load(session);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return auth;
}
