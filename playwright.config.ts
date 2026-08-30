import { defineConfig, devices } from "@playwright/test";

const websitePort = process.env.PLAYWRIGHT_WEBSITE_PORT ?? "3000";
const websiteUrl = `http://127.0.0.1:${websitePort}`;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: websiteUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
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
      command: `node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port ${websitePort}`,
      url: websiteUrl,
      env: {
        CATALYST_BACKEND_URL: "http://127.0.0.1:4000",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
