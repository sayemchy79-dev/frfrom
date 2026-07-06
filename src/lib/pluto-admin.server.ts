/**
 * ============================================================================
 * PLUTO ADMIN CLIENT — SERVER ONLY
 * ============================================================================
 * Uses the service-role key (`PLUTO_SERVICE_ROLE_KEY`) which BYPASSES row-
 * level security. This file MUST NEVER be imported from browser code — the
 * `.server.ts` suffix and the lack of a `VITE_` prefix on the env var are
 * the two guardrails that keep it out of the client bundle.
 *
 * Import only from `.functions.ts` handlers or `src/routes/api/**` server
 * routes, and only inside `.handler(async () => { const { plutoAdmin } =
 * await import("@/lib/pluto-admin.server"); ... })` so nothing leaks into
 * the client module graph.
 * ============================================================================
 */
import { createClient } from "@supabase/supabase-js";

const PLUTO_URL = process.env.PLUTO_URL ?? process.env.VITE_PLUTO_URL;
const PLUTO_SERVICE_ROLE_KEY = process.env.PLUTO_SERVICE_ROLE_KEY;

if (!PLUTO_URL || !PLUTO_SERVICE_ROLE_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "[pluto-admin] Missing PLUTO_URL or PLUTO_SERVICE_ROLE_KEY — set them in your server env.",
  );
}

export const plutoAdmin = createClient(
  PLUTO_URL ?? "http://localhost",
  PLUTO_SERVICE_ROLE_KEY ?? "service-role",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);
