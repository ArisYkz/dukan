/**
 * Generate a stable key for a cart item based on product ID and selected variants.
 * Replaces expensive JSON.stringify comparisons.
 */
export const cartItemKey = (productId: string, selectedVariants?: Record<string, string>): string => {
  if (!selectedVariants || Object.keys(selectedVariants).length === 0) return productId;
  const sorted = Object.entries(selectedVariants).sort(([a], [b]) => a.localeCompare(b));
  return `${productId}::${sorted.map(([k, v]) => `${k}=${v}`).join("|")}`;
};
