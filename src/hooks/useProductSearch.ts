import { useState, useEffect, useMemo, useCallback } from "react";
import { normalizeCyrillic } from "@/lib/normalizeKazakh";

export interface SearchableProduct {
  name: string;
  description?: string | null;
  category?: string | null;
}

/**
 * Custom hook for product search with debounce and Cyrillic normalization.
 * 
 * Features:
 * - 300ms debounce to avoid blocking main thread on rapid input
 * - Kazakhstan/Russian text normalization for better search matching
 * - Searches both name and description fields
 * - Optional category filtering
 * - Memoized filtering for performance
 * 
 * @param products - Array of products to search through
 * @param options - Configuration options
 * @param options.debounceMs - Debounce delay in milliseconds (default: 300)
 * @param options.categoryId - Optional category filter (use 'all' or null/undefined for no filter)
 */
export const useProductSearch = <T extends SearchableProduct>(
  products: T[],
  options: {
    debounceMs?: number;
    categoryId?: string;
  } = {}
) => {
  const { debounceMs = 300, categoryId } = options;
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  // Memoized search and category logic
  const filteredProducts = useMemo(() => {
    let result = products;

    // Apply category filter first
    if (categoryId && categoryId !== 'all') {
      result = result.filter(p => p.category === categoryId);
    }

    // Apply search filter
    if (!debouncedQuery.trim()) return result;

    const normalizedTerm = normalizeCyrillic(debouncedQuery);
    
    return result.filter((p) => {
      const normalizedName = normalizeCyrillic(p.name);
      const normalizedDescription = p.description
        ? normalizeCyrillic(p.description)
        : "";

      return (
        normalizedName.includes(normalizedTerm) ||
        normalizedDescription.includes(normalizedTerm)
      );
    });
  }, [products, debouncedQuery, categoryId]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
  }, []);

  return {
    searchQuery,
    setSearchQuery: handleSearchChange,
    debouncedQuery,
    filteredProducts,
    clearSearch,
    isSearching: debouncedQuery.trim().length > 0,
  };
};
