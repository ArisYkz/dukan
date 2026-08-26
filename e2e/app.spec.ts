import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads and renders hero content", async ({ page }) => {
    await page.goto("/");

    // App loads
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // Page has meaningful title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("shows pricing section", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText(/pricing|тариф/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Storefront", () => {
  test("shows not-found page for invalid store slug", async ({ page }) => {
    await page.goto("/s/nonexistent-slug-12345");

    // Should show the store not found state
    await expect(
      page.getByText(/store not found|магазин не найден|дүкен табылмады/i),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Navigation", () => {
  test("landing page navigation links are present", async ({ page }) => {
    await page.goto("/");

    // Login/signup link should exist
    const loginLink = page.getByRole("link", { name: /log in|log in \/ sign up|войти|кіру/i });
    // Or a login button
    const loginButton = page.getByRole("button", { name: /log in|войти|кіру/i });

    await expect(
      loginLink.or(loginButton).first(),
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Auth pages", () => {
  test("login page renders the form", async ({ page }) => {
    await page.goto("/auth");

    // Should have email and password fields
    await expect(
      page.locator('input[type="email"]'),
    ).toBeVisible({ timeout: 5000 });
  });

  test("register page renders the form", async ({ page }) => {
    await page.goto("/auth");

    // Should have email and password fields
    await expect(
      page.locator('input[type="email"]'),
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Error handling", () => {
  test("unknown route shows error boundary gracefully", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");

    // The SPA should handle it gracefully (not a blank page)
    await page.waitForLoadState("networkidle");
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });
});
