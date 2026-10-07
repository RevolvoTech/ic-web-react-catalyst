import { backendUrlWithPath } from "@/lib/backend-url";

export const dynamic = "force-dynamic";

async function forward(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const base = process.env.CATALYST_BACKEND_URL;
  if (!base) return Response.json({ error: { message: "Operations backend is not configured." } }, { status: 503 });
  const { path } = await context.params;
  if (!path.length || path.some((segment) => !/^[A-Za-z0-9_-]{1,80}$/u.test(segment))) {
    return Response.json({ error: { message: "Invalid operations path." } }, { status: 400 });
  }
  const token = request.headers.get("authorization");
  if (!token?.startsWith("Bearer ")) {
    return Response.json({ error: { message: "Sign in to access operations." } }, { status: 401 });
  }
  const target = backendUrlWithPath(new URL(base), `api/v1/operations/${path.join("/")}`);
  target.search = new URL(request.url).search;
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers: {
        authorization: token,
        ...(request.method !== "GET" ? { "content-type": "application/json" } : {}),
      },
      body: request.method === "GET" ? undefined : await request.text(),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  } catch {
    return Response.json({ error: { message: "Operations backend is unavailable." } }, { status: 503 });
  }
}

export { forward as GET, forward as POST, forward as PUT };
