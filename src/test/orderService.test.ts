import { describe, it, expect, beforeEach, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";

// Module under test
import {
  updateOrderStatus,
  fetchStoreOrdersWithContacts,
  fetchStorePromoCode,
  resolvePaymentAttempts,
} from "@/services/orderService";

// ─── Supabase mock ───────────────────────────────────────────────
const mockResponse = vi.hoisted(() => ({ data: null, error: null }));

vi.mock("@/integrations/supabase/client", () => {
  const thenable = () => ({
    then: (onfulfilled: any) =>
      Promise.resolve(mockResponse).then(onfulfilled),
  });

  const chain = () => {
    const c: any = {};
    c.select = vi.fn(() => c);
    c.eq = vi.fn(() => c);
    c.not = vi.fn(() => c);
    c.order = vi.fn(() => c);
    c.range = vi.fn(() => c);
    c.in = vi.fn(() => c);
    c.or = vi.fn(() => c);
    c.maybeSingle = vi.fn(() => thenable());
    c.single = vi.fn(() => thenable());
    c.then = thenable().then.bind(thenable());
    c.insert = vi.fn(() => thenable());
    c.update = vi.fn(() => {
      const sc: any = {};
      sc.eq = vi.fn(() => sc);
      sc.in = vi.fn(() => thenable());
      sc.then = thenable().then.bind(thenable());
      return sc;
    });
    c.delete = vi.fn(() => ({
      eq: vi.fn(() => thenable()),
      in: vi.fn(() => thenable()),
    }));
    c.upsert = vi.fn(() => thenable());
    return c;
  };

  return {
    supabase: {
      from: vi.fn(() => chain()),
      rpc: vi.fn(),
      auth: { getSession: vi.fn() },
      storage: { from: vi.fn(() => ({ remove: vi.fn() })) },
    },
  };
});

// ─── Fixtures ────────────────────────────────────────────────────
const fakeOrder = {
  id: "order-1",
  store_id: "store-1",
  public_order_id: "Q-000001",
  customer_name: "Alice",
  customer_phone: "+7701***89",
  customer_address: "Almaty",
  total_price: 5000,
  subtotal: 5000,
  tax_amount: 0,
  status: "new",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  reference_code: null,
  promo_code: null,
  discount_amount: 0,
  order_items: [{ product_name: "Widget", quantity: 1, product_price: 5000 }],
};

// ─── Tests ───────────────────────────────────────────────────────
describe("orderService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse.data = null;
    mockResponse.error = null;
  });

  // ── updateOrderStatus ─────────────────────────────────────────
  describe("updateOrderStatus", () => {
    it("updates the order status", async () => {
      mockResponse.error = null;

      const result = await updateOrderStatus("order-1", "shipped");

      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith("orders");
    });

    it("returns an error when the update fails", async () => {
      mockResponse.error = new Error("Update failed");

      const result = await updateOrderStatus("order-1", "cancelled");

      expect(result.error).toBeTruthy();
    });
  });

  // ── fetchStoreOrdersWithContacts ───────────────────────────────
  describe("fetchStoreOrdersWithContacts", () => {
    it("returns paginated orders with contacts", async () => {
      mockResponse.data = [
        {
          ...fakeOrder,
          order_contacts: { customer_phone: "+7701***89" },
        },
      ];

      const result = await fetchStoreOrdersWithContacts("store-1", 0, 20);

      expect(result).toHaveLength(1);
      expect(result[0].customer_name).toBe("Alice");
      expect(supabase.from).toHaveBeenCalledWith("orders");
    });

    it("returns an empty array for a store with no orders", async () => {
      mockResponse.data = [];

      const result = await fetchStoreOrdersWithContacts("store-empty");

      expect(result).toEqual([]);
    });

    it("uses the default limit when arguments are omitted", async () => {
      mockResponse.data = [];

      await fetchStoreOrdersWithContacts("store-1");

      expect(supabase.from).toHaveBeenCalledWith("orders");
    });

    it("throws an error when Supabase returns an error", async () => {
      mockResponse.error = new Error("DB error");

      await expect(
        fetchStoreOrdersWithContacts("store-1"),
      ).rejects.toThrow("DB error");
    });
  });

  // ── fetchStorePromoCode ────────────────────────────────────────
  describe("fetchStorePromoCode", () => {
    it("returns a valid promo code", async () => {
      const promoData = {
        id: "promo-1",
        store_id: "store-1",
        code: "SAVE10",
        discount_percent: 10,
        is_active: true,
        max_uses: 100,
        current_uses: 0,
      };
      mockResponse.data = promoData;
      mockResponse.error = null;

      const result = await fetchStorePromoCode("store-1", "SAVE10");

      expect(result.data).toEqual(promoData);
      expect(result.error).toBeNull();
    });

    it("returns null for a non-existent promo code", async () => {
      mockResponse.data = null;

      const result = await fetchStorePromoCode("store-1", "INVALID");

      expect(result.data).toBeNull();
    });

    it("returns null for an inactive promo code (filtered by is_active)", async () => {
      // The query uses .eq("is_active", true), so inactive codes won't match.
      mockResponse.data = null;

      const result = await fetchStorePromoCode("store-1", "EXPIRED");

      expect(result.data).toBeNull();
    });

    it("returns the error when the query fails", async () => {
      mockResponse.error = new Error("DB error");

      const result = await fetchStorePromoCode("store-1", "ERROR");

      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
    });
  });

  // ── resolvePaymentAttempts ─────────────────────────────────────
  describe("resolvePaymentAttempts", () => {
    it("confirms pending payment attempts when status is PAID_CONFIRMED", async () => {
      mockResponse.error = null;

      await resolvePaymentAttempts("order-1", "paid_confirmed");

      expect(supabase.from).toHaveBeenCalledWith("payment_attempts");
      expect(supabase.from).toHaveBeenCalledTimes(1);
    });

    it("rejects payment attempts when status is PAYMENT_REJECTED", async () => {
      mockResponse.error = null;

      await resolvePaymentAttempts("order-1", "payment_rejected");

      expect(supabase.from).toHaveBeenCalledWith("payment_attempts");
    });

    it("does nothing for an unrelated status", async () => {
      await resolvePaymentAttempts("order-1", "shipped");

      expect(supabase.from).not.toHaveBeenCalled();
    });
  });
});
