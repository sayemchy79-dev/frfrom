# Backend Integration Guide — Custom REST API

This frontend talks to **your own REST backend** through a single tiny
client at `src/lib/api-client.ts`. All app-level calls go through
`src/lib/backend.ts`, which is just a thin wrapper around that client.

You do **not** need to change any UI code. Just:

1. Set `VITE_API_BASE_URL` in `.env` to point at your backend.
2. Implement the endpoints listed below with the request/response shapes
   described.

That's it — the whole app (auth, form submit, list, edit, delete, search,
pagination) will work.

---

## 1. Environment variables

`.env` (already scaffolded — copy from `.env.example`):

```
VITE_API_BASE_URL=http://localhost:4000/api
VITE_API_KEY=              # optional: static X-Api-Key header
```

- `VITE_API_BASE_URL` — no trailing slash. Every endpoint path below is
  appended to this.
- `VITE_API_KEY` — optional. If set, sent as `X-Api-Key: <value>` on every
  request (useful for gateway-level auth or Postman/Firebase-style project
  keys).

Per-user auth uses a JWT that your `/auth/login` endpoint returns; the
frontend stores it in `localStorage` under `sa_token` and sends it as
`Authorization: Bearer <token>` on every request automatically.

---

## 2. Authentication endpoints

All auth endpoints return the same shape:

```jsonc
{
  "token": "<jwt or opaque token>",
  "user": { "id": "u_123", "email": "a@b.com", "name": "Ada" }
}
```

### `POST /auth/signup`
Request:
```json
{ "name": "Ada Lovelace", "email": "a@b.com", "password": "secret123" }
```
Response: `{ token, user }` — same shape as above.

- 409 if the email already exists (`{ "message": "Email already in use" }`).

### `POST /auth/login`
Request:
```json
{ "email": "a@b.com", "password": "secret123" }
```
Response: `{ token, user }`.

- 401 on invalid credentials (`{ "message": "Invalid email or password" }`).

### `POST /auth/logout`
No body. Response: `{}` (any 2xx is fine).
Invalidate the token server-side if you keep a session table.

### `GET /auth/me`  (optional but recommended)
Authenticated. Response: `{ "user": { id, email, name } }`.
Used by `refreshCurrentUser()` on app boot to make sure a stale token in
localStorage still works.

---

## 3. Admission endpoints

All admission endpoints require `Authorization: Bearer <token>` **except**
`GET /admissions/:id` and `GET /admissions/search`, which the homepage
uses without a login. If you want to lock those down too, add auth there
and the app still works (the user will just have to be logged in).

### The `Admission` object

```ts
{
  id: string;              // form number, e.g. "ADM-2026-000123"
  createdAt: string;       // ISO 8601
  createdBy: string;       // user id

  studentName: string;
  dateOfBirth: string;     // "YYYY-MM-DD"
  gender: "male" | "female" | "other";
  bloodGroup?: string;
  religion?: string;
  nationality?: string;
  previousSchool?: string;
  classApplyingFor: string;

  fatherName: string;
  motherName: string;
  guardianName?: string;

  mobile: string;
  alternateMobile?: string;
  email?: string;
  address: string;
  city?: string;
  postalCode?: string;

  notes?: string;
}
```

The backend is responsible for generating `id` and `createdAt` and setting
`createdBy` from the auth token — the frontend does **not** send them on
create.

### `POST /admissions`  *(auth required)*
Body: an `Admission` **without** `id`, `createdAt`, `createdBy`.
Response: the full created `Admission`.

### `GET /admissions`  *(auth required)*
Response: `Admission[]`, ordered by `createdAt` desc.

### `GET /admissions/:id`
Response: single `Admission`, or `404` if not found.

### `PATCH /admissions/:id`  *(auth required)*
Body: any subset of `Admission` fields (except `id`, `createdAt`,
`createdBy`).
Response: the updated `Admission`.

### `DELETE /admissions/:id`  *(auth required)*
Response: `204 No Content` or `{}`.

### `GET /admissions/search?q=<query>`
Case-insensitive partial match against `id`, `studentName`, and `mobile`.
Response: `Admission[]`.

---

## 4. Error format

Any non-2xx response should return JSON like:

```json
{ "message": "Human-readable error" }
```

`error` is also accepted as an alias. The frontend surfaces `message` in
toasts.

---

## 5. CORS

Your backend must allow the frontend origin. Minimum headers to allow:

```
Access-Control-Allow-Origin: <your frontend origin, or *>
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Api-Key
Access-Control-Allow-Credentials: true
```

The client sends `credentials: "include"`, so if you use cookies for auth
you must echo an explicit origin (not `*`).

---

## 6. Reference SQL schema (Postgres)

Non-normative — use whatever DB you want. This mirrors the `Admission`
type one-to-one.

```sql
create table users (
  id           text primary key,
  email        text unique not null,
  name         text not null,
  password_hash text not null,
  created_at   timestamptz not null default now()
);

create table admissions (
  id                  text primary key,     -- e.g. ADM-2026-000123
  created_at          timestamptz not null default now(),
  created_by          text not null references users(id) on delete cascade,

  student_name        text not null,
  date_of_birth       date not null,
  gender              text not null check (gender in ('male','female','other')),
  blood_group         text,
  religion            text,
  nationality         text,
  previous_school     text,
  class_applying_for  text not null,

  father_name         text not null,
  mother_name         text not null,
  guardian_name       text,

  mobile              text not null,
  alternate_mobile    text,
  email               text,
  address             text not null,
  city                text,
  postal_code         text,

  notes               text
);

create index admissions_student_name_idx on admissions (lower(student_name));
create index admissions_mobile_idx        on admissions (mobile);
```

---

## 7. Minimal Node/Express reference (server side)

Just to show the exact wire format — you can implement in any language.

```js
// POST /auth/login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await db.users.findByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

// GET /api/admissions/search?q=...
app.get("/api/admissions/search", async (req, res) => {
  const q = `%${(req.query.q || "").toLowerCase()}%`;
  const rows = await db.query(
    `select * from admissions
       where lower(id) like $1
          or lower(student_name) like $1
          or lower(mobile) like $1
       order by created_at desc
       limit 100`,
    [q],
  );
  res.json(rows.map(toAdmissionDTO));
});
```

---

## 8. Files reference

| File                          | Purpose |
|-------------------------------|---------|
| `.env` / `.env.example`       | `VITE_API_BASE_URL`, optional `VITE_API_KEY` |
| `src/lib/api-client.ts`       | Generic `fetch` wrapper (auth, headers, errors) |
| `src/lib/backend.ts`          | Maps app operations onto the REST endpoints above |
| `src/lib/auth-context.tsx`    | React context wrapping the auth calls |
| `src/routes/__root.tsx`       | Layout, header, providers |
| `src/routes/index.tsx`        | Homepage with debounced search + pagination |
| `src/routes/auth.tsx`         | Sign in / Sign up |
| `src/routes/_authenticated/*` | Protected routes (form, list, edit) |
| `src/routes/student.$id.tsx`  | Public student detail page |

If you later want to switch to Supabase/Firebase/Appwrite, only
`src/lib/backend.ts` (and optionally `api-client.ts`) needs to change —
nothing in the UI depends on the transport.
