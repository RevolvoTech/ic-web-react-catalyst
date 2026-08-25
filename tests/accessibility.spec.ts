import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const routes = ["/", "/platform", "/qgps", "/demo"] as const;
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function waitForStablePage(page: Page, route: (typeof routes)[number]) {
  await page.goto(route);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  if (route === "/demo") {
    await expect(page.locator(".operations-console__workspace")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await expect(
      page.locator(".operations-console__statuses").getByText("Current", { exact: true }),
    ).toBeVisible();
  }
}

function formatViolations(
  violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"],
) {
  return violations
    .map(
      (violation) =>
        `${violation.id}: ${violation.help}\n${violation.nodes
          .map((node) => `  ${node.target.join(" ")} — ${node.failureSummary ?? ""}`)
          .join("\n")}`,
    )
    .join("\n\n");
}

test.describe("WCAG 2.2 AA axe scans", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  for (const route of routes) {
    test(`${route} has no detectable WCAG A/AA violations`, async ({ page }) => {
      await waitForStablePage(page, route);

      const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
      expect(results.violations, formatViolations(results.violations)).toEqual([]);
    });
  }
});

test("open mobile navigation has no detectable WCAG A/AA violations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
});
