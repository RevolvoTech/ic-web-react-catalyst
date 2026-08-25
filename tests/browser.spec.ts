import { expect, test, type Page } from "@playwright/test";

const routes = [
  {
    path: "/",
    h1: /Plan beyond\s+last signal\./i,
    currentNavigationItem: "Home",
  },
  {
    path: "/platform",
    h1: /One plan\.\s+Two environments\./i,
    currentNavigationItem: "Platform",
  },
  {
    path: "/qgps",
    h1: /Position data,\s+without false certainty\./i,
    currentNavigationItem: "QGPS Integration",
  },
  {
    path: "/demo",
    h1: /Read the position\.\s+Judge the signal\./i,
    currentNavigationItem: null,
  },
] as const;

const viewportWidths = [320, 390, 768, 1024, 1440, 1920] as const;

function scenarioGroup(page: Page) {
  return page.getByRole("group", { name: "Select a data condition" });
}

function consoleStatuses(page: Page) {
  return page.locator(".operations-console__statuses");
}

function consoleWorkspace(page: Page) {
  return page.locator(".operations-console__workspace");
}

async function waitForCurrentFixture(page: Page) {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(consoleWorkspace(page)).toHaveAttribute("aria-busy", "false");
  await expect(consoleStatuses(page).getByText("Current", { exact: true })).toBeVisible();
}

async function selectScenario(page: Page, label: string, state: string) {
  const button = scenarioGroup(page).getByRole("button", {
    name: new RegExp(`^${label}\\b`, "i"),
  });
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === "/api/qgps/snapshot" &&
      url.searchParams.get("scenario") === state &&
      response.request().method() === "GET"
    );
  });

  await button.click();
  await expect(page).toHaveURL(new RegExp(`[?&]state=${state}(?:&|$)`));
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await responsePromise;
  await expect(consoleWorkspace(page)).toHaveAttribute("aria-busy", "false");
}

async function expectSimulatedDisclosure(page: Page) {
  await expect(page.getByText("Simulated only", { exact: true })).toBeVisible();
  await expect(consoleStatuses(page).getByText("Simulated", { exact: true })).toBeVisible();
  await expect(consoleStatuses(page).getByText("Live", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText(/does not connect to a QGPS source and must not be used for field decisions/i),
  ).toBeVisible();
}

test.describe("route structure", () => {
  for (const route of routes) {
    test(`${route.path} has one h1, landmarks, a skip link, and primary navigation`, async ({
      page,
    }) => {
      const response = await page.goto(route.path);

      expect(response?.ok()).toBe(true);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.locator("main#main-content")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();

      const headings = page.getByRole("heading", { level: 1 });
      await expect(headings).toHaveCount(1);
      await expect(headings).toHaveAccessibleName(route.h1);

      const skipLink = page.getByRole("link", { name: "Skip to main content" });
      await expect(skipLink).toHaveCount(1);
      await expect(skipLink).toHaveAttribute("href", "#main-content");
      await skipLink.focus();
      await expect(skipLink).toBeFocused();
      await expect(skipLink).toBeVisible();

      const navigation = page.getByRole("navigation", { name: "Primary navigation" });
      await expect(navigation).toBeVisible();
      await expect(navigation.getByRole("link", { name: "Home", exact: true })).toHaveAttribute(
        "href",
        "/",
      );
      await expect(
        navigation.getByRole("link", { name: "Platform", exact: true }),
      ).toHaveAttribute("href", "/platform");
      await expect(
        navigation.getByRole("link", { name: "QGPS Integration", exact: true }),
      ).toHaveAttribute("href", "/qgps");

      const currentLinks = navigation.locator('[aria-current="page"]');
      if (route.currentNavigationItem) {
        await expect(currentLinks).toHaveCount(1);
        await expect(currentLinks).toHaveText(route.currentNavigationItem);
      } else {
        await expect(currentLinks).toHaveCount(0);
      }
    });
  }
});

test.describe("QGPS demo state lab", () => {
  test("current fixture discloses simulation, provenance, time, and fix accuracy", async ({
    page,
  }) => {
    await waitForCurrentFixture(page);
    await selectScenario(page, "Stale", "stale");
    await selectScenario(page, "Current fixture", "current");
    await expectSimulatedDisclosure(page);

    const inspector = page.getByRole("complementary", { name: "QGPS position inspector" });
    await expect(inspector.getByText("Latest position received", { exact: true })).toBeVisible();
    await expect(inspector.locator("time")).toHaveCount(1);
    await expect(inspector.locator("time")).toHaveAttribute(
      "datetime",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    await expect(inspector.getByText(/^\d+ min ago$/)).toBeVisible();
    await expect(inspector.getByText("Accuracy", { exact: true })).toBeVisible();
    await expect(inspector.getByText("±12 m", { exact: true })).toBeVisible();
    await expect(inspector.getByText("Catalyst QGPS fixture", { exact: true })).toBeVisible();
    await expect(inspector.getByText("Via Catalyst backend API", { exact: true })).toBeVisible();
    await expect(page.getByText("Schema: catalyst.qgps.snapshot.v1", { exact: true })).toBeVisible();
  });

  test("switches to stale data and keeps the last-known fix visible", async ({ page }) => {
    await waitForCurrentFixture(page);
    await selectScenario(page, "Stale", "stale");
    await expectSimulatedDisclosure(page);

    await expect(consoleStatuses(page).getByText("Stale", { exact: true })).toBeVisible();
    const inspector = page.getByRole("complementary", { name: "QGPS position inspector" });
    await expect(inspector.getByText(/^\d+ min ago$/)).toBeVisible();
    await expect(inspector.getByText("±12 m", { exact: true })).toBeVisible();
  });

  test("switches to offline data and preserves the last-known fix", async ({ page }) => {
    await waitForCurrentFixture(page);
    await selectScenario(page, "Offline", "offline");
    await expectSimulatedDisclosure(page);

    await expect(consoleStatuses(page).getByText("Offline", { exact: true })).toBeVisible();
    const inspector = page.getByRole("complementary", { name: "QGPS position inspector" });
    await expect(inspector.getByText("Latest position received", { exact: true })).toBeVisible();
    await expect(inspector.locator("time")).toHaveAttribute("datetime", /.+/);
  });

  test("switches to an empty connected source without inventing a position", async ({ page }) => {
    await waitForCurrentFixture(page);
    await selectScenario(page, "Empty", "empty");
    await expectSimulatedDisclosure(page);

    await expect(consoleStatuses(page).getByText("Unknown", { exact: true })).toBeVisible();
    await expect(page.getByRole("status").getByText("No position received", { exact: true })).toBeVisible();
    await expect(
      page.getByText("The simulated source is connected but has not supplied a position.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("No recent track points", { exact: true })).toBeVisible();
  });

  test("switches to a safe error state while preserving the previous fixture", async ({ page }) => {
    await waitForCurrentFixture(page);
    await selectScenario(page, "Error", "error");
    await expectSimulatedDisclosure(page);

    await expect(consoleStatuses(page).getByText("Error", { exact: true })).toBeVisible();
    const alert = page.getByRole("alert").filter({ hasText: "Position refresh failed" });
    await expect(alert.getByText("Position refresh failed", { exact: true })).toBeVisible();
    await expect(alert).toContainText("The simulated backend rejected this request.");
    await expect(alert).toContainText("The previous fixture remains visible below.");
    await expect(
      page
        .getByRole("complementary", { name: "QGPS position inspector" })
        .getByText("Latest position received", { exact: true }),
    ).toBeVisible();
  });

  test("switches to unavailable without presenting position data", async ({ page }) => {
    await waitForCurrentFixture(page);
    await selectScenario(page, "Unavailable", "unavailable");
    await expectSimulatedDisclosure(page);

    await expect(consoleStatuses(page).getByText("Unavailable", { exact: true })).toBeVisible();
    await expect(page.getByText("Position unavailable", { exact: true })).toBeVisible();
    await expect(
      page.getByText("No QGPS source is configured for this environment.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("No recent track points", { exact: true })).toBeVisible();
  });

  test("URL state opens directly and survives a reload", async ({ page }) => {
    await page.goto("/demo?state=stale");
    const staleButton = scenarioGroup(page).getByRole("button", { name: /^Stale\b/i });

    await expect(staleButton).toHaveAttribute("aria-pressed", "true");
    await expect(consoleWorkspace(page)).toHaveAttribute("aria-busy", "false");
    await expect(consoleStatuses(page).getByText("Stale", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/\?state=stale$/);
    await expect(staleButton).toHaveAttribute("aria-pressed", "true");
    await expect(consoleWorkspace(page)).toHaveAttribute("aria-busy", "false");
    await expect(consoleStatuses(page).getByText("Stale", { exact: true })).toBeVisible();
  });

  test("announces a loading state while a scenario request is pending", async ({ page }) => {
    await waitForCurrentFixture(page);

    let releaseRequest!: () => void;
    const requestGate = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    await page.route("**/api/qgps/snapshot?scenario=stale", async (route) => {
      await requestGate;
      await route.continue();
    });

    try {
      await scenarioGroup(page).getByRole("button", { name: /^Stale\b/i }).click();
      await expect(consoleWorkspace(page)).toHaveAttribute("aria-busy", "true");
      await expect(page.getByText("Loading selected state…", { exact: true })).toBeVisible();
    } finally {
      releaseRequest();
    }

    await expect(consoleWorkspace(page)).toHaveAttribute("aria-busy", "false");
    await expect(consoleStatuses(page).getByText("Stale", { exact: true })).toBeVisible();
  });
});

test("mobile navigation is keyboard operable, traps focus, and restores it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/qgps");

  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  const brandLink = page.getByRole("link", { name: "Catalyst home" }).first();
  const menuButton = page.locator('button[aria-controls="mobile-menu"]');

  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(brandLink).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(menuButton).toBeFocused();
  await page.keyboard.press("Enter");

  const mobileNavigation = page.getByRole("navigation", { name: "Mobile navigation" });
  const homeLink = mobileNavigation.getByRole("link", { name: "Home", exact: true });
  const demoLink = mobileNavigation.getByRole("link", { name: "Open QGPS demo", exact: true });
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(mobileNavigation).toBeVisible();
  await expect(homeLink).toBeFocused();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

  await page.keyboard.press("Shift+Tab");
  await expect(demoLink).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(homeLink).toBeFocused();
  await page.keyboard.press("Escape");

  await expect(mobileNavigation).toHaveCount(0);
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await expect(menuButton).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(homeLink).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(mobileNavigation.getByRole("link", { name: "Platform", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/platform$/);
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toHaveCount(0);
});

test("reduced-motion preference disables the particle loop and shortens CSS motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /motion/i })).toHaveCount(0);

  const motionState = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(".hero-atmosphere__canvas");
    const button = document.querySelector<HTMLElement>(".button");
    return {
      preferenceMatches: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      canvasWidthAttribute: canvas?.getAttribute("width") ?? null,
      canvasHeightAttribute: canvas?.getAttribute("height") ?? null,
      transitionDuration: button ? Number.parseFloat(getComputedStyle(button).transitionDuration) : 1,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    };
  });

  expect(motionState.preferenceMatches).toBe(true);
  expect(motionState.canvasWidthAttribute).toBeNull();
  expect(motionState.canvasHeightAttribute).toBeNull();
  expect(motionState.transitionDuration).toBeLessThanOrEqual(0.00001);
  expect(motionState.scrollBehavior).toBe("auto");
});

test("the motion control pauses by pointer and persists the choice", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  const pauseButton = page.getByRole("button", { name: "Pause motion" });
  await expect(pauseButton).toBeVisible();
  await pauseButton.click();
  await expect(page.getByRole("button", { name: "Play motion" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("catalyst-motion-paused")))
    .toBe("true");

  await page.reload();
  await expect(page.getByRole("button", { name: "Play motion" })).toBeVisible();
});

test.describe("document width", () => {
  for (const route of routes) {
    test(`${route.path} has no horizontal overflow at required widths`, async ({ page }) => {
      await page.setViewportSize({ width: viewportWidths[0], height: 900 });
      await page.goto(route.path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (route.path === "/demo") {
        await expect(consoleWorkspace(page)).toHaveAttribute("aria-busy", "false");
      }

      for (const width of viewportWidths) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(
          () =>
            new Promise<void>((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            }),
        );

        const dimensions = await page.evaluate(() => {
          const root = document.documentElement;
          const body = document.body;
          const clientWidth = root.clientWidth;
          const scrollWidth = Math.max(root.scrollWidth, body.scrollWidth);
          const offenders = Array.from(document.querySelectorAll<HTMLElement>("body *"))
            .map((element) => {
              const bounds = element.getBoundingClientRect();
              return {
                tag: element.tagName.toLowerCase(),
                className: typeof element.className === "string" ? element.className : "",
                left: Math.round(bounds.left),
                right: Math.round(bounds.right),
              };
            })
            .filter(({ left, right }) => left < -1 || right > clientWidth + 1)
            .slice(0, 8);

          window.scrollTo({ left: 1_000, top: window.scrollY, behavior: "instant" });
          return { clientWidth, scrollWidth, horizontalScroll: window.scrollX, offenders };
        });

        expect(
          dimensions.scrollWidth,
          `${route.path} overflows at ${width}px: ${JSON.stringify(dimensions.offenders)}`,
        ).toBeLessThanOrEqual(dimensions.clientWidth);
        expect(dimensions.horizontalScroll, `${route.path} scrolls horizontally at ${width}px`).toBe(0);
      }
    });
  }
});
