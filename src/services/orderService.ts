import { supabase } from "@/integrations/supabase/client";
import { OrderStatus } from "@/constants/business";

/**
 * Update an order's status.
 */
export const updateOrderStatus = async (orderId: string, status: string) => {
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  return { error };
};

/**
 * Resolve payment attempts when an order is confirmed or rejected.
 */
export const resolvePaymentAttempts = async (orderId: string, status: string) => {
  if (status === OrderStatus.PAID_CONFIRMED || status === OrderStatus.PAYMENT_REJECTED) {
    await supabase
      .from("payment_attempts")
      .update({
        status: status === OrderStatus.PAID_CONFIRMED ? "confirmed" : "rejected",
        resolved_at: new Date().toISOString(),
      })
      .eq("order_id", orderId)
      .in("status", ["pending", "suspicious"]);
  }
};

/**
 * Fetch orders for a store with order_items (legacy, use fetchStoreOrdersWithContacts instead).
 * @deprecated Use fetchStoreOrdersWithContacts for better performance
 */
export const fetchStoreOrders = async (storeId: string, limit = 200) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .range(0, limit - 1);
  if (error) throw error;
  return data || [];
};

/**
 * Fetch orders for a store with order_items AND customer phone in ONE query.
 * This prevents N+1 query problem by using a LEFT JOIN.
 * 
 * Performance: Single DB round-trip instead of 2
 */
export const fetchStoreOrdersWithContacts = async (
  storeId: string,
  offset: number = 0,
  limit: number = 20
) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), order_contacts(customer_phone)")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

/**
 * Fetch order contact phones for a list of order IDs.
 * @deprecated Use fetchStoreOrdersWithContacts instead
 */
export const fetchOrderContacts = async (orderIds: string[]) => {
  if (orderIds.length === 0) return {};
  const { data } = await supabase
    .from("order_contacts")
    .select("order_id, customer_phone")
    .in("order_id", orderIds);
  const map: Record<string, string> = {};
  (data || []).forEach((c) => {
    map[c.order_id] = c.customer_phone;
  });
  return map;
};

/**
 * Fetch promo code for a store (for checkout validation).
 */
export const fetchStorePromoCode = async (storeId: string, code: string) => {
  const { data, error } = await supabase
    .from("store_promo_codes")
    .select("*")
    .eq("store_id", storeId)
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();
  return { data, error };
};
