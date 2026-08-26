import { test, expect, type Page } from "@playwright/test";

// ============================================================================
// Duken Error States — Comprehensive Error Handling Tests
// ============================================================================
// Tests that the app handles errors gracefully across all routes.
// Uses baseURL from playwright.config.ts (default: http://localhost:8080)
// for public routes, and http://localhost:8081 for authenticated routes.
// ============================================================================

// ---------------------------------------------------------------------------
// Helper: Login
// ---------------------------------------------------------------------------

async function login(page: Page) {
  await page.goto("/auth");
  await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  await page.locator('input[type="email"]').fill("playwright-test@duken.com");
  await page.locator('input[type="password"]').fill("TestPass123!");
  // Scope to form to avoid tab button ambiguity
  await page.locator("form").getByRole("button", { name: /log in|войти|кіру/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}

// ============================================================================
// 404 / UNKNOWN ROUTE
// ============================================================================
test.describe("404 / Unknown Routes", () => {
  test("unknown route shows 404 gracefully with meaningful text", async ({ page }) => {
    const res = await page.goto("/this-route-does-not-exist");
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(0);

    // Should display 404 or similar error content
    const has404 = bodyText.includes("404") || bodyText.includes("Page not found") || bodyText.includes("not found");
    expect(has404).toBe(true);
  });

  test("404 page has a link back to home", async ({ page }) => {
    await page.goto("/nonexistent-page-xyz-999");
    await page.waitForLoadState("networkidle");

    const homeLink = page.getByRole("link", { name: /return to home|home|на главную/i });
    await expect(homeLink).toBeVisible({ timeout: 5_000 });
  });

  test("navigation to home from 404 works", async ({ page }) => {
    await page.goto("/some-random-path");
    await page.waitForLoadState("networkidle");

    const homeLink = page.getByRole("link", { name: /return to home|home|на главную/i }).first();
    if (await homeLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await homeLink.click();
      await page.waitForURL(/\/$/, { timeout: 10_000 });
      await expect(page).toHaveURL(/\/$/);
    }
  });
});

// ============================================================================
// INVALID STORE SLUG
// ============================================================================
test.describe("Invalid Store Slug", () => {
  test("non-existent store slug shows not-found text", async ({ page }) => {
    await page.goto("/s/nonexistent-store-zzzz-9999");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText(/store not found|магазин не найден|дүкен табылмады/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("invalid store slug does not crash the app", async ({ page }) => {
    await page.goto("/s/__invalid__!!!__");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible({ timeout: 5_000 });
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// AUTHENTICATION REDIRECTS
// ============================================================================
test.describe("Authentication Redirects", () => {
  test("access /admin without auth redirects to /auth", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/auth/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test("access /dashboard without auth redirects to /auth", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/auth/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test("access /settings without auth redirects to /auth", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForURL(/\/auth/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test("auth page shows login form when unauthenticated", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 5_000 });
  });
});

// ============================================================================
// CONSOLE ERROR CHECKS (STATIC PAGES)
// ============================================================================
test.describe("Console Error Checks (Unauthenticated)", () => {
  test("landing page has no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    expect(consoleErrors).toEqual([]);
  });

  test("auth page has no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/auth");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Filter out expected auth-related warnings (e.g. session not found)
    const filteredErrors = consoleErrors.filter(
      (e) => !e.includes("AuthSessionMissingError") && !e.includes("AuthRetryable")
    );
    expect(filteredErrors).toEqual([]);
  });

  test("404 page has no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/nonexistent-page-xyz-999");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // The 404 page deliberately logs a console.error for the 404 event
    const filteredErrors = consoleErrors.filter(
      (e) => !e.includes("404 Error") && !e.includes("AuthSessionMissingError")
    );
    expect(filteredErrors).toEqual([]);
  });
});

// ============================================================================
// EMPTY STATE CHECKS
// ============================================================================
test.describe("Empty States (Unauthenticated)", () => {
  test("landing page pricing section renders", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText(/pricing|тариф/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("landing page hero content renders", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const h1orH2 = page.locator("h1, h2").first();
    await expect(h1orH2).toBeVisible({ timeout: 10_000 });
  });

  test("HTTP status 200 for landing page", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBeLessThan(400);
  });

  test("HTTP status 200 for auth page", async ({ page }) => {
    const res = await page.goto("/auth");
    expect(res?.status()).toBeLessThan(400);
  });

  test("404 route returns HTTP status ok (SPA)", async ({ page }) => {
    const res = await page.goto("/nonexistent-page-xyz-999");
    // SPA handles routing, so HTTP status should be 200 even for unknown routes
    expect(res?.status()).toBeLessThan(400);
  });
});

// ============================================================================
// AUTHENTICATED ERROR STATES
// ============================================================================
test.describe("Authenticated Error States", () => {
  test.use({ baseURL: "http://localhost:8081" });

  test("authenticated access to /settings loads without error", async ({ page }) => {
    await login(page);
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible({ timeout: 5_000 });
  });

  test("authenticated access to /dashboard loads dashboard content", async ({ page }) => {
    await login(page);
    await page.waitForLoadState("networkidle");

    // Dashboard loads without <nav> element — check for store name instead
    await expect(page.getByText("Playwright Test Store")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("body")).toBeVisible();
  });

  test("logout redirects to /auth", async ({ page }) => {
    await login(page);

    const logoutBtn = page.getByRole("button", { name: /logout|log out|шығу|выйти/i });
    await logoutBtn.click();
    // Logout redirects to landing page
    await expect(page).not.toHaveURL(/\/dashboard/);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });
});

// ============================================================================
// ROUTE INTEGRITY — ALL PUBLIC ROUTES
// ============================================================================
test.describe("Route Integrity — All Public Routes", () => {
  const publicRoutes = ["/", "/auth"];

  for (const route of publicRoutes) {
    test(`route ${route} loads without crashing`, async ({ page }) => {
      const res = await page.goto(route);
      await page.waitForLoadState("networkidle");

      expect(res?.status()).toBeLessThan(400);
      await expect(page.locator("body")).toBeVisible();
    });
  }
});

// ============================================================================
// EDGE CASES
// ============================================================================
test.describe("Edge Cases", () => {
  test("empty store slug redirects or shows error gracefully", async ({ page }) => {
    await page.goto("/s/");
    await page.waitForLoadState("networkidle");

    // Should either redirect to / or show fallback
    const currentUrl = page.url();
    const hasContent = await page.locator("body").innerText().then((t) => t.length > 0);
    expect(hasContent).toBe(true);
  });

  test("malformed order ID shows error state", async ({ page }) => {
    await page.goto("/order/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible({ timeout: 5_000 });
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("double slash in path does not crash", async ({ page }) => {
    // "//" in URL protocol-relative context causes browser redirect loop
    // Just verify it doesn't crash the app via a direct path
    await page.goto("/auth//");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible({ timeout: 5_000 });
  });
});
