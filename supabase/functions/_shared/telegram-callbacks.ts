import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface CallbackResult {
  statusText: string;
  error: string | null;
}

/**
 * Process an order confirm/reject callback.
 * Only transitions from awaiting_verification to prevent race conditions.
 */
export async function processOrderCallback(
  supabase: SupabaseClient,
  action: "confirm" | "reject",
  orderId: string,
): Promise<CallbackResult> {
  const newStatus = action === "confirm" ? "paid_confirmed" : "payment_rejected";

  const { error } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId)
    .eq("status", "awaiting_verification");

  if (error) {
    console.error("Order update error:", error.message);
    return { error: error.message, statusText: `⚠️ Error: ${error.message}` };
  }

  await supabase
    .from("payment_attempts")
    .update({
      status: newStatus === "paid_confirmed" ? "confirmed" : "rejected",
      resolved_at: new Date().toISOString(),
    })
    .eq("order_id", orderId)
    .in("status", ["pending", "suspicious"]);

  const statusText = action === "confirm"
    ? "✅ Төлем расталды"
    : "❌ Төлем қабылданбады";

  return { statusText, error: null };
}

/**
 * Process a store subscription approve callback.
 */
export async function processStoreApprove(
  supabase: SupabaseClient,
  storeId: string,
  requestedPlan: string,
): Promise<CallbackResult> {
  const isYear = requestedPlan === "pro_year";
  const expiry = new Date();
  isYear ? expiry.setDate(expiry.getDate() + 365) : expiry.setDate(expiry.getDate() + 31);

  const { error } = await supabase
    .from("stores")
    .update({
      plan_type: requestedPlan,
      subscription_status: "active",
      subscription_expiry: expiry.toISOString(),
    })
    .eq("id", storeId);

  if (error) {
    console.error("Store approve error:", error.message);
    return { error: error.message, statusText: `⚠️ Error: ${error.message}` };
  }

  return {
    error: null,
    statusText: `✅ Мақұлданды (${isYear ? "Жылдық" : "Айлық"})`,
  };
}

/**
 * Process a store ban callback.
 */
export async function processStoreBan(
  supabase: SupabaseClient,
  storeId: string,
): Promise<CallbackResult> {
  await supabase
    .from("stores")
    .update({ subscription_status: "banned" })
    .eq("id", storeId);

  return { statusText: "🚫 Бұғатталды", error: null };
}

/**
 * Send a message edit + remove inline keyboard from a Telegram callback message.
 */
export async function editTelegramCallbackMessage(
  telegramUrl: string,
  chatId: number,
  messageId: number,
  originalText: string,
  statusText: string,
  hasCaption: boolean,
): Promise<void> {
  const headers = { "Content-Type": "application/json" };
  const updateMethod = hasCaption ? "editMessageCaption" : "editMessageText";
  const textField = hasCaption ? "caption" : "text";

  await fetch(`${telegramUrl}/${updateMethod}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      [textField]: `${originalText}\n\n📌 <b>Шешім:</b> ${statusText}`,
      parse_mode: "HTML",
    }),
  });

  await fetch(`${telegramUrl}/editMessageReplyMarkup`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    }),
  });
}

/**
 * Answer a Telegram callback query to dismiss the loading spinner.
 */
export async function answerCallbackQuery(
  telegramUrl: string,
  queryId: string,
  text: string,
): Promise<void> {
  await fetch(`${telegramUrl}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: queryId, text }),
  });
}
