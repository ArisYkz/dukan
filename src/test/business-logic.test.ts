import { describe, it, expect } from "vitest";
import { formatPrice, statusLabel, statusColor, filterOrdersBySearch } from "@/lib/format";
import { OrderStatus, ARCHIVED_STATUSES, CONFIRMED_STATUSES, FILTER_STATUS_MAP, FREE_CONFIRMED_LIMIT, PAYMENT_WINDOW_MS } from "@/constants/business";
import type { OrderRow } from "@/types/store";

// ─── formatPrice ───────────────────────────────────────────────
describe("formatPrice", () => {
  it("formats zero", () => {
    expect(formatPrice(0)).toBe("0 ৳");
  });

  it("formats small values", () => {
    expect(formatPrice(500)).toContain("500");
    expect(formatPrice(500)).toContain("৳");
  });

  it("formats large values with grouping", () => {
    const result = formatPrice(12000);
    expect(result).toContain("৳");
    // Should contain some form of 12 000 or 12,000
    expect(result.replace(/\s/g, "").replace(/,/g, "")).toContain("12000");
  });
});

// ─── statusLabel ───────────────────────────────────────────────
describe("statusLabel", () => {
  it("returns a label for known statuses", () => {
    const label = statusLabel("new");
    expect(typeof label).toBe("string");
    expect(label.length).toBeGreaterThan(0);
  });

  it("returns the raw status for unknown statuses", () => {
    expect(statusLabel("unknown_status_xyz")).toBe("unknown_status_xyz");
  });
});

// ─── statusColor ───────────────────────────────────────────────
describe("statusColor", () => {
  it("returns accent classes for confirmed statuses", () => {
    expect(statusColor(OrderStatus.PAID_CONFIRMED)).toContain("accent");
    expect(statusColor(OrderStatus.CONFIRMED)).toContain("accent");
    expect(statusColor(OrderStatus.DELIVERED)).toContain("accent");
  });

  it("returns secondary for new status", () => {
    expect(statusColor(OrderStatus.NEW)).toContain("secondary");
  });

  it("returns destructive for rejected/cancelled", () => {
    expect(statusColor(OrderStatus.PAYMENT_REJECTED)).toContain("destructive");
    expect(statusColor(OrderStatus.CANCELLED)).toContain("destructive");
  });

  it("returns primary for shipped", () => {
    expect(statusColor(OrderStatus.SHIPPED)).toContain("primary");
  });

  it("returns muted for unknown", () => {
    expect(statusColor("some_random_status")).toContain("muted");
  });
});

// ─── OrderStatus constants ─────────────────────────────────────
describe("OrderStatus", () => {
  it("has all expected statuses", () => {
    expect(OrderStatus.NEW).toBe("new");
    expect(OrderStatus.AWAITING_VERIFICATION).toBe("awaiting_verification");
    expect(OrderStatus.PAID_CONFIRMED).toBe("paid_confirmed");
    expect(OrderStatus.PAYMENT_REJECTED).toBe("payment_rejected");
    expect(OrderStatus.CONFIRMED).toBe("confirmed");
    expect(OrderStatus.SHIPPED).toBe("shipped");
    expect(OrderStatus.DELIVERED).toBe("delivered");
    expect(OrderStatus.CANCELLED).toBe("cancelled");
  });

  it("ARCHIVED_STATUSES includes delivered, cancelled, archived", () => {
    expect(ARCHIVED_STATUSES).toContain(OrderStatus.DELIVERED);
    expect(ARCHIVED_STATUSES).toContain(OrderStatus.CANCELLED);
    expect(ARCHIVED_STATUSES).toContain(OrderStatus.ARCHIVED);
    expect(ARCHIVED_STATUSES).not.toContain(OrderStatus.NEW);
  });

  it("CONFIRMED_STATUSES includes revenue-generating statuses", () => {
    expect(CONFIRMED_STATUSES).toContain(OrderStatus.PAID_CONFIRMED);
    expect(CONFIRMED_STATUSES).toContain(OrderStatus.DELIVERED);
    expect(CONFIRMED_STATUSES).not.toContain(OrderStatus.CANCELLED);
  });

  it("FILTER_STATUS_MAP covers all filter tabs", () => {
    expect(Object.keys(FILTER_STATUS_MAP)).toEqual(["all", "new", "payment", "shipped"]);
    expect(FILTER_STATUS_MAP.new).toEqual([OrderStatus.NEW]);
  });
});

// ─── Business constants ────────────────────────────────────────
describe("Business constants", () => {
  it("FREE_CONFIRMED_LIMIT is 50000", () => {
    expect(FREE_CONFIRMED_LIMIT).toBe(50_000);
  });

  it("PAYMENT_WINDOW_MS is 30 minutes", () => {
    expect(PAYMENT_WINDOW_MS).toBe(30 * 60 * 1000);
  });
});

// ─── filterOrdersBySearch ──────────────────────────────────────
describe("filterOrdersBySearch", () => {
  const mockOrders: OrderRow[] = [
    {
      id: "1", public_order_id: "Q-000001", customer_name: "Alice Smith",
      customer_phone: "+7701***89", customer_address: "Astana", total_price: 5000,
      subtotal: 5000, tax_amount: 0, status: "new", created_at: "", updated_at: "",
      reference_code: null, promo_code: null, discount_amount: 0, order_items: [],
    },
    {
      id: "2", public_order_id: "Q-000002", customer_name: "Bob Jones",
      customer_phone: "+7702***45", customer_address: "Almaty", total_price: 3000,
      subtotal: 3000, tax_amount: 0, status: "paid_confirmed", created_at: "", updated_at: "",
      reference_code: null, promo_code: null, discount_amount: 0, order_items: [],
    },
  ];

  it("returns all orders for empty query", () => {
    expect(filterOrdersBySearch(mockOrders, "")).toEqual(mockOrders);
    expect(filterOrdersBySearch(mockOrders, "  ")).toEqual(mockOrders);
  });

  it("filters by customer name", () => {
    const result = filterOrdersBySearch(mockOrders, "alice");
    expect(result).toHaveLength(1);
    expect(result[0].customer_name).toBe("Alice Smith");
  });

  it("filters by order ID", () => {
    const result = filterOrdersBySearch(mockOrders, "Q-000002");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by phone", () => {
    const result = filterOrdersBySearch(mockOrders, "7702");
    expect(result).toHaveLength(1);
  });

  it("returns empty for no match", () => {
    expect(filterOrdersBySearch(mockOrders, "xyz_no_match")).toHaveLength(0);
  });
});
