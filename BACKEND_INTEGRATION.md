# Pluto Backend Integration

The app talks to **Pluto** (a Supabase / PostgREST-compatible BaaS) through
`@supabase/supabase-js`. If Pluto ships an official `@pluto/js` package
later, swap the import in `src/lib/pluto-client.ts` and
`src/lib/pluto-admin.server.ts` — nothing else changes.

## 1. Environment variables

Copy `.env.example` to `.env`:

```env
# Browser (safe to ship in the JS bundle)
VITE_PLUTO_URL=https://api.timescard.cloud
VITE_PLUTO_ANON_KEY=pk_anon_xxxxx

# Server only — NEVER prefix with VITE_
PLUTO_URL=https://api.timescard.cloud
PLUTO_SERVICE_ROLE_KEY=sk_svc_xxxxx
```

> **Why not `VITE_PLUTO_SERVICE_ROLE_KEY`?** Any `VITE_*` value is inlined
> into the browser bundle. The service-role key bypasses row-level security,
> so exposing it in the client would let anyone in the world read, edit or
> wipe your database. It is used only from TanStack server functions
> (`src/lib/*.functions.ts`) via `src/lib/pluto-admin.server.ts`.

## 2. Database — one-shot SQL script

Open the Pluto SQL editor and run **`pluto-setup.sql`** from the project
root. It is idempotent (safe to re-run) and sets up:

- `pg_trgm` extension (for fast name search)
- `public.admissions` table with checks and constraints
- Indexes on `student_name` (trigram), `mobile`, `created_at`, `created_by`
- `updated_at` trigger
- Data API grants (`authenticated` only — no `anon` access)
- Row-Level Security policies:
  - **SELECT** — any signed-in user can read (needed for the search UI)
  - **INSERT** — must be authenticated and `created_by = auth.uid()`
  - **UPDATE / DELETE** — only the creator (`created_by = auth.uid()`)
- Adds the table to the `supabase_realtime` publication + `REPLICA IDENTITY FULL`
  so INSERT/UPDATE/DELETE stream to subscribed clients
- Convenience view `public.admissions_summary`

## 3. Auth

- Email/password. Sign-up stores the display name in `user_metadata.name`.
- Session is persisted in `localStorage` (`sa_pluto_session`) and refreshed
  automatically (`autoRefreshToken: true`). Login survives reloads.
- `AuthProvider` re-validates the session on mount via
  `refreshCurrentUser()` and subscribes to `onAuthStateChange`, so
  `TOKEN_REFRESHED` / cross-tab `SIGNED_IN` / `SIGNED_OUT` events keep every
  page in sync.

## 4. Realtime

`src/lib/backend.ts` exports two helpers built on `pluto.channel(...)`:

| Helper                              | Fires when                                   |
| ----------------------------------- | -------------------------------------------- |
| `subscribeToAdmissions(cb)`         | Any row in `admissions` is inserted/updated/deleted |
| `subscribeToAdmission(id, cb)`      | The single row `id=<form-number>` changes    |

Wired into the app:

- **Homepage search** (`src/routes/index.tsx`) — re-runs the current search
  whenever any admission changes.
- **Student detail** (`src/routes/student.$id.tsx`) — swaps in the new row
  on UPDATE, unmounts on DELETE.

Both helpers return an unsubscribe function; call it in the effect cleanup.

## 5. Server-side (service-role) surface

`src/lib/admissions.functions.ts` exposes two `createServerFn` endpoints for
privileged operations that must NOT be reachable from the browser directly:

- `adminDeleteAdmission({ id })`
- `adminUpdateAdmission({ id, patch })`

Every handler calls `requireAuthedUser()` first, which:

1. Reads the `Authorization: Bearer <token>` header off the request.
2. Verifies the token with `plutoAdmin.auth.getUser(token)`.
3. Throws `Unauthorized` if the caller has no valid session.

The bearer header is attached automatically by the TanStack Start client
runtime because `pluto` sends the current access token on every request.

To gate these functions further (e.g. an `admin` role), extend
`requireAuthedUser` to look up the caller's role via a `has_role()` RPC or a
`user_roles` table and throw when the check fails.

## 6. Frontend API surface

Everything the UI needs lives in **`src/lib/backend.ts`**:

| Function                              | What it does                                    |
| ------------------------------------- | ----------------------------------------------- |
| `signUp / signIn / signOut`           | Wraps `pluto.auth.*`                            |
| `getCurrentUser`                      | Sync — reads cached user                        |
| `refreshCurrentUser`                  | Async — re-fetches live session                 |
| `createAdmission`                     | Inserts a row, auto-generates form number       |
| `listAdmissions / getAdmission(id)`   | Read helpers                                    |
| `updateAdmission / deleteAdmission`   | Owner-only under RLS                            |
| `searchAdmissions(q)`                 | ilike on id / name / mobile (limit 50)          |
| `subscribeToAdmissions / subscribeToAdmission` | Realtime helpers                     |

## 7. Switching providers later

If you move from Pluto to real Supabase, Firebase, or your own API, only
`src/lib/pluto-client.ts`, `src/lib/pluto-admin.server.ts`, and
`src/lib/backend.ts` need to change. Every route and component imports the
same typed functions from `@/lib/backend`.
