import type { OrderRow } from "@/types/store";
const STATUS_LABELS: Record<string, string> = {
  new: "New", awaiting_verification: "Awaiting Verification",
  paid_confirmed: "Payment Confirmed", payment_rejected: "Payment Not Received",
  shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
  confirmed: "Confirmed", archived: "Archived",
  returned: "Returned", refunded: "Refunded",
};
import { OrderStatus, OrderStatusValue } from "@/constants/business";
// Re-export from centralized constants for backward compatibility
export {
  ARCHIVED_STATUSES,
  FREE_PRODUCT_LIMIT,
  FREE_IMAGE_LIMIT,
  PRO_IMAGE_LIMIT,
  FREE_CATEGORY_LIMIT,
  FREE_CONFIRMED_LIMIT,
  SUPPORT_TELEGRAM,
  FILTER_STATUS_MAP as filterStatuses,
} from "@/constants/business";

/** Format a numeric price to Kazakh tenge display string */
export const formatPrice = (price: number) =>
  new Intl.NumberFormat("kk-KZ").format(price) + " ₸";

/** Human-readable status label (English) */
export const statusLabel = (status: string): string =>
  STATUS_LABELS[status] || status;

/** Tailwind class string for order-status badge colouring */
export const statusColor = (status: string): string => {
  if (
    ([OrderStatus.PAID_CONFIRMED, OrderStatus.CONFIRMED, OrderStatus.DELIVERED] as string[]).includes(
      status,
    )
  )
    return "bg-accent/15 text-accent";
  if (status === OrderStatus.NEW) return "bg-secondary text-secondary-foreground";
  if (status === OrderStatus.AWAITING_VERIFICATION)
    return "bg-[hsl(45,80%,50%)]/15 text-[hsl(45,80%,35%)]";
  if (
    ([OrderStatus.PAYMENT_REJECTED, OrderStatus.CANCELLED] as string[]).includes(status)
  )
    return "bg-destructive/10 text-destructive";
  if (status === OrderStatus.SHIPPED) return "bg-primary/10 text-primary";
  return "bg-muted text-muted-foreground";
};

/** Order filter types */
export type OrderFilter = "all" | "new" | "payment" | "shipped";

/** Search orders by customer name, phone, or order ID */
export const filterOrdersBySearch = (orders: OrderRow[], query: string): OrderRow[] => {
  if (!query.trim()) return orders;
  const q = query.toLowerCase();
  return orders.filter(
    (order) =>
      order.customer_name.toLowerCase().includes(q) ||
      order.customer_phone.toLowerCase().includes(q) ||
      order.public_order_id.toLowerCase().includes(q),
  );
};
