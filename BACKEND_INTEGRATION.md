# Backend Integration Guide

This app is built so the **entire backend lives in one file**:
`src/lib/backend.ts`.

Right now it stores data in the browser's `localStorage` so you can try
everything end-to-end. When you're ready to wire a real backend
(Supabase, Firebase, or your own REST API), you only edit that one file.
Nothing else in the UI needs to change.

## The contract you must implement

```ts
signUp({ name, email, password })  -> User
signIn({ email, password })        -> User
signOut()                          -> void
getCurrentUser()                   -> User | null   // sync

createAdmission(data, userId)      -> Admission
listAdmissions()                   -> Admission[]
getAdmission(id)                   -> Admission | null
searchAdmissions(query)            -> Admission[]   // match id / studentName / mobile
```

Every function is async (except `getCurrentUser`). Keep the same
signatures and the UI keeps working.

---

## Option A — Supabase

### 1. Install
```bash
bun add @supabase/supabase-js
```

### 2. Create a client
`src/lib/supabase.ts`
```ts
import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
);
```

Add to `.env`:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### 3. SQL schema
```sql
create table public.admissions (
  id text primary key,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  date_of_birth date not null,
  gender text not null check (gender in ('male','female','other')),
  blood_group text,
  religion text,
  nationality text,
  previous_school text,
  class_applying_for text not null,
  father_name text not null,
  mother_name text not null,
  guardian_name text,
  mobile text not null,
  alternate_mobile text,
  email text,
  address text not null,
  city text,
  postal_code text,
  notes text
);

grant select, insert, update, delete on public.admissions to authenticated;
grant select on public.admissions to anon;   -- allows public search on homepage
grant all on public.admissions to service_role;

alter table public.admissions enable row level security;

create policy "public can read" on public.admissions
  for select to anon, authenticated using (true);

create policy "authenticated can insert" on public.admissions
  for insert to authenticated with check (auth.uid() = created_by);

create policy "owner can update/delete" on public.admissions
  for update to authenticated using (auth.uid() = created_by);
```

### 4. Replace `src/lib/backend.ts` bodies
Every function already has a commented `Supabase:` block showing the
exact call. Uncomment those and delete the `localStorage` code.

---

## Option B — Firebase

### 1. Install
```bash
bun add firebase
```

### 2. Init
`src/lib/firebase.ts`
```ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const app = initializeApp({ /* your config */ });
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### 3. Map the contract

| Backend fn        | Firebase call |
|-------------------|---------------|
| `signUp`          | `createUserWithEmailAndPassword` + `updateProfile({ displayName })` |
| `signIn`          | `signInWithEmailAndPassword` |
| `signOut`         | `signOut(auth)` |
| `getCurrentUser`  | `auth.currentUser` mapped to `User` |
| `createAdmission` | `addDoc(collection(db,'admissions'), {...})` with a generated id (use `setDoc` so you keep the `ADM-YYYY-NNNNNN` form number) |
| `listAdmissions`  | `getDocs(query(collection(db,'admissions'), orderBy('createdAt','desc')))` |
| `getAdmission`    | `getDoc(doc(db,'admissions',id))` |
| `searchAdmissions`| Firestore has no `OR ilike` — either denormalize a lowercase `searchTokens` array and use `array-contains`, or run three parallel queries (by id, by studentNameLower prefix, by mobile) and merge. |

For real-time auth state, replace `getCurrentUser` semantics by having
`src/lib/auth-context.tsx` subscribe to `onAuthStateChanged(auth, ...)`
inside its `useEffect`, and setting the user from that callback.

---

## Option C — Your own REST API

Replace each function with a `fetch` call. Example:
```ts
export async function signIn({ email, password }) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  const user = await res.json();
  localStorage.setItem("sa_session", JSON.stringify(user)); // keep session sync
  return user;
}
```

Keep `getCurrentUser` synchronous by caching the session in
`localStorage` after login (as the default implementation does).

---

## Files reference

| File | Purpose |
|------|---------|
| `src/lib/backend.ts`         | **The only file you edit for backend** |
| `src/lib/auth-context.tsx`   | React context wrapping backend auth |
| `src/routes/__root.tsx`      | Layout, header, providers |
| `src/routes/index.tsx`       | Homepage with search box |
| `src/routes/auth.tsx`        | Sign in / Sign up (public) |
| `src/routes/_authenticated/route.tsx`   | Route guard |
| `src/routes/_authenticated/admission.tsx` | Admission form (protected) |
| `src/routes/_authenticated/admissions.tsx`| All records list (protected) |
| `src/routes/student.$id.tsx` | Student detail page (public, linked from search) |
