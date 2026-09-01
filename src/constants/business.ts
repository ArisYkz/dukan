/**
 * Centralized business constants and order status definitions.
 * All magic strings and scattered constants should reference this file.
 */

// ─── Order Statuses ────────────────────────────────────────────
export const OrderStatus = {
  NEW: "new",
  AWAITING_VERIFICATION: "awaiting_verification",
  PAID_CONFIRMED: "paid_confirmed",
  PAYMENT_REJECTED: "payment_rejected",
  CONFIRMED: "confirmed",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  RETURNED: "returned",
  REFUNDED: "refunded",
  ARCHIVED: "archived",
} as const;

export type OrderStatusValue = (typeof OrderStatus)[keyof typeof OrderStatus];

/** Statuses that count as "confirmed" for revenue/sales tracking */
export const CONFIRMED_STATUSES: string[] = [
  OrderStatus.PAID_CONFIRMED,
  OrderStatus.CONFIRMED,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

/** Statuses that belong in the Archive tab */
export const ARCHIVED_STATUSES: string[] = [
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
  OrderStatus.RETURNED,
  OrderStatus.REFUNDED,
  OrderStatus.ARCHIVED,
];

/** Which statuses each dashboard filter tab shows */
export const FILTER_STATUS_MAP: Record<string, string[]> = {
  all: [
    OrderStatus.NEW,
    OrderStatus.AWAITING_VERIFICATION,
    OrderStatus.PAID_CONFIRMED,
    OrderStatus.PAYMENT_REJECTED,
    OrderStatus.SHIPPED,
    OrderStatus.CONFIRMED,
  ],
  new: [OrderStatus.NEW],
  payment: [OrderStatus.AWAITING_VERIFICATION, OrderStatus.PAYMENT_REJECTED],
  shipped: [OrderStatus.PAID_CONFIRMED, OrderStatus.CONFIRMED, OrderStatus.SHIPPED],
};

// ─── Free Tier Limits ──────────────────────────────────────────
export const FREE_PRODUCT_LIMIT = 5;
export const FREE_IMAGE_LIMIT = 1;
export const PRO_IMAGE_LIMIT = 5;
export const FREE_CATEGORY_LIMIT = 2;

/** Maximum confirmed revenue (৳) before free-tier store is paused */
export const FREE_CONFIRMED_LIMIT = 50_000;

// ─── Pagination ────────────────────────────────────────────────
export const STOREFRONT_PAGE_SIZE = 20;
export const DASHBOARD_ORDER_LIMIT = 200;

// ─── Timeouts ──────────────────────────────────────────────────
/** Payment window in milliseconds (30 minutes) */
export const PAYMENT_WINDOW_MS = 30 * 60 * 1000;

// ─── External Links ────────────────────────────────────────────
export const SUPPORT_TELEGRAM = "https://t.me/dokan_support";
