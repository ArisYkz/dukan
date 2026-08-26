import { renderHook } from "@testing-library/react";
import { useProductSorting } from "../hooks/useProductSorting";
import type { SortConfig } from "../hooks/useProductSorting";

const mockProducts = [
  { id: "prod-001", name: "Product A", price: 100, stock: 10, created_at: "2024-01-01T00:00:00Z", category: "Electronics" },
  { id: "prod-002", name: "Product B", price: 50, stock: 0, created_at: "2024-01-02T00:00:00Z", category: "Books" },
  { id: "prod-003", name: "Product C", price: 200, stock: 5, created_at: "2024-01-03T00:00:00Z", category: "Electronics" },
];

describe("useProductSorting", () => {
  it("returns empty array for empty products", () => {
    const { result } = renderHook(() => useProductSorting([], { type: "default" }));
    expect(result.current).toEqual([]);
  });

  it("sorts by price ascending", () => {
    const sortConfig: SortConfig = { type: "price", direction: "asc" };
    const { result } = renderHook(() => useProductSorting(mockProducts, sortConfig));
    
    expect(result.current[0].price).toBe(50);
    expect(result.current[1].price).toBe(100);
    expect(result.current[2].price).toBe(200);
  });

  it("sorts by price descending", () => {
    const sortConfig: SortConfig = { type: "price", direction: "desc" };
    const { result } = renderHook(() => useProductSorting(mockProducts, sortConfig));
    
    expect(result.current[0].price).toBe(200);
    expect(result.current[1].price).toBe(100);
    expect(result.current[2].price).toBe(50);
  });

  it("sorts by date ascending", () => {
    const sortConfig: SortConfig = { type: "date", direction: "asc" };
    const { result } = renderHook(() => useProductSorting(mockProducts, sortConfig));
    
    expect(result.current[0].id).toBe("prod-001");
    expect(result.current[1].id).toBe("prod-002");
    expect(result.current[2].id).toBe("prod-003");
  });

  it("sorts by date descending", () => {
    const sortConfig: SortConfig = { type: "date", direction: "desc" };
    const { result } = renderHook(() => useProductSorting(mockProducts, sortConfig));
    
    expect(result.current[0].id).toBe("prod-003");
    expect(result.current[1].id).toBe("prod-002");
    expect(result.current[2].id).toBe("prod-001");
  });

  it("sorts by default (sort_order then newest)", () => {
    const sortConfig: SortConfig = { type: "default" };
    const { result } = renderHook(() => useProductSorting(mockProducts, sortConfig));

    // All mock products have no sort_order, so they tiebreak by created_at (newest first)
    expect(result.current).toHaveLength(3);
    expect(result.current[0].id).toBe("prod-003");
    expect(result.current[1].id).toBe("prod-002");
    expect(result.current[2].id).toBe("prod-001");
  });

  it("does not mutate original array", () => {
    const original = [...mockProducts];
    const sortConfig: SortConfig = { type: "price", direction: "asc" };
    renderHook(() => useProductSorting(mockProducts, sortConfig));
    
    expect(mockProducts).toEqual(original);
  });

  it("memoizes results - same reference when dependencies unchanged", () => {
    const sortConfig: SortConfig = { type: "price", direction: "asc" };
    const { result, rerender } = renderHook(
      ({ products, config }) => useProductSorting(products, config),
      { initialProps: { products: mockProducts, config: sortConfig } }
    );
    
    const firstResult = result.current;
    rerender({ products: mockProducts, config: sortConfig });
    
    expect(result.current).toBe(firstResult);
  });
});
