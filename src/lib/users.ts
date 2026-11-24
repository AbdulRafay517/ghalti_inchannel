// Supabase Auth needs an email, so each username maps to an address on a domain nobody receives mail for.
const DOMAIN = "users.ghalti.local";

export type Role = "user" | "admin";
export type Profile = { id: string; username: string; role: Role; active: boolean; created_at: string };

export const usernameToEmail = (username: string): string => `${username.trim().toLowerCase()}@${DOMAIN}`;

export function usernameError(username: string): string | null {
  return /^[a-z0-9_]{3,32}$/.test(username) ? null : "Username must be 3-32 characters: a-z, 0-9 or _";
}

export function passwordError(password: string): string | null {
  return password.length >= 8 && password.length <= 72 ? null : "Password must be 8-72 characters";
}
