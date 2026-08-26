import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCart } from "@/hooks/useCart";
import type { CartProduct } from "@/hooks/useCart";

// ─── localStorage mock ───────────────────────────────────────────
const store: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  }),
  get length() {
    return Object.keys(store).length;
  },
  key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// ─── Fixtures ────────────────────────────────────────────────────
const sampleProduct: CartProduct = {
  id: "prod-1",
  name: "Test Product",
  price: 1000,
  stock: 10,
};

// ─── Tests ───────────────────────────────────────────────────────
describe("useCart", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // ── addToCart ──────────────────────────────────────────────────
  describe("addToCart", () => {
    it("adds a new item to empty cart", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct);
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0].product.id).toBe("prod-1");
      expect(result.current.cart[0].quantity).toBe(1);
    });

    it("increments quantity for an existing item", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct);
      });
      act(() => {
        result.current.addToCart(sampleProduct);
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0].quantity).toBe(2);
    });

    it("caps quantity at stock when adding beyond stock", () => {
      const lowStockProduct: CartProduct = { ...sampleProduct, stock: 3 };
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(lowStockProduct, undefined, 5);
      });

      expect(result.current.cart[0].quantity).toBe(3);
    });

    it("caps cumulative quantity at stock", () => {
      const lowStockProduct: CartProduct = { ...sampleProduct, stock: 3 };
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(lowStockProduct, undefined, 2);
      });
      act(() => {
        result.current.addToCart(lowStockProduct, undefined, 2);
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0].quantity).toBe(3);
    });

    it("differentiates the same product with different variants", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct, { color: "red" });
      });
      act(() => {
        result.current.addToCart(sampleProduct, { color: "blue" });
      });

      expect(result.current.cart).toHaveLength(2);
    });

    it("does nothing when stock is 0", () => {
      const outOfStock: CartProduct = { ...sampleProduct, stock: 0 };
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(outOfStock);
      });

      expect(result.current.cart).toHaveLength(0);
    });

    it("accepts a custom initial quantity", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct, undefined, 5);
      });

      expect(result.current.cart[0].quantity).toBe(5);
    });

    it("stores variantPriceAdjustment on the cart item", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct, { size: "L" }, 1, 200);
      });

      expect(result.current.cart[0].variantPriceAdjustment).toBe(200);
      expect(result.current.cart[0].selectedVariants).toEqual({ size: "L" });
    });
  });

  // ── updateQuantity ─────────────────────────────────────────────
  describe("updateQuantity", () => {
    it("increments quantity by delta", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct);
      });
      act(() => {
        result.current.updateQuantity("prod-1", 1);
      });

      expect(result.current.cart[0].quantity).toBe(2);
    });

    it("decrements quantity by delta", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct, undefined, 3);
      });
      act(() => {
        result.current.updateQuantity("prod-1", -1);
      });

      expect(result.current.cart[0].quantity).toBe(2);
    });

    it("clamps minimum quantity to 1", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct);
      });
      act(() => {
        result.current.updateQuantity("prod-1", -100);
      });

      expect(result.current.cart[0].quantity).toBe(1);
    });

    it("clamps maximum quantity to stock", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct);
      });
      act(() => {
        result.current.updateQuantity("prod-1", 100);
      });

      expect(result.current.cart[0].quantity).toBe(sampleProduct.stock);
    });

    it("does nothing for a non-existent product", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct);
      });
      act(() => {
        result.current.updateQuantity("nonexistent", 5);
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0].quantity).toBe(1);
    });

    it("differentiates variant items when updating quantity", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct, { color: "red" });
      });
      act(() => {
        result.current.addToCart(sampleProduct, { color: "blue" });
      });
      act(() => {
        result.current.updateQuantity("prod-1", 1, { color: "red" });
      });

      const redItem = result.current.cart.find(
        (i) => i.selectedVariants?.color === "red",
      );
      const blueItem = result.current.cart.find(
        (i) => i.selectedVariants?.color === "blue",
      );
      expect(redItem?.quantity).toBe(2);
      expect(blueItem?.quantity).toBe(1);
    });
  });

  // ── removeFromCart ─────────────────────────────────────────────
  describe("removeFromCart", () => {
    it("removes the matching item", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct);
      });
      act(() => {
        result.current.removeFromCart("prod-1");
      });

      expect(result.current.cart).toHaveLength(0);
    });

    it("only removes the matching item, preserving others", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct);
      });
      act(() => {
        result.current.addToCart({ ...sampleProduct, id: "prod-2" });
      });
      act(() => {
        result.current.removeFromCart("prod-1");
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0].product.id).toBe("prod-2");
    });

    it("removes the correct variant item", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct, { color: "red" });
      });
      act(() => {
        result.current.addToCart(sampleProduct, { color: "blue" });
      });
      act(() => {
        result.current.removeFromCart("prod-1", { color: "red" });
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0].selectedVariants?.color).toBe("blue");
    });

    it("is a no-op for a non-existent product", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct);
      });
      act(() => {
        result.current.removeFromCart("nonexistent");
      });

      expect(result.current.cart).toHaveLength(1);
    });
  });

  // ── clearCart ──────────────────────────────────────────────────
  describe("clearCart", () => {
    it("empties the cart", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct);
      });
      act(() => {
        result.current.addToCart({ ...sampleProduct, id: "prod-2" });
      });
      act(() => {
        result.current.clearCart();
      });

      expect(result.current.cart).toHaveLength(0);
    });

    it("removes the cart key from localStorage", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct);
      });
      act(() => {
        result.current.clearCart();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith("duken_cart");
    });
  });

  // ── cartTotal ──────────────────────────────────────────────────
  describe("cartTotal", () => {
    it("returns 0 for an empty cart", () => {
      const { result } = renderHook(() => useCart());

      expect(result.current.cartTotal).toBe(0);
    });

    it("calculates sum of (price * quantity) for all items", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct, undefined, 2);
      });
      act(() => {
        result.current.addToCart(
          { ...sampleProduct, id: "prod-2", price: 500 },
          undefined,
          3,
        );
      });

      expect(result.current.cartTotal).toBe(1000 * 2 + 500 * 3);
    });

    it("includes variantPriceAdjustment in the calculation", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct, { size: "L" }, 1, 200);
      });

      expect(result.current.cartTotal).toBe(1000 + 200);
    });

    it("handles variantPriceAdjustment of 0 correctly", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct, { size: "M" }, 2, 0);
      });

      expect(result.current.cartTotal).toBe(1000 * 2);
    });
  });

  // ── cartCount ──────────────────────────────────────────────────
  describe("cartCount", () => {
    it("returns 0 for an empty cart", () => {
      const { result } = renderHook(() => useCart());

      expect(result.current.cartCount).toBe(0);
    });

    it("sums all item quantities", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addToCart(sampleProduct, undefined, 3);
      });
      act(() => {
        result.current.addToCart({ ...sampleProduct, id: "prod-2" }, undefined, 2);
      });

      expect(result.current.cartCount).toBe(5);
    });
  });

  // ── localStorage persistence ──────────────────────────────────
  describe("localStorage persistence", () => {
    it("persists cart to localStorage when it changes", () => {
      const { result } = renderHook(() => useCart());

      // Clear the initial render's effect call (saves empty [])
      vi.clearAllMocks();

      act(() => {
        result.current.addToCart(sampleProduct);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "duken_cart",
        expect.any(String),
      );
      const saved = JSON.parse(
        (localStorageMock.setItem as ReturnType<typeof vi.fn>).mock
          .calls[0][1],
      );
      expect(saved).toHaveLength(1);
      expect(saved[0].product.id).toBe("prod-1");
    });

    it("restores cart from localStorage on mount", () => {
      store["duken_cart"] = JSON.stringify([
        { product: sampleProduct, quantity: 2 },
      ]);

      const { result } = renderHook(() => useCart());

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0].quantity).toBe(2);
    });

    it("handles invalid localStorage JSON gracefully", () => {
      store["duken_cart"] = "invalid json {{{";

      const { result } = renderHook(() => useCart());

      expect(result.current.cart).toEqual([]);
    });

    it("handles empty localStorage gracefully", () => {
      const { result } = renderHook(() => useCart());

      expect(result.current.cart).toEqual([]);
    });
  });
});
