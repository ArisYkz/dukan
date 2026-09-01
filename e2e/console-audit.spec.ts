import { test, expect, type Page } from "@playwright/test";

// ============================================================================
// Dokan Console Error Audit — Comprehensive Error Detection
// ============================================================================
// Visits EVERY route and tab and checks for console errors.
// Bails on error at each page -- after logging in, if a page has console
// errors, the test fails fast so you know exactly which page broke.
// Base URL: http://localhost:8082 (for authenticated routes)
// Default URL: http://localhost:8080 (for public routes)
// ============================================================================

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function login(page: Page) {
  await page.goto("/auth");
  await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  await page.locator('input[type="email"]').fill("playwright-test@dokan.com");
  await page.locator('input[type="password"]').fill("TestPass123!");
  await page.locator("form").getByRole("button", { name: /log in|войти|кіру/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}

/**
 * Captures console errors during a page visit.
 * Returns filtered errors (excluding known non-critical messages).
 */
async function captureConsoleErrors(
  page: Page,
  fn: () => Promise<void>,
): Promise<string[]> {
  const consoleErrors: string[] = [];

  const handler = (msg: any) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  };

  page.on("console", handler);

  try {
    await fn();
  } finally {
    page.off("console", handler);
  }

  // Filter out known non-critical errors
  return consoleErrors.filter((e) => {
    const known = [
      "AuthSessionMissingError",
      "AuthRetryable",
      "Failed to load resource",
      "net::ERR_",
      "404 Error", // Deliberate console.error in NotFound component
    ];
    return !known.some((k) => e.includes(k));
  });
}

// ============================================================================
// PUBLIC ROUTES
// ============================================================================
test.describe("Console Audit -- Public Routes", () => {
  test("landing page (/) has no console errors", async ({ page }) => {
    const errors = await captureConsoleErrors(page, async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
    });

    expect(errors).toEqual([]);
  });

  test("auth page (/auth) has no console errors", async ({ page }) => {
    const errors = await captureConsoleErrors(page, async () => {
      await page.goto("/auth");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
    });

    expect(errors).toEqual([]);
  });

  test("404 page (*) has no unexpected console errors", async ({ page }) => {
    const errors = await captureConsoleErrors(page, async () => {
      await page.goto("/this-route-does-not-exist");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
    });

    // Allow deliberate 404 Error log
    const realErrors = errors.filter((e) => !e.includes("404 Error"));
    expect(realErrors).toEqual([]);
  });

  test("store not-found page (/s/invalid) has no console errors", async ({ page }) => {
    const errors = await captureConsoleErrors(page, async () => {
      await page.goto("/s/nonexistent-store-zzzz-9999");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
    });

    expect(errors).toEqual([]);
  });

  test("invalid order page (/order/invalid) has no console errors", async ({ page }) => {
    const errors = await captureConsoleErrors(page, async () => {
      await page.goto("/order/invalid-order-id-99999");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
    });

    expect(errors).toEqual([]);
  });
});

// ============================================================================
// AUTHENTICATED ROUTES
// ============================================================================
test.describe("Console Audit -- Authenticated Routes", () => {
  test.use({ baseURL: "http://localhost:8082" });

  test("dashboard page (/dashboard) has no console errors after login", async ({ page }) => {
    const errors = await captureConsoleErrors(page, async () => {
      await login(page);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
    });

    expect(errors).toEqual([]);
  });

  test("settings page (/settings) has no console errors", async ({ page }) => {
    const errors = await captureConsoleErrors(page, async () => {
      await login(page);
      await page.goto("/settings");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
    });

    expect(errors).toEqual([]);
  });
});

// ============================================================================
// DASHBOARD TABS -- CONSOLE AUDIT
// ============================================================================
test.describe("Console Audit -- Dashboard Tabs", () => {
  test.use({ baseURL: "http://localhost:8082" });

  const dashboardTabs: { name: RegExp; label: string }[] = [
    { name: /branding|брендинг|бренд/i, label: "Branding" },
    { name: /products|товары|тауарлар/i, label: "Products" },
    { name: /orders|заказы|тапсырыстар/i, label: "Orders" },
    { name: /promo|промо/i, label: "Promo" },
    { name: /archive|архив|мұрағат/i, label: "Archive" },
    { name: /analytics|статистика|статистика/i, label: "Analytics" },
  ];

  for (const { name, label } of dashboardTabs) {
    test(`"${label}" tab has no console errors`, async ({ page }) => {
      const errors = await captureConsoleErrors(page, async () => {
        await login(page);

        const btn = page.locator("nav").getByRole("button", { name });
        if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await btn.click();
        }
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(500);
      });

      expect(errors).toEqual([]);
    });
  }
});

// ============================================================================
// ADMIN PAGE -- CONSOLE AUDIT
// ============================================================================
test.describe("Console Audit -- Admin Page", () => {
  test.use({ baseURL: "http://localhost:8082" });

  test("admin page (/admin) has no console errors", async ({ page }) => {
    const errors = await captureConsoleErrors(page, async () => {
      await login(page);
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
    });

    // If user is not admin, redirect is expected -- no console errors expected
    expect(errors).toEqual([]);
  });
});

// ============================================================================
// STOREFRONT -- CONSOLE AUDIT
// ============================================================================
test.describe("Console Audit -- Storefront", () => {
  test.use({ baseURL: "http://localhost:8082" });

  /**
   * Helper: Get a valid store slug by logging in first
   */
  async function getStoreSlug(page: Page): Promise<string | null> {
    await page.goto("/auth");
    await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
    await page.locator('input[type="email"]').fill("playwright-test@dokan.com");
    await page.locator('input[type="password"]').fill("TestPass123!");
    await page.locator("form").getByRole("button", { name: /log in|войти|кіру/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

    const storeLink = page.locator('a[href*="/s/"]').first();
    if (await storeLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const href = await storeLink.getAttribute("href");
      if (href) {
        const match = href.match(/\/s\/(.+)/);
        if (match) return match[1];
      }
    }
    return null;
  }

  test("valid storefront (/s/:slug) has no console errors", async ({ page }) => {
    const slug = await getStoreSlug(page);
    if (!slug) {
      test.skip(true, "No valid store slug found -- skipping");
      return;
    }

    const errors = await captureConsoleErrors(page, async () => {
      // Navigate to storefront while staying logged in
      await page.goto(`/s/${slug}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
    });

    expect(errors).toEqual([]);
  });
});

// ============================================================================
// ORDER TRACKING -- CONSOLE AUDIT
// ============================================================================
test.describe("Console Audit -- Order Tracking", () => {
  test.use({ baseURL: "http://localhost:8082" });

  async function getFirstOrderId(page: Page): Promise<string | null> {
    await page.goto("/auth");
    await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
    await page.locator('input[type="email"]').fill("playwright-test@dokan.com");
    await page.locator('input[type="password"]').fill("TestPass123!");
    await page.locator("form").getByRole("button", { name: /log in|войти|кіру/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

    const ordersTab = page.locator("nav").getByRole("button", { name: /orders|заказы|тапсырыстар/i });
    if (await ordersTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await ordersTab.click();
      await page.waitForLoadState("networkidle");
    }

    const bodyText = await page.locator("body").innerText();
    const orderIdMatch = bodyText.match(/\b(\d{6,8})\b/);
    if (orderIdMatch) return orderIdMatch[1];

    const uuidMatch = bodyText.match(/\b([a-f0-9-]{36})\b/);
    if (uuidMatch) return uuidMatch[1];

    return null;
  }

  test("order tracking page (/order/:id) has no console errors", async ({ page }) => {
    const orderId = await getFirstOrderId(page);
    if (!orderId) {
      test.skip(true, "No valid order ID found -- skipping");
      return;
    }

    const errors = await captureConsoleErrors(page, async () => {
      await page.goto(`/order/${orderId}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
    });

    expect(errors).toEqual([]);
  });
});

// ============================================================================
// COMPREHENSIVE ROUTE SWEEP -- UNAUTHENTICATED
// ============================================================================
test.describe("Console Audit -- Comprehensive Route Sweep (Unauthenticated)", () => {
  const routes = [
    { path: "/", name: "Landing" },
    { path: "/auth", name: "Auth" },
    { path: "/this-route-does-not-exist", name: "404" },
    { path: "/s/nonexistent-store-zzzz-9999", name: "Store Not Found" },
    { path: "/order/invalid-order-id-99999", name: "Order Not Found" },
    { path: "/admin", name: "Admin (redirects to auth)" },
    { path: "/dashboard", name: "Dashboard (redirects to auth)" },
    { path: "/settings", name: "Settings (redirects to auth)" },
  ];

  for (const { path, name } of routes) {
    test(`unauthenticated "${name}" (${path}) has no console errors`, async ({ page }) => {
      const errors = await captureConsoleErrors(page, async () => {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(500);
      });

      // Filter auth-related errors since unauthenticated routes may emit session warnings
      const filtered = errors.filter(
        (e) => !e.includes("AuthSessionMissingError") && !e.includes("AuthRetryable") && !e.includes("404 Error")
      );
      expect(filtered).toEqual([]);
    });
  }
});

// ============================================================================
// COMPREHENSIVE ROUTE SWEEP -- AUTHENTICATED
// ============================================================================
test.describe("Console Audit -- Comprehensive Route Sweep (Authenticated)", () => {
  test.use({ baseURL: "http://localhost:8082" });

  const dashboardTabs: { name: RegExp; label: string }[] = [
    { name: /branding|брендинг|бренд/i, label: "Branding" },
    { name: /products|товары|тауарлар/i, label: "Products" },
    { name: /orders|заказы|тапсырыстар/i, label: "Orders" },
    { name: /promo|промо/i, label: "Promo" },
    { name: /archive|архив|мұрағат/i, label: "Archive" },
    { name: /analytics|статистика|статистика/i, label: "Analytics" },
  ];

  test("all dashboard tabs have no console errors (logged in once)", async ({ page }) => {
    const errors: string[] = [];
    const handler = (msg: any) => {
      if (msg.type() === "error") errors.push(msg.text());
    };
    page.on("console", handler);

    // Login
    await login(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);

    // Visit each tab
    for (const { name, label } of dashboardTabs) {
      const btn = page.locator("nav").getByRole("button", { name }).first();
      if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await btn.click();
      }
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(300);
    }

    // Visit settings
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);

    // Visit admin
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);

    page.off("console", handler);

    // Filter known non-critical entries
    const filtered = errors.filter(
      (e) =>
        !e.includes("AuthSessionMissingError") &&
        !e.includes("AuthRetryable") &&
        !e.includes("404 Error")
    );
    expect(filtered).toEqual([]);
  });
});
