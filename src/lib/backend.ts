/**
 * ============================================================================
 * BACKEND ABSTRACTION LAYER — PLUTO (Supabase-compatible) IMPLEMENTATION
 * ============================================================================
 * All calls go through the Pluto client in `./pluto-client.ts`. Row-level
 * security on the Pluto side is what actually protects the data — the anon
 * key shipped to the browser is safe by design.
 *
 * See BACKEND_INTEGRATION.md for the required table schema and RLS policies.
 * ============================================================================
 */
import { pluto } from "./pluto-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type User = {
  id: string;
  email: string;
  name: string;
};

export type Admission = {
  id: string;                 // form/admission number (text primary key)
  createdAt: string;          // ISO date
  createdBy: string;          // user id (uuid)
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
// Row <-> Domain mapping (DB uses snake_case)
// ---------------------------------------------------------------------------
type AdmissionRow = {
  id: string;
  created_at: string;
  created_by: string;
  student_name: string;
  date_of_birth: string;
  gender: "male" | "female" | "other";
  blood_group: string | null;
  religion: string | null;
  nationality: string | null;
  previous_school: string | null;
  class_applying_for: string;
  father_name: string;
  mother_name: string;
  guardian_name: string | null;
  mobile: string;
  alternate_mobile: string | null;
  email: string | null;
  address: string;
  city: string | null;
  postal_code: string | null;
  notes: string | null;
};

function rowToAdmission(r: AdmissionRow): Admission {
  return {
    id: r.id,
    createdAt: r.created_at,
    createdBy: r.created_by,
    studentName: r.student_name,
    dateOfBirth: r.date_of_birth,
    gender: r.gender,
    bloodGroup: r.blood_group ?? undefined,
    religion: r.religion ?? undefined,
    nationality: r.nationality ?? undefined,
    previousSchool: r.previous_school ?? undefined,
    classApplyingFor: r.class_applying_for,
    fatherName: r.father_name,
    motherName: r.mother_name,
    guardianName: r.guardian_name ?? undefined,
    mobile: r.mobile,
    alternateMobile: r.alternate_mobile ?? undefined,
    email: r.email ?? undefined,
    address: r.address,
    city: r.city ?? undefined,
    postalCode: r.postal_code ?? undefined,
    notes: r.notes ?? undefined,
  };
}

function admissionToRow(
  a: Partial<Omit<Admission, "id" | "createdAt" | "createdBy">>,
): Partial<Omit<AdmissionRow, "id" | "created_at" | "created_by">> {
  const out: Record<string, unknown> = {};
  if (a.studentName !== undefined) out.student_name = a.studentName;
  if (a.dateOfBirth !== undefined) out.date_of_birth = a.dateOfBirth;
  if (a.gender !== undefined) out.gender = a.gender;
  if (a.bloodGroup !== undefined) out.blood_group = a.bloodGroup || null;
  if (a.religion !== undefined) out.religion = a.religion || null;
  if (a.nationality !== undefined) out.nationality = a.nationality || null;
  if (a.previousSchool !== undefined) out.previous_school = a.previousSchool || null;
  if (a.classApplyingFor !== undefined) out.class_applying_for = a.classApplyingFor;
  if (a.fatherName !== undefined) out.father_name = a.fatherName;
  if (a.motherName !== undefined) out.mother_name = a.motherName;
  if (a.guardianName !== undefined) out.guardian_name = a.guardianName || null;
  if (a.mobile !== undefined) out.mobile = a.mobile;
  if (a.alternateMobile !== undefined) out.alternate_mobile = a.alternateMobile || null;
  if (a.email !== undefined) out.email = a.email || null;
  if (a.address !== undefined) out.address = a.address;
  if (a.city !== undefined) out.city = a.city || null;
  if (a.postalCode !== undefined) out.postal_code = a.postalCode || null;
  if (a.notes !== undefined) out.notes = a.notes || null;
  return out as Partial<Omit<AdmissionRow, "id" | "created_at" | "created_by">>;
}

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

// Keep cache in sync with Pluto auth state.
if (typeof window !== "undefined") {
  pluto.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      cacheUser(null);
      return;
    }
    const u = session.user;
    cacheUser({
      id: u.id,
      email: u.email ?? "",
      name: (u.user_metadata?.name as string | undefined) ?? u.email ?? "",
    });
  });
}

// ===========================================================================
// AUTH
// ===========================================================================
export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const { data, error } = await pluto.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { name: input.name } },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Sign-up did not return a user");
  const user: User = {
    id: data.user.id,
    email: data.user.email ?? input.email,
    name: input.name,
  };
  cacheUser(user);
  return user;
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<User> {
  const { data, error } = await pluto.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Sign-in did not return a user");
  const user: User = {
    id: data.user.id,
    email: data.user.email ?? input.email,
    name: (data.user.user_metadata?.name as string | undefined) ?? input.email,
  };
  cacheUser(user);
  return user;
}

export async function signOut(): Promise<void> {
  await pluto.auth.signOut();
  cacheUser(null);
}

/** Synchronous — reads the cached user from localStorage. */
export function getCurrentUser(): User | null {
  return readCachedUser();
}

/** Re-fetches the current session from Pluto and refreshes the cache. */
export async function refreshCurrentUser(): Promise<User | null> {
  const { data } = await pluto.auth.getUser();
  if (!data.user) {
    cacheUser(null);
    return null;
  }
  const user: User = {
    id: data.user.id,
    email: data.user.email ?? "",
    name: (data.user.user_metadata?.name as string | undefined) ?? data.user.email ?? "",
  };
  cacheUser(user);
  return user;
}

// ===========================================================================
// ADMISSIONS (CRUD + search)
// ===========================================================================
const TABLE = "admissions";

function generateFormNumber(): string {
  // Human-readable form number: ADM-<yyyymmdd>-<random 4>
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ADM-${ymd}-${rand}`;
}

export async function createAdmission(
  input: Omit<Admission, "id" | "createdAt" | "createdBy">,
  userId: string,
): Promise<Admission> {
  const row = {
    id: generateFormNumber(),
    created_by: userId,
    ...admissionToRow(input),
  };
  const { data, error } = await pluto
    .from(TABLE)
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToAdmission(data as AdmissionRow);
}

export async function listAdmissions(): Promise<Admission[]> {
  const { data, error } = await pluto
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as AdmissionRow[]).map(rowToAdmission);
}

export async function getAdmission(id: string): Promise<Admission | null> {
  const { data, error } = await pluto
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToAdmission(data as AdmissionRow) : null;
}

export async function updateAdmission(
  id: string,
  patch: Partial<Omit<Admission, "id" | "createdAt" | "createdBy">>,
): Promise<Admission> {
  const { data, error } = await pluto
    .from(TABLE)
    .update(admissionToRow(patch))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToAdmission(data as AdmissionRow);
}

export async function deleteAdmission(id: string): Promise<void> {
  const { error } = await pluto.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Search by form number (id), student name, or mobile.
 * Uses PostgREST `or` filter with `ilike` for case-insensitive matching.
 */
export async function searchAdmissions(query: string): Promise<Admission[]> {
  const q = query.trim();
  if (!q) return [];
  const esc = q.replace(/[,()]/g, " ");
  const pattern = `*${esc}*`;
  const { data, error } = await pluto
    .from(TABLE)
    .select("*")
    .or(
      `id.ilike.${pattern},student_name.ilike.${pattern},mobile.ilike.${pattern}`,
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data as AdmissionRow[]).map(rowToAdmission);
}
