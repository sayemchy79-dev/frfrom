/**
 * ============================================================================
 * BACKEND ABSTRACTION LAYER
 * ============================================================================
 *
 * This is the ONLY file you need to modify to connect a real backend
 * (Supabase, Firebase, custom REST API, etc.).
 *
 * The default implementation uses `localStorage` so the app is fully
 * functional out of the box for demo/dev. Replace the function bodies
 * below with real API calls when you wire up your backend.
 *
 * See BACKEND_INTEGRATION.md for step-by-step Supabase & Firebase examples.
 * ============================================================================
 */

export type User = {
  id: string;
  email: string;
  name: string;
};

export type Admission = {
  id: string;                 // form/admission number (auto-generated)
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
  mobile: string;             // primary searchable phone
  alternateMobile?: string;
  email?: string;
  address: string;
  city?: string;
  postalCode?: string;
  // Extra
  notes?: string;
};

// ---------------------------------------------------------------------------
// Storage keys (used only by the localStorage fallback)
// ---------------------------------------------------------------------------
const LS_USERS = "sa_users";
const LS_SESSION = "sa_session";
const LS_ADMISSIONS = "sa_admissions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
function formNumber() {
  // e.g. ADM-2026-000123
  const year = new Date().getFullYear();
  const n = Math.floor(Math.random() * 900000 + 100000);
  return `ADM-${year}-${n}`;
}

// ===========================================================================
// AUTH
// ===========================================================================

type StoredUser = User & { password: string };

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  // ---- Replace with Supabase / Firebase auth ----
  // Supabase:
  //   const { data, error } = await supabase.auth.signUp({
  //     email: input.email, password: input.password,
  //     options: { data: { name: input.name } }
  //   });
  //   if (error) throw error;
  //   return { id: data.user!.id, email: data.user!.email!, name: input.name };
  // -----------------------------------------------
  const users = read<StoredUser[]>(LS_USERS, []);
  if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("An account with this email already exists");
  }
  const user: StoredUser = {
    id: uid("u_"),
    name: input.name,
    email: input.email,
    password: input.password,
  };
  users.push(user);
  write(LS_USERS, users);
  const pub: User = { id: user.id, email: user.email, name: user.name };
  write(LS_SESSION, pub);
  return pub;
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<User> {
  // ---- Replace with Supabase / Firebase auth ----
  // Supabase:
  //   const { data, error } = await supabase.auth.signInWithPassword(input);
  //   if (error) throw error;
  //   return { id: data.user!.id, email: data.user!.email!,
  //            name: data.user!.user_metadata?.name ?? "" };
  // -----------------------------------------------
  const users = read<StoredUser[]>(LS_USERS, []);
  const found = users.find(
    (u) =>
      u.email.toLowerCase() === input.email.toLowerCase() &&
      u.password === input.password,
  );
  if (!found) throw new Error("Invalid email or password");
  const pub: User = { id: found.id, email: found.email, name: found.name };
  write(LS_SESSION, pub);
  return pub;
}

export async function signOut(): Promise<void> {
  // Supabase: await supabase.auth.signOut();
  if (typeof window !== "undefined") window.localStorage.removeItem(LS_SESSION);
}

export function getCurrentUser(): User | null {
  // Supabase: read from onAuthStateChange / getSession
  return read<User | null>(LS_SESSION, null);
}

// ===========================================================================
// ADMISSIONS (CRUD)
// ===========================================================================

export async function createAdmission(
  input: Omit<Admission, "id" | "createdAt" | "createdBy">,
  userId: string,
): Promise<Admission> {
  // ---- Replace with Supabase / Firebase ----
  // Supabase:
  //   const { data, error } = await supabase.from("admissions")
  //     .insert({ ...input, created_by: userId })
  //     .select().single();
  //   if (error) throw error;
  //   return data as Admission;
  // ------------------------------------------
  const list = read<Admission[]>(LS_ADMISSIONS, []);
  const record: Admission = {
    ...input,
    id: formNumber(),
    createdAt: new Date().toISOString(),
    createdBy: userId,
  };
  list.unshift(record);
  write(LS_ADMISSIONS, list);
  return record;
}

export async function listAdmissions(): Promise<Admission[]> {
  // Supabase:
  //   const { data, error } = await supabase.from("admissions")
  //     .select("*").order("created_at", { ascending: false });
  //   if (error) throw error;
  //   return data as Admission[];
  return read<Admission[]>(LS_ADMISSIONS, []);
}

export async function getAdmission(id: string): Promise<Admission | null> {
  // Supabase:
  //   const { data } = await supabase.from("admissions")
  //     .select("*").eq("id", id).maybeSingle();
  //   return (data as Admission) ?? null;
  const list = read<Admission[]>(LS_ADMISSIONS, []);
  return list.find((a) => a.id === id) ?? null;
}

export async function updateAdmission(
  id: string,
  patch: Partial<Omit<Admission, "id" | "createdAt" | "createdBy">>,
): Promise<Admission> {
  // Supabase:
  //   const { data, error } = await supabase.from("admissions")
  //     .update(patch).eq("id", id).select().single();
  //   if (error) throw error;
  //   return data as Admission;
  const list = read<Admission[]>(LS_ADMISSIONS, []);
  const i = list.findIndex((a) => a.id === id);
  if (i === -1) throw new Error("Admission not found");
  list[i] = { ...list[i], ...patch };
  write(LS_ADMISSIONS, list);
  return list[i];
}

export async function deleteAdmission(id: string): Promise<void> {
  // Supabase:
  //   const { error } = await supabase.from("admissions").delete().eq("id", id);
  //   if (error) throw error;
  const list = read<Admission[]>(LS_ADMISSIONS, []);
  write(LS_ADMISSIONS, list.filter((a) => a.id !== id));
}

/**
 * Search by form number, student name, or mobile number.
 * Case-insensitive, partial match.
 */
export async function searchAdmissions(query: string): Promise<Admission[]> {
  // Supabase (example — needs a `search_admissions` RPC or ilike filters):
  //   const q = `%${query}%`;
  //   const { data } = await supabase.from("admissions").select("*")
  //     .or(`id.ilike.${q},student_name.ilike.${q},mobile.ilike.${q}`);
  //   return (data as Admission[]) ?? [];
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const list = read<Admission[]>(LS_ADMISSIONS, []);
  return list.filter(
    (a) =>
      a.id.toLowerCase().includes(q) ||
      a.studentName.toLowerCase().includes(q) ||
      a.mobile.toLowerCase().includes(q),
  );
}
