import { build } from "esbuild";
import { readdir } from "node:fs/promises";
const files = await readdir(".next/static", { recursive: true });
const manifest = files.filter((file) => /\.(js|css|woff2?)$/u.test(file)).map((file) => ({ url: `/_next/static/${file.replaceAll("\\", "/")}`, revision: null }));
for (const file of await readdir("public/maplibre", { recursive: true })) {
  if (file.endsWith(".mjs")) manifest.push({ url: `/maplibre/${file.replaceAll("\\", "/")}`, revision: null });
}
await build({ entryPoints: ["worker/service-worker.js"], outfile: "public/sw.js", bundle: true,
  minify: true, target: ["es2022"], format: "iife", legalComments: "none", define: { __CATALYST_PRECACHE__: JSON.stringify(manifest) } });
