import { useState, useCallback, useEffect } from "react";
import { cartItemKey } from "@/lib/cartUtils";

export interface CartProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  description?: string;
  category?: string | null;
}

export interface CartItem {
  product: CartProduct;
  quantity: number;
  selectedVariants?: Record<string, string>;
  variantPriceAdjustment?: number;
}

const CART_STORAGE_KEY = "dokan_cart";

/**
 * Custom hook for cart management with localStorage persistence.
 * 
 * Features:
 * - Automatic localStorage sync for cart state
 * - Add/remove products with variant support
 * - Quantity updates with stock validation
 * - Cart total calculation
 * - Clear cart functionality
 */
export const useCart = () => {
  // Initialize from localStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Sync to localStorage on cart changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Silently ignore storage errors (quota exceeded, etc.)
    }
  }, [cart]);

  // Add product to cart
  const addToCart = useCallback((product: CartProduct, selectedVariants?: Record<string, string>, quantity: number = 1, variantPriceAdjustment?: number) => {
    if (product.stock === 0) return;

    const key = cartItemKey(product.id, selectedVariants);

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => cartItemKey(item.product.id, item.selectedVariants) === key
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = Math.min(product.stock, updated[existingIndex].quantity + quantity);
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
        return updated;
      }

      return [...prev, { product, quantity: Math.min(product.stock, quantity), selectedVariants, variantPriceAdjustment }];
    });
  }, []);

  // Update product quantity (remove item when quantity reaches 0)
  const updateQuantity = useCallback((productId: string, delta: number, selectedVariants?: Record<string, string>) => {
    const key = cartItemKey(productId, selectedVariants);

    setCart((prev) => {
      const index = prev.findIndex(
        (item) => cartItemKey(item.product.id, item.selectedVariants) === key
      );

      if (index === -1) return prev;

      const updated = [...prev];
      const item = updated[index];
      const newQty = item.quantity + delta;

      if (newQty <= 0) {
        updated.splice(index, 1);
        return updated;
      }

      updated[index] = { ...item, quantity: Math.min(item.product.stock, newQty) };
      return updated;
    });
  }, []);

  // Remove product from cart
  const removeFromCart = useCallback((productId: string, selectedVariants?: Record<string, string>) => {
    const key = cartItemKey(productId, selectedVariants);
    setCart((prev) =>
      prev.filter((item) => cartItemKey(item.product.id, item.selectedVariants) !== key)
    );
  }, []);

  // Clear entire cart
  const clearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  // Calculate total items in cart
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate total price
  const cartTotal = cart.reduce((sum, item) => {
    const variantAdjustment = item.variantPriceAdjustment || 0;
    return sum + (item.product.price + variantAdjustment) * item.quantity;
  }, 0);

  return {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartCount,
    cartTotal,
  };
};
