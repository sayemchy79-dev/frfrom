/**
 * ============================================================================
 * SERVER FUNCTIONS — PLUTO ADMIN OPERATIONS
 * ============================================================================
 * These `createServerFn` handlers run on the server and use the service-role
 * client from `pluto-admin.server.ts`. They exist so that maintenance /
 * privileged operations (bulk delete, force update, audit reads) never
 * require exposing the service key to the browser.
 *
 * Every handler MUST authenticate the caller — an unauthenticated
 * `createServerFn` is a public endpoint on the deployed site. We verify the
 * `Authorization: Bearer <access_token>` header against Pluto's auth API
 * before running any privileged work.
 * ============================================================================
 */
import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { z } from "zod";

async function requireAuthedUser() {
  const request = getWebRequest();
  const auth = request?.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  if (!token) throw new Error("Unauthorized");

  const { plutoAdmin } = await import("./pluto-admin.server");
  const { data, error } = await plutoAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  return { userId: data.user.id, plutoAdmin };
}

/** Admin: delete an admission regardless of ownership. */
export const adminDeleteAdmission = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { plutoAdmin } = await requireAuthedUser();
    const { error } = await plutoAdmin
      .from("admissions")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Admin: force-update any admission. */
export const adminUpdateAdmission = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({ id: z.string().min(1), patch: z.record(z.string(), z.unknown()) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { plutoAdmin } = await requireAuthedUser();
    const { error } = await plutoAdmin
      .from("admissions")
      .update(data.patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
