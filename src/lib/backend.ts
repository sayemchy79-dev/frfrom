/**
 * ============================================================================
 * BACKEND ABSTRACTION LAYER — REST API IMPLEMENTATION
 * ============================================================================
 *
 * This file talks to YOUR own REST backend via `src/lib/api-client.ts`.
 * The base URL is configured through `VITE_API_BASE_URL` in `.env`.
 *
 * The exact endpoint contract your backend must implement is documented in
 * `BACKEND_INTEGRATION.md`. As long as your server matches that contract,
 * the whole app will work without any other code changes.
 * ============================================================================
 */

import { apiRequest, setToken } from "./api-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type User = {
  id: string;
  email: string;
  name: string;
};

export type Admission = {
  id: string;                 // form/admission number
  createdAt: string;          // ISO date
  createdBy: string;          // user id
  // Student
  studentName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  bloodGroup?: string;
  religion?: string;
  nationality?: string;
  previousSchool?: string;
  classApplyingFor: string;
  // Parents
  fatherName: string;
  motherName: string;
  guardianName?: string;
  // Contact
  mobile: string;
  alternateMobile?: string;
  email?: string;
  address: string;
  city?: string;
  postalCode?: string;
  // Extra
  notes?: string;
};

// ---------------------------------------------------------------------------
// Session cache (so `getCurrentUser` can stay synchronous)
// ---------------------------------------------------------------------------
const LS_SESSION = "sa_session";

function cacheUser(user: User | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(LS_SESSION, JSON.stringify(user));
  else window.localStorage.removeItem(LS_SESSION);
}
function readCachedUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_SESSION);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

type AuthResponse = { token: string; user: User };

// ===========================================================================
// AUTH
// ===========================================================================

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const res = await apiRequest<AuthResponse>("/auth/signup", {
    method: "POST",
    body: input,
    anonymous: true,
  });
  setToken(res.token);
  cacheUser(res.user);
  return res.user;
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<User> {
  const res = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: input,
    anonymous: true,
  });
  setToken(res.token);
  cacheUser(res.user);
  return res.user;
}

export async function signOut(): Promise<void> {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch {
    // Ignore — we still clear the client session below.
  }
  setToken(null);
  cacheUser(null);
}

/**
 * Synchronous — reads the cached user from localStorage.
 * Populated by signIn / signUp above. To re-validate against the server
 * on app boot, call `refreshCurrentUser()` (async) from your AuthProvider.
 */
export function getCurrentUser(): User | null {
  return readCachedUser();
}

/** Optional: re-fetches /auth/me to make sure the cached user is still valid. */
export async function refreshCurrentUser(): Promise<User | null> {
  try {
    const res = await apiRequest<{ user: User }>("/auth/me");
    cacheUser(res.user);
    return res.user;
  } catch {
    setToken(null);
    cacheUser(null);
    return null;
  }
}

// ===========================================================================
// ADMISSIONS (CRUD + search)
// ===========================================================================

export async function createAdmission(
  input: Omit<Admission, "id" | "createdAt" | "createdBy">,
  _userId: string,
): Promise<Admission> {
  // `createdBy` is derived server-side from the auth token, so we don't send it.
  return apiRequest<Admission>("/admissions", {
    method: "POST",
    body: input,
  });
}

export async function listAdmissions(): Promise<Admission[]> {
  return apiRequest<Admission[]>("/admissions");
}

export async function getAdmission(id: string): Promise<Admission | null> {
  try {
    return await apiRequest<Admission>(`/admissions/${encodeURIComponent(id)}`);
  } catch (err) {
    if (err instanceof Error && "status" in err && (err as { status: number }).status === 404) {
      return null;
    }
    throw err;
  }
}

export async function updateAdmission(
  id: string,
  patch: Partial<Omit<Admission, "id" | "createdAt" | "createdBy">>,
): Promise<Admission> {
  return apiRequest<Admission>(`/admissions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
}

export async function deleteAdmission(id: string): Promise<void> {
  await apiRequest(`/admissions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/**
 * Search by form number, student name, or mobile.
 * The backend should match case-insensitively on all three fields.
 */
export async function searchAdmissions(query: string): Promise<Admission[]> {
  const q = query.trim();
  if (!q) return [];
  return apiRequest<Admission[]>("/admissions/search", {
    query: { q },
  });
}
