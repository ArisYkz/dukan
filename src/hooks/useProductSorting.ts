import { useMemo } from "react";

export type SortType = "default" | "price" | "date";
export type SortDirection = "asc" | "desc";

export interface SortConfig {
  type: SortType;
  direction?: SortDirection;
}

export interface SortableProduct {
  id: string;
  price: number;
  stock: number;
  sort_order?: number;
  created_at?: string | null;
  category?: string | null;
}

/**
 * Custom hook for product sorting.
 *
 * Features:
 * - Default: sort by sort_order then created_at (newest first)
 * - Price sorting: ascending/descending
 * - Date sorting: ascending/descending
 * - Memoized for performance - only recalculates when products or sortConfig change
 */
export const useProductSorting = <T extends SortableProduct>(
  products: T[],
  sortConfig: SortConfig
): T[] => {
  return useMemo(() => {
    if (products.length === 0) return [];

    const toSort = [...products];

    if (sortConfig.type === "price") {
      const direction = sortConfig.direction === "asc" ? 1 : -1;
      toSort.sort((a, b) => (a.price - b.price) * direction);
    } else if (sortConfig.type === "date") {
      const direction = sortConfig.direction === "asc" ? 1 : -1;
      toSort.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return (timeA - timeB) * direction;
      });
    } else {
      // Default: sort by sort_order (ascending), then by newest first
      toSort.sort((a, b) => {
        const orderA = a.sort_order ?? 999;
        const orderB = b.sort_order ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
    }

    return toSort;
  }, [products, sortConfig]);
};
