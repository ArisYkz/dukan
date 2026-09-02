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
      const reply = `✦  <b>Dokan</b>  ✦\n\n🆔  Your ID:\n<code>${chatId}</code>\n\nCopy this ID and paste it into your Store Branding settings to activate instant order alerts.`;

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
            statusText = `⚠️ Error: ${error.message}`;
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
              ? '✅ Payment confirmed'
              : '❌ Payment rejected';
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
          statusText = `⚠️ Error: ${error.message}`;
        } else {
          statusText = `✅ Approved (${requestedPlan === 'pro_year' ? 'Yearly' : 'Standard'})`;
        }
      } else if (action === 'ban') {
        const storeId = parts[1];
        await supabase.from('stores').update({ subscription_status: 'banned' }).eq('id', storeId);
        statusText = '🚫 Banned';
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
            [textField]: `${originalText}\n\n📌 <b>Decision:</b> ${statusText}`,
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
      .select('id, public_order_id, customer_name, customer_phone, customer_address, total_price, reference_code, discount_amount, store_id')
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
    const proPlans = ['standard', 'pro', 'pro_monthly', 'pro_year'];
    if (!store || !proPlans.includes(store.plan_type)) return ok({ success: true, message: 'Not a Pro plan, skipped' });
    if (!store.telegram_chat_id) return ok({ success: true, message: 'No Telegram connected' });

    const pii = {
      name: order.customer_name || '—',
      phone: order.customer_phone || '—',
      address: order.customer_address || '—',
    };

    const itemLines = (items ?? []).map(
      (i: any) => `    ◦ ${i.product_name}  ×${i.quantity}  —  ${(i.product_price * i.quantity).toLocaleString()} ৳`
    ).join('\n');

    const discountLine = order.discount_amount && order.discount_amount > 0
      ? `\n🏷  <b>Discount:</b>  −${order.discount_amount.toLocaleString()} ৳`
      : '';

    const caption = `
✦  <b>NEW ORDER</b>  ✦
━━━━━━━━━━━━━━━━━━
📦  <b>No:</b>  <code>${order.public_order_id}</code>
👤  <b>Customer:</b>  ${pii.name}
📞  <b>Phone:</b>  <code>${pii.phone}</code>
📍  <b>Address:</b>  ${pii.address}
━━━━━━━━━━━━━━━━━━
🛍  <b>Items:</b>
${itemLines}${discountLine}

💎  <b>TOTAL:</b>  ${order.total_price.toLocaleString()} ৳
━━━━━━━━━━━━━━━━━━
ℹ️  <i>The customer is making a payment. You'll get a message with buttons once the payment arrives.</i>
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
