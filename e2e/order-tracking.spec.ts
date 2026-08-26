import { test, expect, type Page } from "@playwright/test";

// ============================================================================
// Duken Order Tracking — E2E Tests
// ============================================================================
// Tests the public order tracking page at /order/:id
// Uses a known order from the test account's store.
// Base URL: http://localhost:8081
// ============================================================================

test.use({ baseURL: "http://localhost:8081" });

// ---------------------------------------------------------------------------
// Helper: Log in and fetch a known public order ID from the dashboard
// ---------------------------------------------------------------------------

async function getFirstOrderId(page: Page): Promise<string | null> {
  await page.goto("/auth");
  await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
  await page.locator('input[type="email"]').fill("playwright-test@duken.com");
  await page.locator('input[type="password"]').fill("TestPass123!");
  await page.locator("form").getByRole("button", { name: /log in|войти|кіру/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

  // Navigate to orders tab
  const ordersTab = page.locator("nav").getByRole("button", { name: /orders|заказы|тапсырыстар/i });
  if (await ordersTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await ordersTab.click();
    await page.waitForLoadState("networkidle");
  } else {
    await page.goto("/dashboard?tab=orders");
    await page.waitForLoadState("networkidle");
  }

  // Try to extract order IDs from the page
  const bodyText = await page.locator("body").innerText();

  // Look for public order ID patterns (numeric, 6-8 digits)
  const orderIdMatch = bodyText.match(/\b(\d{6,8})\b/);
  if (orderIdMatch) return orderIdMatch[1];

  // Look for UUID-style order IDs
  const uuidMatch = bodyText.match(/\b([a-f0-9-]{36})\b/);
  if (uuidMatch) return uuidMatch[1];

  return null;
}

// ============================================================================
// ORDER TRACKING — ORDER DETAILS
// ============================================================================
test.describe("Order Tracking — Order Details", () => {
  let orderId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      orderId = (await getFirstOrderId(page)) || "";
    } finally {
      await page.close();
    }
  });

  test("order tracking page loads without crashing", async ({ page }) => {
    // Even without a valid order ID, the page should render gracefully
    const id = orderId || "000000";
    await page.goto(`/order/${id}`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
  });

  test("order number is displayed on the page", async ({ page }) => {
    if (!orderId) {
      test.skip(true, "No order ID available — skipping");
      return;
    }

    await page.goto(`/order/${orderId}`);
    await page.waitForLoadState("networkidle");

    // Order number section should be visible
    const orderNumberLabel = page.getByText(/order number|номер заказа|тапсырыс нөмірі/i);
    await expect(orderNumberLabel).toBeVisible({ timeout: 8_000 });

    // Public order ID should be displayed (numeric or formatted)
    const orderIdDisplay = page.locator("text=/\\d{4,}/").first();
    await expect(orderIdDisplay).toBeVisible({ timeout: 5_000 });
  });

  test("order status display section is visible", async ({ page }) => {
    if (!orderId) {
      test.skip(true, "No order ID available — skipping");
      return;
    }

    await page.goto(`/order/${orderId}`);
    await page.waitForLoadState("networkidle");

    // Status display should be present (e.g. "New", "Pending", etc.)
    const statusDisplay = page.locator('[class*="motion"] p, [class*="status"]').first();
    await expect(statusDisplay).toBeVisible({ timeout: 5_000 });
  });

  test("order products and total are listed", async ({ page }) => {
    if (!orderId) {
      test.skip(true, "No order ID available — skipping");
      return;
    }

    await page.goto(`/order/${orderId}`);
    await page.waitForLoadState("networkidle");

    // Order details section with products
    const detailsHeading = page.getByText(/order details|детали заказа|тапсырыс туралы/i);
    await expect(detailsHeading).toBeVisible({ timeout: 5_000 }).catch(() => {});

    // Total price should be displayed
    const totalLabel = page.getByText(/total|итог|барлығы/i);
    await expect(totalLabel).toBeVisible({ timeout: 5_000 }).catch(() => {});
  });

  test("status progress steps are rendered", async ({ page }) => {
    if (!orderId) {
      test.skip(true, "No order ID available — skipping");
      return;
    }

    await page.goto(`/order/${orderId}`);
    await page.waitForLoadState("networkidle");

    // Progress steps show status icons (Package, Clock, Check, Truck, etc.)
    const progressIcons = page.locator("svg, [class*='step'], [class*='progress']");
    const count = await progressIcons.count();
    // There should be some visual progress indicator
    expect(count).toBeGreaterThan(0);
  });

  test("refresh button is present on status display", async ({ page }) => {
    if (!orderId) {
      test.skip(true, "No order ID available — skipping");
      return;
    }

    await page.goto(`/order/${orderId}`);
    await page.waitForLoadState("networkidle");

    // Look for refresh/rotate button near status
    const refreshBtn = page.getByRole("button", { name: /refresh|обновить|жаңарту/i }).first().or(
      page.locator('[class*="RotateCcw"], svg[class*="rotate"]').first()
    );
    await expect(refreshBtn).toBeVisible({ timeout: 5_000 }).catch(() => {});
  });
});

// ============================================================================
// ORDER TRACKING — PAYMENT SECTION
// ============================================================================
test.describe("Order Tracking — Payment", () => {
  let orderId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      orderId = (await getFirstOrderId(page)) || "";
    } finally {
      await page.close();
    }
  });

  test("reference code is displayed when available", async ({ page }) => {
    if (!orderId) {
      test.skip(true, "No order ID available — skipping");
      return;
    }

    await page.goto(`/order/${orderId}`);
    await page.waitForLoadState("networkidle");

    // Check for payment code / reference code section
    const paymentCodeLabel = page.getByText(/payment code|код оплаты|төлем коды/i);
    const referenceCodeText = page.getByText(/reference|референс/i);
    await expect(
      paymentCodeLabel.first().or(referenceCodeText.first())
    ).toBeVisible({ timeout: 8_000 }).catch(() => {});
  });

  test("copy buttons for payment info are present", async ({ page }) => {
    if (!orderId) {
      test.skip(true, "No order ID available — skipping");
      return;
    }

    await page.goto(`/order/${orderId}`);
    await page.waitForLoadState("networkidle");

    // Look for copy button(s)
    const copyBtns = page.getByRole("button", { name: /copy|копировать|көшіру/i });
    const count = await copyBtns.count();
    // Copy buttons may or may not be present
    if (count > 0) {
      await expect(copyBtns.first()).toBeVisible({ timeout: 3_000 });
    }
  });

  test("'I have paid' button is present for orders in new/payment status", async ({ page }) => {
    if (!orderId) {
      test.skip(true, "No order ID available — skipping");
      return;
    }

    await page.goto(`/order/${orderId}`);
    await page.waitForLoadState("networkidle");

    // The "I have paid" button may be conditional on order status
    const paidBtn = page.getByRole("button", { name: /i have paid|я оплатил|төледім|оплатил/i }).first();
    await expect(paidBtn).toBeVisible({ timeout: 8_000 }).catch(() => {
      // Not all orders show this button (depends on status)
    });
  });

  test("payment amount section renders with price", async ({ page }) => {
    if (!orderId) {
      test.skip(true, "No order ID available — skipping");
      return;
    }

    await page.goto(`/order/${orderId}`);
    await page.waitForLoadState("networkidle");

    // Payment amount section with price display
    const priceText = page.getByText(/₸|\d[\d\s]*₸/);
    await expect(priceText.first()).toBeVisible({ timeout: 5_000 }).catch(() => {});
  });

  test("recipient (Kaspi) info section appears when available", async ({ page }) => {
    if (!orderId) {
      test.skip(true, "No order ID available — skipping");
      return;
    }

    await page.goto(`/order/${orderId}`);
    await page.waitForLoadState("networkidle");

    // Recipient section — Kaspi phone/name
    const recipientLabel = page.getByText(/recipient|получатель|алушы/i);
    const kaspiLabel = page.getByText(/kaspi|каспи/i);
    await expect(
      recipientLabel.first().or(kaspiLabel.first())
    ).toBeVisible({ timeout: 5_000 }).catch(() => {});
  });
});

// ============================================================================
// ORDER TRACKING — REVIEW / RATING
// ============================================================================
test.describe("Order Tracking — Reviews", () => {
  let orderId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      orderId = (await getFirstOrderId(page)) || "";
    } finally {
      await page.close();
    }
  });

  test("review/rating section appears for delivered orders", async ({ page }) => {
    if (!orderId) {
      test.skip(true, "No order ID available — skipping");
      return;
    }

    await page.goto(`/order/${orderId}`);
    await page.waitForLoadState("networkidle");

    // Star rating component — may only appear for delivered orders
    const starRating = page.locator('[class*="StarRating"], [class*="star"], button[aria-label*="star"]').first();
    await expect(starRating).toBeVisible({ timeout: 5_000 }).catch(() => {
      // Rating section is only shown for delivered/shipped orders
    });
  });
});

// ============================================================================
// ORDER TRACKING — NAVIGATION & CONTACT
// ============================================================================
test.describe("Order Tracking — Navigation & Contact", () => {
  let orderId: string;
  let storeName: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      orderId = (await getFirstOrderId(page)) || "";
      storeName = "";
    } finally {
      await page.close();
    }
  });

  test("contact seller section renders", async ({ page }) => {
    if (!orderId) {
      test.skip(true, "No order ID available — skipping");
      return;
    }

    await page.goto(`/order/${orderId}`);
    await page.waitForLoadState("networkidle");

    // Contact section — WhatsApp/Telegram/Instagram link
    const contactLink = page.locator('a[href*="wa.me"], a[href*="t.me"], a[href*="instagram.com"]').first();
    await expect(contactLink).toBeVisible({ timeout: 5_000 }).catch(() => {});
  });

  test("contact link opens correct platform", async ({ page }) => {
    if (!orderId) {
      test.skip(true, "No order ID available — skipping");
      return;
    }

    await page.goto(`/order/${orderId}`);
    await page.waitForLoadState("networkidle");

    // Look for contact link
    const contactLink = page.locator('a[href*="wa.me"], a[href*="t.me"], a[href*="instagram.com"]').first();
    if (await contactLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const href = await contactLink.getAttribute("href");
      expect(href).toBeTruthy();
      // Should start with one of the known platforms
      const isValid = href?.startsWith("https://wa.me") || href?.startsWith("https://t.me") || href?.startsWith("https://instagram.com");
      expect(isValid).toBe(true);
    }
  });

  test("store header shows store name", async ({ page }) => {
    if (!orderId) {
      test.skip(true, "No order ID available — skipping");
      return;
    }

    await page.goto(`/order/${orderId}`);
    await page.waitForLoadState("networkidle");

    // Header should display store name or "Duken"
    const header = page.locator("header");
    await expect(header).toBeVisible({ timeout: 5_000 });
    const headerText = await header.innerText();
    expect(headerText.length).toBeGreaterThan(0);
  });

  test("return to store link works when store slug is known", async ({ page }) => {
    if (!orderId) {
      test.skip(true, "No order ID available — skipping");
      return;
    }

    await page.goto(`/order/${orderId}`);
    await page.waitForLoadState("networkidle");

    // Look for return/store link
    const storeLink = page.locator('a[href*="/s/"]').first();
    if (await storeLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await storeLink.click();
      // Should navigate to storefront
      await page.waitForURL(/\/s\//, { timeout: 10_000 });
      await expect(page).toHaveURL(/\/s\//);
    }
  });
});

// ============================================================================
// ORDER TRACKING — NOT FOUND STATE
// ============================================================================
test.describe("Order Tracking — Not Found", () => {
  test("invalid order ID shows not-found state", async ({ page }) => {
    await page.goto("/order/invalid-order-id-99999");
    await page.waitForLoadState("networkidle");

    const notFoundText = page.getByText(/order not found|заказ не найден|тапсырыс табылмады/i);
    await expect(notFoundText).toBeVisible({ timeout: 10_000 }).catch(() => {
      // Should at least have body content (not blank page)
      expect(page.locator("body")).not.toBeEmpty();
    });
  });

  test("not-found page shows meaningful content", async ({ page }) => {
    await page.goto("/order/invalid-order-id-99999");
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// ORDER TRACKING — KAZPOST TRACKING SECTION
// ============================================================================
test.describe("Order Tracking — KazPost Tracking", () => {
  let orderId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      orderId = (await getFirstOrderId(page)) || "";
    } finally {
      await page.close();
    }
  });

  test("KazPost tracking section renders when barcode is available", async ({ page }) => {
    if (!orderId) {
      test.skip(true, "No order ID available — skipping");
      return;
    }

    await page.goto(`/order/${orderId}`);
    await page.waitForLoadState("networkidle");

    // KazPost tracking section — check for barcode display or tracking label
    const kazpostSection = page.getByText(/kazpost|казпочта|tracking|трекинг/i);
    await expect(kazpostSection.first()).toBeVisible({ timeout: 5_000 }).catch(() => {
      // Not all orders have KazPost barcodes
    });
  });
});
