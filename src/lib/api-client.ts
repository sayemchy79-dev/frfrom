/**
 * ============================================================================
 * REST API CLIENT
 * ============================================================================
 *
 * A thin `fetch` wrapper used by `src/lib/backend.ts` to talk to your
 * custom REST backend (Node/Express, NestJS, Django, Laravel, Go, etc.).
 *
 * Responsibilities:
 *   - Build request URLs from `VITE_API_BASE_URL`
 *   - JSON encode/decode bodies
 *   - Attach the bearer token issued by /auth/login (from localStorage)
 *   - Attach an optional static `X-Api-Key` header from `VITE_API_KEY`
 *   - Normalize error responses into thrown `ApiError`s
 *
 * Nothing here is app-specific — the actual endpoints live in `backend.ts`.
 * ============================================================================
 */

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ??
  "";

const STATIC_API_KEY = (import.meta.env.VITE_API_KEY as string | undefined) ?? "";

export const TOKEN_STORAGE_KEY = "sa_token";

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type RequestOpts = {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  /** Skip attaching the auth bearer token (e.g. for /auth/login itself). */
  anonymous?: boolean;
};

function buildUrl(path: string, query?: RequestOpts["query"]) {
  const url = new URL(
    (BASE_URL || "") + (path.startsWith("/") ? path : `/${path}`),
    typeof window === "undefined" ? "http://localhost" : window.location.origin,
  );
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  // If BASE_URL is absolute we want the absolute URL; otherwise use pathname.
  return BASE_URL.startsWith("http") ? url.toString() : url.pathname + url.search;
}

export async function apiRequest<T = unknown>(
  path: string,
  opts: RequestOpts = {},
): Promise<T> {
  const { method = "GET", body, query, anonymous = false } = opts;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (STATIC_API_KEY) headers["X-Api-Key"] = STATIC_API_KEY;
  if (!anonymous) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "include",
    });
  } catch (err) {
    throw new ApiError(
      `Network error: ${(err as Error).message}`,
      0,
      null,
    );
  }

  const text = await res.text();
  const data = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "message" in data && typeof (data as Record<string, unknown>).message === "string"
        ? ((data as Record<string, string>).message)
        : null) ??
      (data && typeof data === "object" && "error" in data && typeof (data as Record<string, unknown>).error === "string"
        ? ((data as Record<string, string>).error)
        : null) ??
      `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }

  return data as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
