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
    path: "/qgis",
    h1: /Position data,\s+without false certainty\./i,
    currentNavigationItem: "QGIS Integration",
  },
  {
    path: "/demo",
    h1: /Read the position\.\s+Judge the signal\./i,
    currentNavigationItem: null,
  },
] as const;

const viewportWidths = [280, 320, 360, 390, 412, 768, 1024, 1440, 1920, 2560, 3840] as const;

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
      url.pathname === "/api/qgis/snapshot" &&
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
    page.getByText(/does not connect to a verified live QGIS source and must not be used for field decisions/i),
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
        navigation.getByRole("link", { name: "QGIS Integration", exact: true }),
      ).toHaveAttribute("href", "/qgis");

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

test.describe("QGIS demo state lab", () => {
  test("same-origin endpoint proxies the validated backend fixture snapshot", async ({ request }) => {
    const response = await request.get("/api/qgis/snapshot?scenario=current");

    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const body = await response.json();
    expect(body).toMatchObject({
      schemaVersion: "catalyst.qgis.snapshot.v1",
      mode: "simulated",
      scenario: "current",
      source: { adapter: "fixture-qgis-adapter" },
    });
  });

  test("same-origin endpoint rejects invalid and duplicate scenarios", async ({ request }) => {
    const invalid = await request.get("/api/qgis/snapshot?scenario=offlinee");
    expect(invalid.status()).toBe(400);
    expect(await invalid.json()).toMatchObject({
      error: { code: "INVALID_SCENARIO" },
    });

    const duplicate = await request.get(
      "/api/qgis/snapshot?scenario=current&scenario=stale",
    );
    expect(duplicate.status()).toBe(400);
    expect(await duplicate.json()).toMatchObject({
      error: { code: "DUPLICATE_QUERY_PARAMETER" },
    });
  });

  test("current fixture discloses simulation, provenance, time, and fix accuracy", async ({
    page,
  }) => {
    await waitForCurrentFixture(page);
    await selectScenario(page, "Stale", "stale");
    await selectScenario(page, "Current fixture", "current");
    await expectSimulatedDisclosure(page);

    const inspector = page.getByRole("complementary", { name: "QGIS position inspector" });
    await expect(inspector.getByText("Latest position received", { exact: true })).toBeVisible();
    await expect(inspector.locator("time")).toHaveCount(1);
    await expect(inspector.locator("time")).toHaveAttribute(
      "datetime",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    await expect(inspector.getByText(/^\d+ min ago$/)).toBeVisible();
    await expect(inspector.getByText("Accuracy", { exact: true })).toBeVisible();
    await expect(inspector.getByText("±12 m", { exact: true })).toBeVisible();
    await expect(inspector.getByText("Catalyst QGIS fixture", { exact: true })).toBeVisible();
    await expect(inspector.getByText("Via fixture-qgis-adapter", { exact: true })).toBeVisible();
    await expect(page.getByText("Fixture planned route", { exact: true })).toBeVisible();
    await expect(page.getByText("Schema: catalyst.qgis.snapshot.v1", { exact: true })).toBeVisible();
  });

  test("switches to stale data and keeps the last-known fix visible", async ({ page }) => {
    await waitForCurrentFixture(page);
    await selectScenario(page, "Stale", "stale");
    await expectSimulatedDisclosure(page);

    await expect(consoleStatuses(page).getByText("Stale", { exact: true })).toBeVisible();
    const inspector = page.getByRole("complementary", { name: "QGIS position inspector" });
    await expect(inspector.getByText(/^\d+ min ago$/)).toBeVisible();
    await expect(inspector.getByText("±12 m", { exact: true })).toBeVisible();
  });

  test("switches to offline data and preserves the last-known fix", async ({ page }) => {
    await waitForCurrentFixture(page);
    await selectScenario(page, "Offline", "offline");
    await expectSimulatedDisclosure(page);

    await expect(consoleStatuses(page).getByText("Offline", { exact: true })).toBeVisible();
    const inspector = page.getByRole("complementary", { name: "QGIS position inspector" });
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
      page.getByText("The simulated QGIS source is connected but has not supplied a position.", {
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
    await expect(alert).toContainText("The simulated QGIS adapter rejected this request.");
    await expect(alert).toContainText("The previous fixture remains visible below.");
    await expect(
      page
        .getByRole("complementary", { name: "QGIS position inspector" })
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
      page.getByText("No QGIS source is configured for this environment.", { exact: true }),
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
    await page.route("**/api/qgis/snapshot?scenario=stale", async (route) => {
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
  await page.goto("/qgis");

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
  const demoLink = mobileNavigation.getByRole("link", { name: "Open QGIS demo", exact: true });
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

test("the home atmosphere keeps running without an exposed motion control", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  await expect(page.getByRole("button", { name: /motion/i })).toHaveCount(0);
  await expect
    .poll(() =>
      page.locator(".hero-atmosphere__canvas").evaluate((canvas) => ({
        width: canvas.getAttribute("width"),
        height: canvas.getAttribute("height"),
      })),
    )
    .toEqual(
      expect.objectContaining({
        width: expect.stringMatching(/^\d+$/),
        height: expect.stringMatching(/^\d+$/),
      }),
    );

  // The previous implementation stopped after 4.5 seconds. Sample beyond that
  // cutoff to prove the decorative atmosphere is still drawing new frames.
  await page.waitForTimeout(4_700);
  const laterFrame = await page
    .locator(".hero-atmosphere__canvas")
    .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
  await page.waitForTimeout(350);
  const nextFrame = await page
    .locator(".hero-atmosphere__canvas")
    .evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());

  expect(nextFrame).not.toBe(laterFrame);
});

test("the hero entrance does not wait in a half-faded state for hydration", async ({ page }) => {
  await page.route("**/*", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith(".js")) {
      await route.abort();
      return;
    }
    await route.continue();
  });

  await page.goto("/");
  const heroHeading = page.locator(".editorial-hero h1");
  await expect(heroHeading).toBeVisible();
  await page.waitForTimeout(750);

  const finalStyle = await heroHeading.evaluate((element) => {
    const style = getComputedStyle(element);
    return { opacity: Number(style.opacity), transform: style.transform };
  });

  expect(finalStyle.opacity).toBe(1);
  expect(finalStyle.transform === "none" || finalStyle.transform.endsWith(", 0, 0)"))
    .toBe(true);
});

test("below-hero Motion reveals replay whenever a section re-enters the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");

  const workflowItem = page.locator(".workflow-list li").first();
  await workflowItem.scrollIntoViewIfNeeded();
  await expect(workflowItem).toHaveAttribute("data-motion-reveal", "complete");

  await page.locator(".closing-image-cta").scrollIntoViewIfNeeded();
  await expect(workflowItem).toHaveAttribute("data-motion-reveal", "pending");

  await workflowItem.scrollIntoViewIfNeeded();
  await expect(workflowItem).toHaveAttribute("data-motion-reveal", "complete");
});

test("the opening chapter reveals its copy and image whenever they enter the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");

  const chapterHeading = page.locator(".chapter__copy h2");
  const chapterImage = page.locator(".feature-media");

  await chapterHeading.scrollIntoViewIfNeeded();
  await expect(chapterHeading).toHaveAttribute("data-motion-reveal", "complete");
  await expect(chapterImage).toHaveAttribute("data-motion-reveal", "complete");

  await page.locator(".closing-image-cta").scrollIntoViewIfNeeded();
  await expect(chapterHeading).toHaveAttribute("data-motion-reveal", "pending");
  await expect(chapterImage).toHaveAttribute("data-motion-reveal", "pending");

  await chapterHeading.scrollIntoViewIfNeeded();
  await expect(chapterHeading).toHaveAttribute("data-motion-reveal", "complete");
  await expect(chapterImage).toHaveAttribute("data-motion-reveal", "complete");
});

test("the closing image callout waits for its visible content and replays", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");

  const content = page.locator(".closing-image-cta__content");
  const heading = content.locator("h2");
  const image = page.locator(".closing-image-cta__image");
  const contentTop = await content.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );

  await page.evaluate((top) => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, top - window.innerHeight + 10);
  }, contentTop);
  await page.waitForTimeout(900);
  await expect(heading).not.toHaveAttribute("data-motion-reveal", "complete");

  await heading.scrollIntoViewIfNeeded();
  await expect(heading).toHaveAttribute("data-motion-reveal", "complete");
  await expect(image).toHaveAttribute("data-motion-reveal", "complete");

  await page.locator(".editorial-hero").scrollIntoViewIfNeeded();
  await expect(heading).toHaveAttribute("data-motion-reveal", "pending");
  await expect(image).toHaveAttribute("data-motion-reveal", "pending");

  await heading.scrollIntoViewIfNeeded();
  await expect(heading).toHaveAttribute("data-motion-reveal", "complete");
  await expect(image).toHaveAttribute("data-motion-reveal", "complete");
});

test("Platform, QGIS, and Demo sections all animate and replay on scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });

  const pages = [
    {
      path: "/platform",
      top: ".editorial-hero",
      replayTarget: ".scope-columns > div:last-child",
      covered: [
        ".environment-split > .environment-panel",
        ".lifecycle-list > li",
        ".platform-matrix > article",
        ".state-stack > div",
        ".scope-columns > div",
      ],
    },
    {
      path: "/qgis",
      top: ".editorial-hero",
      replayTarget: ".confirmation-list > ol > li:last-child",
      covered: [
        ".integration-status > div",
        ".architecture-flow > li",
        ".architecture-flow__arrow",
        ".source-register__list > div",
        ".contract-fields > div",
        ".state-semantics__grid > article",
        ".confirmation-list > ol > li",
      ],
    },
    {
      path: "/demo",
      top: ".demo-intro",
      replayTarget: ".track-list > div:last-child",
      covered: [
        ".scenario-switcher > button",
        ".operations-console__header",
        ".qgis-map",
        ".position-inspector",
        ".operations-console__footer > span",
        ".track-list > div",
        ".demo-disclosure > *",
      ],
    },
  ] as const;

  for (const route of pages) {
    await page.goto(route.path);
    if (route.path === "/demo") await waitForCurrentFixture(page);
    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }),
    );
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );

    for (const selector of route.covered) {
      const elements = page.locator(selector);
      expect(await elements.count(), `${selector} should exist on ${route.path}`).toBeGreaterThan(0);
      const motionTarget = elements.first();
      await motionTarget.evaluate((element) =>
        element.scrollIntoView({ block: "center", behavior: "instant" }),
      );
      await expect(motionTarget, `${selector} should animate on ${route.path}`).toHaveAttribute(
        "data-motion-reveal",
        "complete",
      );
    }

    const target = page.locator(route.replayTarget);
    await target.scrollIntoViewIfNeeded();
    await expect(target).toHaveAttribute("data-motion-reveal", "complete");

    await page.locator(route.top).scrollIntoViewIfNeeded();
    await expect(target).toHaveAttribute("data-motion-reveal", "pending");

    await target.scrollIntoViewIfNeeded();
    await expect(target).toHaveAttribute("data-motion-reveal", "complete");
  }
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

test("wide-screen shells use the available canvas instead of leaving oversized gutters", async ({
  page,
}) => {
  await page.goto("/");

  for (const width of [1920, 2560, 3840] as const) {
    await page.setViewportSize({ width, height: 1440 });
    const shells = await page.locator(".site-header__inner, .editorial-hero__content").evaluateAll(
      (elements) =>
        elements.map((element) => {
          const bounds = element.getBoundingClientRect();
          return { left: bounds.left, right: bounds.right, width: bounds.width };
        }),
    );

    expect(shells.length).toBeGreaterThan(0);
    for (const shell of shells) {
      expect(shell.width / width, `shell is too narrow at ${width}px`).toBeGreaterThanOrEqual(0.94);
      expect(shell.left / width, `left gutter is too large at ${width}px`).toBeLessThanOrEqual(0.03);
      expect((width - shell.right) / width, `right gutter is too large at ${width}px`).toBeLessThanOrEqual(
        0.03,
      );
    }
  }
});

test("the QGIS map overlays stay inside the map without colliding", async ({ page }) => {
  const mapWidths = [280, 320, 360, 390, 412, 480, 768, 1024, 1440, 1920, 2560] as const;

  await page.setViewportSize({ width: mapWidths[0], height: 900 });
  await waitForCurrentFixture(page);
  await expect(page.locator(".qgis-map .maplibregl-ctrl-group")).toBeVisible();

  for (const width of mapWidths) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );

    const layout = await page.evaluate(() => {
      const selectors = {
        map: ".qgis-map",
        canvas: ".qgis-map .maplibregl-canvas",
        label: ".qgis-map__label",
        legend: ".qgis-map__legend",
        controls: ".qgis-map .maplibregl-ctrl-group",
      } as const;
      const boxes = Object.fromEntries(
        Object.entries(selectors).map(([name, selector]) => {
          const element = document.querySelector<HTMLElement>(selector);
          const bounds = element?.getBoundingClientRect();
          return [
            name,
            bounds
              ? {
                  top: bounds.top,
                  right: bounds.right,
                  bottom: bounds.bottom,
                  left: bounds.left,
                }
              : null,
          ];
        }),
      ) as Record<keyof typeof selectors, DOMRect | null>;

      const overlaps = (first: DOMRect | null, second: DOMRect | null) =>
        Boolean(
          first &&
            second &&
            first.left < second.right &&
            first.right > second.left &&
            first.top < second.bottom &&
            first.bottom > second.top,
        );
      const isInside = (child: DOMRect | null, parent: DOMRect | null) =>
        Boolean(
          child &&
            parent &&
            child.left >= parent.left - 1 &&
            child.right <= parent.right + 1 &&
            child.top >= parent.top - 1 &&
            child.bottom <= parent.bottom + 1,
        );

      return {
        missing: Object.entries(boxes)
          .filter(([, bounds]) => !bounds)
          .map(([name]) => name),
        collisions: [
          ["legend", "controls", overlaps(boxes.legend, boxes.controls)],
          ["label", "controls", overlaps(boxes.label, boxes.controls)],
        ].filter(([, , collision]) => collision),
        outside: (["label", "legend", "controls"] as const).filter(
          (name) => !isInside(boxes[name], boxes.map),
        ),
        canvasDelta:
          boxes.canvas && boxes.map
            ? {
                width: Math.abs(
                  boxes.canvas.right - boxes.canvas.left - (boxes.map.right - boxes.map.left),
                ),
                height: Math.abs(
                  boxes.canvas.bottom - boxes.canvas.top - (boxes.map.bottom - boxes.map.top),
                ),
              }
            : null,
      };
    });

    expect(layout.missing, `missing map overlays at ${width}px`).toEqual([]);
    expect(layout.collisions, `colliding map overlays at ${width}px`).toEqual([]);
    expect(layout.outside, `map overlays outside their surface at ${width}px`).toEqual([]);
    expect(layout.canvasDelta?.width, `map canvas width mismatch at ${width}px`).toBeLessThanOrEqual(1);
    expect(layout.canvasDelta?.height, `map canvas height mismatch at ${width}px`).toBeLessThanOrEqual(1);
  }
});

test("the Platform environment panels follow the responsive column breakpoint", async ({ page }) => {
  await page.goto("/platform");
  const panels = page.locator(".environment-panel");
  await expect(panels).toHaveCount(2);

  for (const width of [280, 320, 390, 768, 1024] as const) {
    await page.setViewportSize({ width, height: 900 });
    const first = await panels.nth(0).boundingBox();
    const second = await panels.nth(1).boundingBox();

    expect(first, `first panel missing at ${width}px`).not.toBeNull();
    expect(second, `second panel missing at ${width}px`).not.toBeNull();
    expect(Math.abs((first?.x ?? 0) - (second?.x ?? 0)), `panels misaligned at ${width}px`).toBeLessThan(1);
    expect(
      second?.y ?? 0,
      `panels did not stack at ${width}px`,
    ).toBeGreaterThanOrEqual((first?.y ?? 0) + (first?.height ?? 0) - 1);
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  const first = await panels.nth(0).boundingBox();
  const second = await panels.nth(1).boundingBox();
  expect(Math.abs((first?.y ?? 0) - (second?.y ?? 0)), "desktop panels should share a row").toBeLessThan(1);
  expect(second?.x ?? 0, "desktop panels should use separate columns").toBeGreaterThanOrEqual(
    (first?.x ?? 0) + (first?.width ?? 0) - 1,
  );
});
