/**
 * Unit Tests for useCart Hook
 * 
 * NOTE: These tests require @testing-library/react and vitest to be installed.
 * Run: npm install --save-dev @testing-library/react
 * 
 * To run tests: npm run test
 */

import { renderHook, act } from "@testing-library/react";
import { useCart } from "../hooks/useCart";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

const mockProduct = {
  id: "prod-001",
  name: "Test Product",
  price: 100,
  stock: 10,
  image: "/test.jpg",
  description: "Test description",
  category: "Electronics",
};

describe("useCart", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("initializes with empty cart", () => {
    const { result } = renderHook(() => useCart());
    
    expect(result.current.cart).toEqual([]);
    expect(result.current.cartCount).toBe(0);
    expect(result.current.cartTotal).toBe(0);
  });

  it("adds product to cart", () => {
    const { result } = renderHook(() => useCart());
    
    act(() => {
      result.current.addToCart(mockProduct);
    });
    
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].product.id).toBe("prod-001");
    expect(result.current.cart[0].quantity).toBe(1);
    expect(result.current.cartCount).toBe(1);
    expect(result.current.cartTotal).toBe(100);
  });

  it("increases quantity when adding same product", () => {
    const { result } = renderHook(() => useCart());
    
    act(() => {
      result.current.addToCart(mockProduct);
      result.current.addToCart(mockProduct);
    });
    
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].quantity).toBe(2);
    expect(result.current.cartCount).toBe(2);
    expect(result.current.cartTotal).toBe(200);
  });

  it("respects stock limit when adding to cart", () => {
    const lowStockProduct = { ...mockProduct, stock: 2 };
    const { result } = renderHook(() => useCart());
    
    act(() => {
      result.current.addToCart(lowStockProduct, undefined, 5);
    });
    
    expect(result.current.cart[0].quantity).toBe(2); // Limited to stock
  });

  it("updates quantity", () => {
    const { result } = renderHook(() => useCart());
    
    act(() => {
      result.current.addToCart(mockProduct);
      result.current.updateQuantity(mockProduct.id, 2);
    });
    
    expect(result.current.cart[0].quantity).toBe(3);
    expect(result.current.cartCount).toBe(3);
  });

  it("removes product from cart", () => {
    const { result } = renderHook(() => useCart());
    
    act(() => {
      result.current.addToCart(mockProduct);
      result.current.removeFromCart(mockProduct.id);
    });
    
    expect(result.current.cart).toHaveLength(0);
    expect(result.current.cartCount).toBe(0);
  });

  it("clears cart", () => {
    const { result } = renderHook(() => useCart());
    
    act(() => {
      result.current.addToCart(mockProduct);
      result.current.clearCart();
    });
    
    expect(result.current.cart).toHaveLength(0);
    expect(result.current.cartCount).toBe(0);
  });

  it("persists cart to localStorage", () => {
    const { result } = renderHook(() => useCart());
    
    act(() => {
      result.current.addToCart(mockProduct);
    });
    
    const stored = localStorage.getItem("duken_cart");
    expect(stored).toBeTruthy();
    
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].product.id).toBe("prod-001");
  });

  it("loads cart from localStorage on initialization", () => {
    // Pre-populate localStorage
    const initialCart = [{ product: mockProduct, quantity: 2 }];
    localStorage.setItem("duken_cart", JSON.stringify(initialCart));
    
    const { result } = renderHook(() => useCart());
    
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].quantity).toBe(2);
    expect(result.current.cartCount).toBe(2);
  });

  it("does not add out of stock products", () => {
    const outOfStockProduct = { ...mockProduct, stock: 0 };
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(outOfStockProduct);
    });

    expect(result.current.cart).toHaveLength(0);
  });

  it("applies variant price adjustment to cart total", () => {
    const { result } = renderHook(() => useCart());
    const variantProduct = { ...mockProduct, price: 100 };
    const adjustment = 50;

    act(() => {
      result.current.addToCart(variantProduct, { size: "XL" }, 1, adjustment);
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].variantPriceAdjustment).toBe(50);
    expect(result.current.cartTotal).toBe(150);
  });

  it("accumulates multiple items with variant adjustments correctly", () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(mockProduct, { size: "XL" }, 1, 50);
      result.current.addToCart({ ...mockProduct, id: "prod-002" }, { color: "red" }, 2, 30);
    });

    expect(result.current.cart).toHaveLength(2);
    // (100 + 50) * 1 + (100 + 30) * 2 = 150 + 260 = 410
    expect(result.current.cartTotal).toBe(410);
  });

  it("deduplicates same product with same variants, keeping adjustment", () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(mockProduct, { size: "XL" }, 1, 50);
      result.current.addToCart(mockProduct, { size: "XL" }, 2, 50);
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].quantity).toBe(3);
    expect(result.current.cartTotal).toBe(450); // (100 + 50) * 3
  });

  it("no variant adjustment defaults to base price", () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(mockProduct);
    });

    expect(result.current.cartTotal).toBe(100);
  });
});

/**
 * Additional Test Examples for Other Hooks
 * 
 * useProductSearch Tests:
 * 
 * describe("useProductSearch", () => {
 *   it("debounces search input", async () => {
 *     const { result } = renderHook(() => useProductSearch(products));
 *     
 *     act(() => {
 *       result.setSearchQuery("test");
 *     });
 *     
 *     // Should not filter immediately
 *     expect(result.filteredProducts).toEqual(products);
 *     
 *     // Wait for debounce
 *     await act(() => new Promise(resolve => setTimeout(resolve, 350)));
 *     
 *     expect(result.filteredProducts.length).toBeLessThanOrEqual(products.length);
 *   });
 * });
 * 
 * useDashboardActions Tests:
 * 
 * describe("useDashboardActions", () => {
 *   it("updates order status with optimistic UI", async () => {
 *     const mockUpdateOrderOptimistic = vi.fn();
 *     const { result } = renderHook(() => useDashboardActions({
 *       isPro: true,
 *       orders: [],
 *       totalConfirmed: 0,
 *       updateOrderOptimistic: mockUpdateOrderOptimistic,
 *       rollbackOrder: vi.fn(),
 *       reload: vi.fn(),
 *       MESSAGES: {},
 *       ERRORS: {},
 *     }));
 *     
 *     await act(async () => {
 *       await result.current.updateOrderStatus("order-1", "confirmed");
 *     });
 *     
 *     expect(mockUpdateOrderOptimistic).toHaveBeenCalledWith("order-1", "confirmed");
 *   });
 * });
 */
