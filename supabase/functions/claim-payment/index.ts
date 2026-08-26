import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.25.76';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const claimSchema = z.object({
  orderId: z.string().uuid(),
  referenceCode: z.string().min(1),
  origin: z.string().url().optional(),
});

const formatPrice = (price: number) => new Intl.NumberFormat('kk-KZ').format(price) + ' ₸';

const getRequesterIp = (req: Request) => {
  const forwarded = req.headers.get('x-forwarded-for');
  if (!forwarded) return null;
  return forwarded.split(',')[0]?.trim() || null;
};

/** Read order PII from the KZ bridge, falling back to placeholders. */
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const telegramApiKey = Deno.env.get('TELEGRAM_API_KEY');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (!telegramApiKey) {
    return new Response(JSON.stringify({ error: 'TELEGRAM_API_KEY is not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await req.json();
    console.log('claim-payment request body:', JSON.stringify(payload));
    const parsed = claimSchema.safeParse(payload);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const input = parsed.data;
    const requesterIp = getRequesterIp(req);

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, store_id, public_order_id, customer_phone, customer_phone_hash, total_price, status, reference_code, discount_amount')
      .eq('id', input.orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate reference code — prevents fraud where someone guesses an order UUID
    if (input.referenceCode !== order.reference_code) {
      return new Response(JSON.stringify({ error: 'Invalid reference code.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: store, error: storeErr } = await supabase
      .from('stores')
      .select('id, name, slug, telegram_chat_id')
      .eq('id', order.store_id)
      .single();

    if (storeErr || !store) {
      return new Response(JSON.stringify({ error: 'Store not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read order PII from KZ bridge (source of truth for customer info)
    const pii = await getOrderPii(order.id, order.customer_phone || '—');

    const { data: paymentAttempt, error: attemptErr } = await supabase
      .from('payment_attempts')
      .insert({
        order_id: order.id,
        store_id: order.store_id,
        phone_hash: order.customer_phone_hash,
        requester_ip: requesterIp,
        status: 'pending',
      })
      .select('id')
      .single();

    if (attemptErr || !paymentAttempt) throw attemptErr;

    let attemptsQuery = supabase
      .from('payment_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', order.store_id)
      .in('status', ['pending', 'suspicious']);

    if (requesterIp) {
      attemptsQuery = attemptsQuery.or(`phone_hash.eq.${order.customer_phone_hash},requester_ip.eq.${requesterIp}`);
    } else {
      attemptsQuery = attemptsQuery.eq('phone_hash', order.customer_phone_hash);
    }

    const { count, error: countErr } = await attemptsQuery;
    if (countErr) throw countErr;

    const isSuspicious = (count || 0) >= 3;

    if (isSuspicious) {
      await supabase
        .from('payment_attempts')
        .update({ status: 'suspicious' })
        .eq('id', paymentAttempt.id);
    }

    await supabase
      .from('orders')
      .update({ status: 'awaiting_verification' })
      .eq('id', order.id);

    let notificationError: string | null = null;

    if (store.telegram_chat_id) {
      const caption = `
✦  <b>ТӨЛЕМДІ РАСТАУ</b>  ✦
━━━━━━━━━━━━━━━━━━
📦  <b>№:</b>  <code>${order.public_order_id}</code>
👤  <b>Клиент:</b>  ${pii.name}
💰  <b>Сома:</b>  ${formatPrice(order.total_price)}
🔑  <b>Код:</b>  <code>${order.reference_code || '—'}</code>
📞  <b>Тел:</b>  <code>${pii.phone}</code>
📍  <b>Мекенжай:</b>  ${pii.address}
━━━━━━━━━━━━━━━━━━
⏳  <b>KASPI-ДІ ТЕКСЕРІҢІЗ:</b>
<i>Ақша түссе, төмендегі батырманы басыңыз.</i>${isSuspicious ? '\n\n⚠️ <b>КҮДІКТІ:</b> бұл телефон/IP 3+ расталмаған сұрау жіберді.' : ''}
      `.trim();

      const response = await fetch(`https://api.telegram.org/bot${telegramApiKey}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: store.telegram_chat_id,
          parse_mode: 'HTML',
          text: caption,
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Төлемді растау', callback_data: `confirm:${order.id}` },
                { text: '❌ Бас тарту', callback_data: `reject:${order.id}` },
              ],
            ],
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        notificationError = `Telegram API call failed [${response.status}]: ${JSON.stringify(data)}`;
      }
    }

    return new Response(JSON.stringify({ success: true, suspicious: isSuspicious, notification_error: notificationError }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('claim-payment error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
