import { copyFile, mkdir, readFile } from "node:fs/promises";
const { version } = JSON.parse(await readFile("node_modules/maplibre-gl/package.json", "utf8"));
const target = `public/maplibre/${version}`;
await mkdir(target, { recursive: true });
for (const name of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  await copyFile(`node_modules/maplibre-gl/dist/${name}`, `${target}/${name}`);
}
