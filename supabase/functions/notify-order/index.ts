import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
const TELEGRAM_URL = TELEGRAM_API_KEY ? `https://api.telegram.org/bot${TELEGRAM_API_KEY}` : null;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ok = (data: Record<string, unknown> = { ok: true }) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/** Read order PII from the KZ bridge, falling back to what's in Supabase. */
async function getOrderPii(orderId: string, fallbackPhone: string): Promise<{ name: string; phone: string; address: string }> {
  const bridgeUrl = Deno.env.get('KZ_BRIDGE_URL');
  const bridgeKey = Deno.env.get('KZ_BRIDGE_KEY');
  if (!bridgeUrl || !bridgeKey) return { name: '—', phone: fallbackPhone, address: '—' };

  try {
    const res = await fetch(`${bridgeUrl}/order-pii/${encodeURIComponent(orderId)}`, {
      headers: { 'x-bridge-key': bridgeKey },
    });
    if (!res.ok) return { name: '—', phone: fallbackPhone, address: '—' };
    const data = await res.json();
    if (!data.success) return { name: '—', phone: fallbackPhone, address: '—' };
    return {
      name: data.data.customer_name || '—',
      phone: data.data.customer_phone || fallbackPhone,
      address: data.data.customer_address || '—',
    };
  } catch {
    return { name: '—', phone: fallbackPhone, address: '—' };
  }
}

async function sendTelegramMessage(chatId: string | number, text: string) {
  if (!TELEGRAM_URL) {
    console.error('CRITICAL: TELEGRAM_API_KEY is undefined');
    return;
  }
  console.log('Attempting direct Telegram reply to:', chatId);
  const res = await fetch(`${TELEGRAM_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  console.log('sendTelegramMessage status:', res.status);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const raw = await req.text();
    let body: any = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
    console.log('Full Request Body:', JSON.stringify(body));

    if (!TELEGRAM_URL) {
      console.error('Missing TELEGRAM_API_KEY');
      return ok({ success: true, message: 'Missing Telegram API key, skipped' });
    }

    const headers = { 'Content-Type': 'application/json' };

    if (body.message && body.message.chat) {
      const chatId = body.message.chat.id;
      const reply = `✦  <b>Duken</b>  ✦\n\n🆔  Сіздің ID нөміріңіз / Ваш ID:\n<code>${chatId}</code>\n\nCopy this ID and paste it into your Store Branding settings to activate instant order alerts.`;

      await fetch(`${TELEGRAM_URL}/sendMessage`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ chat_id: chatId, text: reply, parse_mode: 'HTML' }),
      });

      return ok();
    }

    if (body.callback_query) {
      const cb = body.callback_query;
      const cbData = cb.data || '';
      const queryId = cb.id;
      const chatId = cb.message?.chat?.id;
      const messageId = cb.message?.message_id;
      console.log('Processing Callback:', cbData);

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const parts = cbData.split(':');
      const action = parts[0];
      let statusText = '';

      if (action === 'confirm' || action === 'reject') {
        const orderId = parts[1];
        if (!orderId) {
          statusText = '⚠️ Order ID missing';
        } else {
          const newStatus = action === 'confirm' ? 'paid_confirmed' : 'payment_rejected';
          const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);

          if (error) {
            console.error('Order update error:', error.message);
            statusText = `⚠️ Қате: ${error.message}`;
          } else {
            await supabase
              .from('payment_attempts')
              .update({
                status: newStatus === 'paid_confirmed' ? 'confirmed' : 'rejected',
                resolved_at: new Date().toISOString(),
              })
              .eq('order_id', orderId)
              .in('status', ['pending', 'suspicious']);

            statusText = action === 'confirm'
              ? '✅ Төлем расталды'
              : '❌ Төлем қабылданбады';
          }
        }
      } else if (action === 'approve') {
        const storeId = parts[1];
        const requestedPlan = parts[2];
        const expiry = new Date();
        if (requestedPlan === 'pro_year') {
          expiry.setDate(expiry.getDate() + 365);
        } else {
          expiry.setDate(expiry.getDate() + 31);
        }
        const { error } = await supabase
          .from('stores')
          .update({
            plan_type: requestedPlan,
            subscription_status: 'active',
            subscription_expiry: expiry.toISOString(),
          })
          .eq('id', storeId);

        if (error) {
          console.error('Store approve error:', error.message);
          statusText = `⚠️ Қате: ${error.message}`;
        } else {
          statusText = `✅ Мақұлданды (${requestedPlan === 'pro_year' ? 'Жылдық' : 'Айлық'})`;
        }
      } else if (action === 'ban') {
        const storeId = parts[1];
        await supabase.from('stores').update({ subscription_status: 'banned' }).eq('id', storeId);
        statusText = '🚫 Бұғатталды';
      } else {
        statusText = 'Unknown action';
      }

      if (chatId && messageId) {
        const originalText = cb.message?.text || cb.message?.caption || '';
        const updateMethod = cb.message?.caption !== undefined ? 'editMessageCaption' : 'editMessageText';
        const textField = cb.message?.caption !== undefined ? 'caption' : 'text';

        await fetch(`${TELEGRAM_URL}/${updateMethod}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            [textField]: `${originalText}\n\n📌 <b>Шешім:</b> ${statusText}`,
            parse_mode: 'HTML',
          }),
        });

        await fetch(`${TELEGRAM_URL}/editMessageReplyMarkup`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            reply_markup: { inline_keyboard: [] },
          }),
        });
      }

      await fetch(`${TELEGRAM_URL}/answerCallbackQuery`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ callback_query_id: queryId, text: statusText }),
      });

      return ok({ success: true });
    }

    const { order_id } = body;
    if (!order_id) return ok({ success: true, message: 'Unknown payload, skipped' });

    console.log('notify-order parsed body:', JSON.stringify(body));
    console.log('Processing order_id:', order_id);

    if (!TELEGRAM_URL) {
      console.error('Missing TELEGRAM_API_KEY for order notification');
      return ok({ success: true, message: 'API key missing, skipped' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, public_order_id, customer_phone, total_price, reference_code, discount_amount, store_id')
      .eq('id', order_id)
      .single();

    if (orderErr || !order) {
      console.error('notify-order order fetch failed:', orderErr?.message);
      return ok({ success: true, message: 'Order not found, skipped' });
    }

    console.log('notify-order fetched order:', JSON.stringify(order));

    const { data: items } = await supabase
      .from('order_items')
      .select('product_name, quantity, product_price')
      .eq('order_id', order_id);

    const { data: store } = await supabase
      .from('stores')
      .select('telegram_chat_id, name, plan_type')
      .eq('id', order.store_id)
      .single();

    console.log('notify-order store info:', JSON.stringify(store));
    const proPlans = ['pro', 'pro_monthly', 'pro_year'];
    if (!store || !proPlans.includes(store.plan_type)) return ok({ success: true, message: 'Not a Pro plan, skipped' });
    if (!store.telegram_chat_id) return ok({ success: true, message: 'No Telegram connected' });

    // Read order PII from KZ bridge (source of truth for customer info)
    const pii = await getOrderPii(order.id, order.customer_phone || '—');

    const itemLines = (items ?? []).map(
      (i: any) => `    ◦ ${i.product_name}  ×${i.quantity}  —  ${(i.product_price * i.quantity).toLocaleString()} ₸`
    ).join('\n');

    const discountLine = order.discount_amount && order.discount_amount > 0
      ? `\n🏷  <b>Жеңілдік:</b>  −${order.discount_amount.toLocaleString()} ₸`
      : '';

    const caption = `
✦  <b>ЖАҢА ТАПСЫРЫС</b>  ✦
━━━━━━━━━━━━━━━━━━
📦  <b>№:</b>  <code>${order.public_order_id}</code>
👤  <b>Клиент:</b>  ${pii.name}
📞  <b>Тел:</b>  <code>${pii.phone}</code>
📍  <b>Мекенжай:</b>  ${pii.address}
━━━━━━━━━━━━━━━━━━
🛍  <b>Тауарлар:</b>
${itemLines}${discountLine}

💎  <b>ЖАЛПЫ:</b>  ${order.total_price.toLocaleString()} ₸
━━━━━━━━━━━━━━━━━━
ℹ️  <i>Клиент төлем жасап жатыр. Төлем түскенде батырмалары бар хабарлама келеді.</i>
    `.trim();

    console.log('Sending order alert to chat_id:', store.telegram_chat_id);

    const res = await fetch(`${TELEGRAM_URL}/sendMessage`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        chat_id: store.telegram_chat_id,
        text: caption,
        parse_mode: 'HTML',
      }),
    });

    const result = await res.json();
    console.log('Telegram Response:', res.status, JSON.stringify(result));

    return ok({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('notify-order error:', message);
    return ok({ ok: true, message: `Error: ${message}` });
  }
});
