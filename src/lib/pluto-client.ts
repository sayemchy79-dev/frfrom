/**
 * ============================================================================
 * PLUTO CLIENT
 * ============================================================================
 * Pluto's API surface is Supabase / PostgREST-compatible, so we use
 * `@supabase/supabase-js` as the SDK and point it at the Pluto gateway.
 * Everything (`.auth`, `.from()`, `.storage`, `.channel`) works the same way
 * as the snippet in the Pluto docs:
 *
 *   const pluto = createClient(PLUTO_URL, PLUTO_ANON_KEY);
 *   await pluto.auth.signInWithPassword({ email, password });
 *   await pluto.from("posts").select("*");
 *
 * If Pluto ships an official `@pluto/js` package later, swap the import here —
 * nothing else in the app needs to change.
 * ============================================================================
 */
import { createClient } from "@supabase/supabase-js";

const PLUTO_URL = import.meta.env.VITE_PLUTO_URL as string | undefined;
const PLUTO_ANON_KEY = import.meta.env.VITE_PLUTO_ANON_KEY as string | undefined;

if (!PLUTO_URL || !PLUTO_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "[pluto] Missing VITE_PLUTO_URL or VITE_PLUTO_ANON_KEY — add them to your .env file.",
  );
}

export const pluto = createClient(PLUTO_URL ?? "http://localhost", PLUTO_ANON_KEY ?? "anon", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "sa_pluto_session",
  },
});
