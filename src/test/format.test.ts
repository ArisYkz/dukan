import { describe, it, expect } from "vitest";
import { formatPrice } from "@/lib/format";
import {
  OrderStatus,
  ARCHIVED_STATUSES,
  CONFIRMED_STATUSES,
  FILTER_STATUS_MAP,
  FREE_PRODUCT_LIMIT,
  FREE_IMAGE_LIMIT,
  PRO_IMAGE_LIMIT,
  FREE_CATEGORY_LIMIT,
  STOREFRONT_PAGE_SIZE,
  DASHBOARD_ORDER_LIMIT,
  SUPPORT_TELEGRAM,
} from "@/constants/business";
import translations from "@/constants/translations";

// ─── Additional formatPrice edge cases ───────────────────────────
describe("formatPrice edge cases", () => {
  it("formats zero", () => {
    expect(formatPrice(0)).toBe("0 ৳");
  });

  it("formats small integer values", () => {
    expect(formatPrice(500)).toBe("500 ৳");
    expect(formatPrice(1)).toBe("1 ৳");
  });

  it("formats thousand-separated values", () => {
    const result = formatPrice(12000);
    expect(result).toContain("৳");
    // Strip all non-digit characters to verify the number is present
    const digits = result.replace(/[^\d]/g, "");
    expect(digits).toContain("12000");
  });

  it("formats large values", () => {
    const result = formatPrice(1_000_000);
    expect(result).toContain("৳");
    const digits = result.replace(/[^\d]/g, "");
    expect(digits).toContain("1000000");
  });

  it("formats decimal values", () => {
    // formatPrice uses Intl.NumberFormat("bn-BD") which rounds to integer
    // since no minimumFractionDigits are set.
    const result = formatPrice(99.9);
    expect(result).toContain("৳");
  });

  it("formats negative values", () => {
    const result = formatPrice(-500);
    expect(result).toContain("৳");
    expect(result).toContain("500");
  });
});

// ─── Remaining business constants ────────────────────────────────
describe("Business constants", () => {
  it("FREE_PRODUCT_LIMIT is 5", () => {
    expect(FREE_PRODUCT_LIMIT).toBe(5);
  });

  it("FREE_IMAGE_LIMIT is 1", () => {
    expect(FREE_IMAGE_LIMIT).toBe(1);
  });

  it("PRO_IMAGE_LIMIT is 5", () => {
    expect(PRO_IMAGE_LIMIT).toBe(5);
  });

  it("FREE_CATEGORY_LIMIT is 2", () => {
    expect(FREE_CATEGORY_LIMIT).toBe(2);
  });

  it("STOREFRONT_PAGE_SIZE is 20", () => {
    expect(STOREFRONT_PAGE_SIZE).toBe(20);
  });

  it("DASHBOARD_ORDER_LIMIT is 200", () => {
    expect(DASHBOARD_ORDER_LIMIT).toBe(200);
  });

  it("SUPPORT_TELEGRAM is the correct URL", () => {
    expect(SUPPORT_TELEGRAM).toBe("https://t.me/dukan_support");
  });
});

// ─── OrderStatus completeness ────────────────────────────────────
describe("OrderStatus completeness", () => {
  it("includes all eleven statuses", () => {
    expect(Object.keys(OrderStatus)).toHaveLength(11);
  });

  it("includes returned and refunded statuses", () => {
    expect(OrderStatus.RETURNED).toBe("returned");
    expect(OrderStatus.REFUNDED).toBe("refunded");
    expect(OrderStatus.ARCHIVED).toBe("archived");
  });

  it("ARCHIVED_STATUSES covers all archived statuses", () => {
    expect(ARCHIVED_STATUSES).toEqual([
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.RETURNED,
      OrderStatus.REFUNDED,
      OrderStatus.ARCHIVED,
    ]);
  });

  it("CONFIRMED_STATUSES covers all revenue-statuses", () => {
    expect(CONFIRMED_STATUSES).toEqual([
      OrderStatus.PAID_CONFIRMED,
      OrderStatus.CONFIRMED,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
    ]);
  });

  it("FILTER_STATUS_MAP has all filter definitions", () => {
    expect(FILTER_STATUS_MAP.all).toContain(OrderStatus.NEW);
    expect(FILTER_STATUS_MAP.all).toContain(OrderStatus.AWAITING_VERIFICATION);
    expect(FILTER_STATUS_MAP.all).toContain(OrderStatus.PAID_CONFIRMED);
    expect(FILTER_STATUS_MAP.all).toContain(OrderStatus.PAYMENT_REJECTED);
    expect(FILTER_STATUS_MAP.all).toContain(OrderStatus.SHIPPED);
    expect(FILTER_STATUS_MAP.all).toContain(OrderStatus.CONFIRMED);

    expect(FILTER_STATUS_MAP.payment).toContain(OrderStatus.AWAITING_VERIFICATION);
    expect(FILTER_STATUS_MAP.payment).toContain(OrderStatus.PAYMENT_REJECTED);

    expect(FILTER_STATUS_MAP.shipped).toContain(OrderStatus.PAID_CONFIRMED);
    expect(FILTER_STATUS_MAP.shipped).toContain(OrderStatus.CONFIRMED);
    expect(FILTER_STATUS_MAP.shipped).toContain(OrderStatus.SHIPPED);
  });
});

// ─── statusLabel coverage ───────────────────────────────────────
describe("statusLabel coverage", () => {
  // Importing from format.ts which uses a local STATUS_LABELS map
  // plus re-exports. We verify it via the function directly.
  it("provides labels for all OrderStatus values", async () => {
    const { statusLabel } = await import("@/lib/format");
    const statuses = Object.values(OrderStatus);
    statuses.forEach((status) => {
      const label = statusLabel(status);
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
      // The label should not be the raw status string for known statuses
      expect(label).not.toBe(status);
    });
  });
});

// ─── Translation structure ───────────────────────────────────────
describe("Translations structure", () => {
  it("has two languages defined", () => {
    const langs = Object.keys(translations);
    expect(langs).toEqual(["en", "bn"]);
  });

  it("all languages have the same top-level keys (groups)", () => {
    const enKeys = Object.keys(translations.en).sort();
    const bnKeys = Object.keys(translations.bn).sort();

    expect(bnKeys).toEqual(enKeys);
  });

  it("all languages have the same keys within each group", () => {
    const groups = Object.keys(translations.en);

    groups.forEach((group) => {
      const enGroup = translations.en[group];
      const bnGroup = translations.bn[group];

      expect(bnGroup).toBeDefined(`bn missing group: ${group}`);

      const enKeys = Object.keys(enGroup).sort();
      const bnKeys = Object.keys(bnGroup).sort();

      expect(bnKeys).toEqual(enKeys);
    });
  });

  it("all translation values are strings or arrays of strings", () => {
    const checkValue = (value: unknown, path: string) => {
      if (typeof value === "string") return;
      if (Array.isArray(value)) {
        value.forEach((item, i) => {
          expect(typeof item).toBe("string");
        });
        return;
      }
      // If we reach here, the value is an unexpected type
      expect(`Unexpected type at ${path}: ${typeof value}`).toBe("");
    };

    Object.entries(translations.en).forEach(([group, map]) => {
      Object.entries(map).forEach(([key, value]) => {
        checkValue(value, `en.${group}.${key}`);
      });
    });
  });

  it("has no empty translation values", () => {
    Object.entries(translations.en).forEach(([group, map]) => {
      Object.entries(map).forEach(([key, value]) => {
        if (typeof value === "string") {
          expect(value.length).toBeGreaterThan(0);
        }
        if (Array.isArray(value)) {
          expect(value.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
