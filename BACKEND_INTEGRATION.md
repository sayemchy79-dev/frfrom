# Pluto Backend Integration

The app talks to **Pluto** (a Supabase / PostgREST-compatible BaaS) through
`@supabase/supabase-js`, which is 100% API-compatible with the snippet in the
Pluto docs. If Pluto later publishes an official `@pluto/js` package, swap the
import in `src/lib/pluto-client.ts` — nothing else changes.

## 1. Environment variables

Copy `.env.example` to `.env` and fill in the values from your Pluto dashboard
(**Dashboard → Tokens**):

```env
VITE_PLUTO_URL=https://api.timescard.cloud
VITE_PLUTO_ANON_KEY=pk_anon_xxxxx
```

Both variables must be prefixed with `VITE_` so Vite exposes them to the
browser. **Never** put the service-role key (`sk_svc_...`) in a `VITE_*`
variable — it bypasses row-level security and must stay on your own server.

## 2. Database schema

Run this SQL in the Pluto SQL editor. It creates one `admissions` table with
row-level security enabled.

```sql
create table public.admissions (
  id                  text primary key,                       -- form number, e.g. ADM-20260706-4821
  created_at          timestamptz not null default now(),
  created_by          uuid not null references auth.users(id) on delete cascade,

  -- Student
  student_name        text not null,
  date_of_birth       date not null,
  gender              text not null check (gender in ('male','female','other')),
  blood_group         text,
  religion            text,
  nationality         text,
  previous_school     text,
  class_applying_for  text not null,

  -- Parents
  father_name         text not null,
  mother_name         text not null,
  guardian_name       text,

  -- Contact
  mobile              text not null,
  alternate_mobile    text,
  email               text,
  address             text not null,
  city                text,
  postal_code         text,

  notes               text
);

-- Search performance
create index admissions_student_name_trgm on public.admissions using gin (student_name gin_trgm_ops);
create index admissions_mobile_idx        on public.admissions (mobile);
create index admissions_created_at_idx    on public.admissions (created_at desc);

-- Grants (PostgREST won't expose the table without these)
grant select, insert, update, delete on public.admissions to authenticated;

-- Row Level Security
alter table public.admissions enable row level security;

create policy "auth users can read all admissions"
  on public.admissions for select to authenticated using (true);

create policy "auth users can insert their own"
  on public.admissions for insert to authenticated
  with check (created_by = auth.uid());

create policy "auth users can update any admission"
  on public.admissions for update to authenticated using (true);

create policy "auth users can delete any admission"
  on public.admissions for delete to authenticated using (true);
```

> Adjust the update/delete policies to `using (created_by = auth.uid())` if
> you want each user to manage only their own records.

## 3. Auth

Email/password auth is turned on by default in Pluto. Sign-up stores the
user's display name inside `user_metadata.name`, which the frontend reads back
via `pluto.auth.getUser()`.

Recommended dashboard settings:

- Enable **Email/Password** provider.
- Disable **Confirm email** for local development, re-enable in production.
- Set the **Site URL** to your deployed frontend URL.

## 4. Frontend surface

Everything the UI needs lives in **`src/lib/backend.ts`**:

| Function                              | What it does                                    |
| ------------------------------------- | ----------------------------------------------- |
| `signUp / signIn / signOut`           | Wraps `pluto.auth.*`                            |
| `getCurrentUser / refreshCurrentUser` | Cached + live session lookup                    |
| `createAdmission`                     | Inserts into `admissions`, generates form no.   |
| `listAdmissions`                      | Newest-first list                               |
| `getAdmission(id)`                    | Fetch by form number                            |
| `updateAdmission(id, patch)`          | Partial update                                  |
| `deleteAdmission(id)`                 | Delete row                                      |
| `searchAdmissions(q)`                 | Case-insensitive search on id / name / mobile   |

All calls go through the shared client in **`src/lib/pluto-client.ts`**.

## 5. Switching providers later

If you move from Pluto to real Supabase, Firebase, or your own API, only
`src/lib/pluto-client.ts` and `src/lib/backend.ts` need to change. Every route
and component imports the same typed functions from `@/lib/backend`.
