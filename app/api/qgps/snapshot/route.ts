import { backendUrlWithPath } from "@/lib/backend-url";

export async function GET(request: Request) {
  const base = process.env.CATALYST_BACKEND_URL;
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return Response.json({ error: { message: "Sign in to access tracking." } }, { status: 401 });
  if (!base) return Response.json({ error: { message: "Tracking backend is not configured." } }, { status: 503 });
  try {
    const target = backendUrlWithPath(new URL(base), "api/v1/qgps/snapshot");
    target.search = new URL(request.url).search;
    const upstream = await fetch(target, { headers: { authorization }, cache: "no-store", signal: AbortSignal.timeout(10000) });
    return new Response(await upstream.text(), { status: upstream.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch { return Response.json({ error: { message: "Tracking is unavailable." } }, { status: 503 }); }
}
