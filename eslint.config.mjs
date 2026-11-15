import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    "out/**",
    "coverage/**",
    ".npm-cache/**",
    "playwright-report/**",
    "test-results/**",
    "output/**",
    "public/vendor/**",
    "public/sw.js",
    "public/maplibre/**",
    "next-env.d.ts",
  ]),
]);
