import { useCallback } from "react";
import { toast } from "sonner";
import { updateOrderStatus as updateOrderStatusService, resolvePaymentAttempts } from "@/services/orderService";
import { updateStoreBranding } from "@/services/storeService";
import { isSlugOffensive } from "@/lib/slugFilter";
import { normalizeSlug } from "@/lib/normalizeSlug";
import { ERROR_CODES, useFormatError } from "@/lib/errorCodes";
import { FREE_CONFIRMED_LIMIT, OrderStatus } from "@/constants/business";
import type { OrderRow, BrandFormState, ProductRow, StoreRow } from "@/types/store";

interface UseDashboardActionsProps {
  isPro: boolean;
  orders: OrderRow[];
  totalConfirmed: number;
  updateOrderOptimistic: (orderId: string, status: string) => void;
  rollbackOrder: (orderId: string, oldStatus: string) => void;
  reload: () => void;
  MESSAGES: Record<string, string>;
  ERRORS: Record<string, string>;
  products?: ProductRow[];
  categories?: string[];
  updateProductOptimistic?: (productId: string, updates: Partial<ProductRow>) => void;
}

/**
 * Custom hook for dashboard action operations.
 * 
 * Centralizes:
 * - Order status updates with optimistic UI
 * - CSV export for orders
 * - Branding/settings save with validation
 * - Store creation
 * 
 * All operations include toast feedback for async results.
 */
export const useDashboardActions = ({
  isPro,
  orders,
  totalConfirmed,
  updateOrderOptimistic,
  rollbackOrder,
  reload,
  MESSAGES,
  ERRORS,
  products,
  categories,
  updateProductOptimistic,
}: UseDashboardActionsProps) => {
  const formatError = useFormatError();

  /**
   * Update order status with optimistic UI and payment resolution.
   */
  const updateOrderStatus = useCallback(async (
    orderId: string,
    status: string,
    silent = false
  ) => {
    // Check free tier confirmed payment limit
    if (!isPro && status === OrderStatus.PAID_CONFIRMED) {
      const order = orders.find((o) => o.id === orderId);
      if (order && totalConfirmed + order.total_price > FREE_CONFIRMED_LIMIT) {
        toast.error(
          MESSAGES.FREE_CONFIRMED_LIMIT ||
            "Free plan allows up to ৳50,000 in confirmed payments. Upgrade to Pro for unlimited."
        );
        return false; // Indicate limit reached
      }
    }

    // Optimistic update
    const prevOrder = orders.find((o) => o.id === orderId);
    const oldStatus = prevOrder?.status || "new";
    updateOrderOptimistic(orderId, status);

    const { error } = await updateOrderStatusService(orderId, status);
    if (error) {
      rollbackOrder(orderId, oldStatus);
      if (!silent) toast.error(ERRORS?.GENERIC_ERROR || error.message);
      return false;
    }

    // Resolve payment attempts
    await resolvePaymentAttempts(orderId, status);
    if (!silent) toast.success(MESSAGES.STATUS_UPDATED);

    // Refresh store + analytics when payment is confirmed
    if (status === OrderStatus.PAID_CONFIRMED || status === OrderStatus.CONFIRMED) {
      reload();
    }

    return true;
  }, [isPro, orders, totalConfirmed, updateOrderOptimistic, rollbackOrder, reload, MESSAGES, ERRORS]);

  /**
   * Export orders to CSV file.
   */
  const exportCSV = useCallback(
    (filteredOrders: OrderRow[], storeTaxPercent: number, CSV_HEADERS: string[], storeName?: string) => {
      if (filteredOrders.length === 0) {
        toast.error(MESSAGES.NO_DATA_TO_EXPORT);
        return;
      }

      const formatDate = (iso: string) => {
        const d = new Date(iso);
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };

      const statusOrder = (status: string) => {
        const map: Record<string, string> = {
          paid_confirmed: "Paid",
          confirmed: "Confirmed",
          shipped: "Shipped",
          delivered: "Delivered",
          pending: "Pending",
          cancelled: "Cancelled",
          archived: "Archived",
          payment_rejected: "Payment Rejected",
        };
        return map[status] || status;
      };

      const rows = filteredOrders.map((order) =>
        [
          order.public_order_id,
          `"${(storeName || "").replace(/"/g, '""')}"`,
          `"${(order.customer_name || "").replace(/"/g, '""')}"`,
          `="${order.customer_phone || ""}"`,
          `"${(order.customer_address || "").replace(/"/g, '""')}"`,
          `"${(order.order_items || []).map((item) => `${item.product_name} x${item.quantity}`).join(", ")}"`,
          order.subtotal || order.total_price,
          order.discount_amount || 0,
          order.promo_code || "",
          storeTaxPercent,
          order.tax_amount || 0,
          order.total_price,
          statusOrder(order.status),
          order.reference_code || "",
          formatDate(order.created_at),
        ].join(",")
      );

      const csv = [CSV_HEADERS.join(","), ...rows].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dokan-orders-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(MESSAGES.CSV_DOWNLOADED);
    },
    [MESSAGES]
  );

  /**
   * Save branding/settings with validation.
   */
  const saveBranding = useCallback(
    async (store: StoreRow, brandForm: BrandFormState) => {
      // Validation
      if (brandForm.social_platform === "whatsapp" && !brandForm.whatsapp_phone.trim()) {
        toast.error(formatError(ERROR_CODES.STR_004));
        return false;
      }

      if (brandForm.slug && isSlugOffensive(brandForm.slug)) {
        toast.error(MESSAGES.SLUG_OFFENSIVE);
        return false;
      }

      // Format WhatsApp phone
      let formattedWhatsapp = brandForm.whatsapp_phone.replace(/\D/g, "");
      if (formattedWhatsapp.startsWith("8")) {
        formattedWhatsapp = "7" + formattedWhatsapp.slice(1);
      } else if (!formattedWhatsapp.startsWith("7") && formattedWhatsapp.length === 10) {
        formattedWhatsapp = "7" + formattedWhatsapp;
      }

      // Prepare update data
      const updateData: Record<string, unknown> = {
        name: brandForm.name,
        slug: brandForm.slug,
        instagram: brandForm.instagram,
        tiktok_handle: brandForm.tiktok_handle,
        telegram_chat_id: brandForm.telegram_chat_id,
        hero_image_url: brandForm.hero_image_url,
        hero_title: brandForm.hero_title,
        hero_subtitle: brandForm.hero_subtitle,
        payment_qr_image: brandForm.payment_qr_image,
        social_platform: brandForm.social_platform,
        show_instagram: brandForm.show_instagram,
        show_tiktok: brandForm.show_tiktok,
        show_telegram: brandForm.show_telegram,
        show_banner: brandForm.show_banner,
        default_language: brandForm.default_language,
        tax_enabled: brandForm.tax_enabled,
        tax_percent: parseFloat(brandForm.tax_percent || "0"),
        theme_preset: brandForm.theme_preset,
      };

      // Track slug customization for free users (1-change limit)
      if (!isPro && brandForm.slug !== store.slug && brandForm.slug) {
        updateData.slug_customized = true;
      }

      const { error } = await updateStoreBranding(store.id, updateData);
      if (error) {
        toast.error(formatError(ERROR_CODES.STR_003, error.message));
        return false;
      }

      toast.success(MESSAGES.SETTINGS_SAVED);
      reload();
      return true;
    },
    [MESSAGES, reload, formatError]
  );

  /**
   * Create a new store with human-readable slug from store name.
   * Collision handling: tries base → -bd → -shop → -NNN → random digits.
   */
  const createStore = useCallback(
    async (userId: string, storeName: string, createStoreService: any) => {
      const base = normalizeSlug(storeName);
      let finalSlug = base;

      for (let attempt = 0; attempt < 10; attempt++) {
        const { error } = await createStoreService(userId, storeName, finalSlug);
        if (!error) {
          toast.success(MESSAGES.STORE_CREATED);
          reload();
          return true;
        }
        if (error?.code === "23505") {
          // Collision — try next suffix
          if (attempt === 0) finalSlug = `${base}-bd`;
          else if (attempt === 1) finalSlug = `${base}-shop`;
          else finalSlug = `${base}-${Math.floor(Math.random() * 900) + 100}`;
          continue;
        }
        toast.error(formatError(ERROR_CODES.STR_002, error?.message));
        return false;
      }

      toast.error(formatError(ERROR_CODES.STR_001));
      return false;
    },
    [MESSAGES, reload, formatError]
  );

  /**
   * Bulk update category with optimistic UI.
   */
  const bulkUpdateCategory = useCallback(async (
    productIds: string[],
    categoryId: string | null,
    bulkUpdateCategoryService: (ids: string[], catId: string | null) => Promise<{ error: any }>
  ) => {
    if (productIds.length === 0) return false;
    
    // Validate category exists (if not null)
    if (categoryId && categories && !categories.includes(categoryId)) {
      toast.error(formatError(ERROR_CODES.GEN_001, "Invalid category"));
      return false;
    }
    
    // Optimistic update
    const previousProducts = products?.filter(p => productIds.includes(p.id)) || [];
    previousProducts.forEach(p => {
      updateProductOptimistic?.(p.id, { category: categoryId });
    });
    
    const { error } = await bulkUpdateCategoryService(productIds, categoryId);
    if (error) {
      // Rollback
      previousProducts.forEach(p => {
        updateProductOptimistic?.(p.id, { category: p.category });
      });
      toast.error(formatError(ERROR_CODES.GEN_001, error.message));
      return false;
    }
    
    toast.success(MESSAGES.CATEGORY_UPDATED || "Category updated successfully");
    return true;
  }, [products, categories, updateProductOptimistic, MESSAGES, formatError, ERROR_CODES]);

  /**
   * Bulk delete products permanently with optimistic removal.
   */
  const bulkDeleteProducts = useCallback(async (
    productIds: string[],
    bulkDeleteService: (ids: string[]) => Promise<{ error: any; isConstraintError?: boolean; message?: string }>
  ) => {
    if (productIds.length === 0) return false;
    
    // Optimistic removal - remove from UI immediately
    const previousProducts = products?.filter(p => productIds.includes(p.id)) || [];
    previousProducts.forEach(p => {
      // Remove from list by setting a flag that filters them out
      updateProductOptimistic?.(p.id, { _markedForDeletion: true } as any);
    });
    
    const { error, isConstraintError, message } = await bulkDeleteService(productIds);
    if (error) {
      // Rollback - restore products
      previousProducts.forEach(p => {
        updateProductOptimistic?.(p.id, { _markedForDeletion: false } as any);
      });
      
      // Show specific error for constraint violations
      if (isConstraintError) {
        toast.error(message || "Cannot delete: one or more products have existing order records. Consider deactivating instead.");
      } else {
        toast.error(ERRORS.GENERIC_ERROR || error.message);
      }
      return false;
    }
    
    toast.success(MESSAGES.PRODUCTS_DELETED || "Products deleted permanently");
    return true;
  }, [products, updateProductOptimistic, MESSAGES, ERRORS]);

  /**
   * Bulk update price with optimistic UI.
   */
  const bulkUpdatePrice = useCallback(async (
    productIds: string[],
    newPrice: number,
    bulkUpdatePriceService: (ids: string[], price: number) => Promise<{ error: any }>
  ) => {
    if (productIds.length === 0) return false;
    
    if (newPrice < 0) {
      toast.error(formatError(ERROR_CODES.GEN_001, "Price cannot be negative"));
      return false;
    }
    
    // Optimistic update
    const previousProducts = products?.filter(p => productIds.includes(p.id)) || [];
    previousProducts.forEach(p => {
      updateProductOptimistic?.(p.id, { price: newPrice });
    });
    
    const { error } = await bulkUpdatePriceService(productIds, newPrice);
    if (error) {
      // Rollback
      previousProducts.forEach(p => {
        updateProductOptimistic?.(p.id, { price: p.price });
      });
      toast.error(formatError(ERROR_CODES.GEN_001, error.message));
      return false;
    }
    
    toast.success(MESSAGES.PRICE_UPDATED || "Price updated successfully");
    return true;
  }, [products, updateProductOptimistic, MESSAGES, formatError, ERROR_CODES]);

  /**
   * Bulk update stock with optimistic UI.
   */
  const bulkUpdateStock = useCallback(async (
    productIds: string[],
    newStock: number,
    bulkUpdateStockService: (ids: string[], stock: number) => Promise<{ error: any }>
  ) => {
    if (productIds.length === 0) return false;

    if (newStock < 0) {
      toast.error(formatError(ERROR_CODES.GEN_001, "Stock cannot be negative"));
      return false;
    }

    // Optimistic update
    const previousProducts = products?.filter(p => productIds.includes(p.id)) || [];
    previousProducts.forEach(p => {
      updateProductOptimistic?.(p.id, { stock: newStock });
    });

    const { error } = await bulkUpdateStockService(productIds, newStock);
    if (error) {
      // Rollback
      previousProducts.forEach(p => {
        updateProductOptimistic?.(p.id, { stock: p.stock });
      });
      toast.error(formatError(ERROR_CODES.GEN_001, error.message));
      return false;
    }

    toast.success(MESSAGES.STOCK_UPDATED || "Stock updated successfully");
    return true;
  }, [products, updateProductOptimistic, MESSAGES, formatError, ERROR_CODES]);

  return {
    updateOrderStatus,
    exportCSV,
    saveBranding,
    createStore,
    bulkUpdateCategory,
    bulkUpdatePrice,
    bulkUpdateStock,
    bulkDeleteProducts,
  };
};
