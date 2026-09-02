import { defineConfig, devices } from "@playwright/test";

const websitePort = process.env.PLAYWRIGHT_WEBSITE_PORT ?? "3100";
const websiteUrl = `http://127.0.0.1:${websitePort}`;
const isolatedBrowserTestPattern = /(3D Earth pans|ArcGIS scene overlays|Platform, GIS, and Demo sections)/;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // ArcGIS SceneView uses a real WebGL context. Serial browser execution keeps
  // local and CI verification representative instead of exhausting GPU/RAM by
  // starting several independent 3D scenes at once.
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: websiteUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      grepInvert: isolatedBrowserTestPattern,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "browser-heavy",
      grep: isolatedBrowserTestPattern,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      name: "Catalyst backend",
      command: "npm run dev",
      cwd: "../ic-web-node-catalyst",
      url: "http://127.0.0.1:4000/healthz",
      env: {
        NODE_ENV: "test",
        QGIS_ADAPTER: "fixture",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      name: "Catalyst website",
      command: `npm run build && node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${websitePort}`,
      url: websiteUrl,
      env: {
        CATALYST_BACKEND_URL: "http://127.0.0.1:4000",
        GEOCODER_ADAPTER: "fixture",
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
