/**
 * ============================================================================
 * PLUTO CLIENT (browser + auth)
 * ============================================================================
 * Pluto's API is Supabase / PostgREST-compatible, so we use
 * `@supabase/supabase-js` and point it at the Pluto gateway.
 *
 *   const pluto = createClient(PLUTO_URL, PLUTO_ANON_KEY);
 *
 * Session is persisted in localStorage and refreshed automatically, so login
 * survives reloads and expired access tokens are transparently swapped.
 * The service-role client lives in `pluto-admin.server.ts` and is ONLY
 * imported by server functions — never ship it to the browser.
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

export const pluto = createClient(
  PLUTO_URL ?? "http://localhost",
  PLUTO_ANON_KEY ?? "anon",
  {
    auth: {
      // Persist the session across reloads.
      persistSession: true,
      // Silently refresh the access token before it expires.
      autoRefreshToken: true,
      // Handle magic-link / OAuth callbacks that append tokens to the URL.
      detectSessionInUrl: true,
      storageKey: "sa_pluto_session",
      flowType: "pkce",
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  },
);
