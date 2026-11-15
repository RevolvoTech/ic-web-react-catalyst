import { backendUrlWithPath } from "@/lib/backend-url";

export async function POST(request: Request) {
  const base = process.env.CATALYST_BACKEND_URL;
  if (!base) return Response.json({ error: { message: "Tracking backend is not configured." } }, { status: 503 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (!request.body) return Response.json({ error: { message: "Tracking body is required." } }, { status: 400 });
  const reader = request.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16000) { await reader.cancel(); return Response.json({ error: { message: "Tracking body is too large." } }, { status: 413 }); }
      chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    const headers = new Headers();
    for (const name of ["content-type", "x-catalyst-timestamp", "x-catalyst-signature"]) {
      const value = request.headers.get(name); if (value) headers.set(name, value);
    }
    const upstream = await fetch(backendUrlWithPath(new URL(base), "api/v1/qgps/rockblock/inbound"), {
      method: "POST", headers, body, cache: "no-store", signal: AbortSignal.timeout(2500),
    });
    return new Response(await upstream.text(), { status: upstream.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: { message: "Tracking receipt could not be confirmed. Retry with the same message identity." } }, { status: 503 });
  } finally { reader.releaseLock(); }
}
