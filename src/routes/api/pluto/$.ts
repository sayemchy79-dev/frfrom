import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_PREFIXES = ["/auth/v1/", "/rest/v1/", "/storage/v1/"];
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "origin",
  "referer",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "transfer-encoding",
]);

function getPlutoUrl() {
  const url = process.env.PLUTO_URL ?? process.env.VITE_PLUTO_URL;
  if (!url) throw new Error("PLUTO_URL is not configured");
  return url.replace(/\/$/, "");
}

function proxyHeaders(request: Request) {
  const headers = new Headers(request.headers);
  for (const header of HOP_BY_HOP_HEADERS) headers.delete(header);
  return headers;
}

function responseHeaders(upstreamHeaders: Headers) {
  const headers = new Headers(upstreamHeaders);
  for (const header of HOP_BY_HOP_HEADERS) headers.delete(header);
  return headers;
}

async function proxyToPluto(request: Request, splat?: string) {
  const path = `/${splat ?? ""}`;
  if (!ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return Response.json({ error: "Pluto endpoint is not allowed" }, { status: 403 });
  }

  const sourceUrl = new URL(request.url);
  const targetUrl = `${getPlutoUrl()}${path}${sourceUrl.search}`;
  const body =
    request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers: proxyHeaders(request),
    body,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders(upstream.headers),
  });
}

export const Route = createFileRoute("/api/pluto/$")({
  server: {
    handlers: {
      GET: ({ request, params }) => proxyToPluto(request, params._splat),
      POST: ({ request, params }) => proxyToPluto(request, params._splat),
      PUT: ({ request, params }) => proxyToPluto(request, params._splat),
      PATCH: ({ request, params }) => proxyToPluto(request, params._splat),
      DELETE: ({ request, params }) => proxyToPluto(request, params._splat),
      HEAD: ({ request, params }) => proxyToPluto(request, params._splat),
    },
  },
});