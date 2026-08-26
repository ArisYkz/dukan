import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  processOrderCallback,
  processStoreApprove,
  processStoreBan,
  editTelegramCallbackMessage,
  answerCallbackQuery,
} from '../_shared/telegram-callbacks.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');

    if (!TELEGRAM_API_KEY) {
      console.error('CRITICAL: TELEGRAM_API_KEY is not configured in Secrets');
      return new Response(JSON.stringify({ error: 'Config missing' }), { status: 500, headers: corsHeaders });
    }

    const TELEGRAM_URL = `https://api.telegram.org/bot${TELEGRAM_API_KEY}`;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const rawBody = await req.text();
    console.log('Incoming Telegram Update:', rawBody);

    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      return new Response('Invalid JSON', { status: 400 });
    }

    const jsonHeaders = { 'Content-Type': 'application/json' };

    // Scene A: Direct message (user sends /start to get their chat ID)
    if (body.message && body.message.chat) {
      const chatId = body.message.chat.id;
      const reply = `✦  <b>Duken</b>  ✦\n\n🆔  Сіздің ID нөміріңіз / Ваш ID:\n<code>${chatId}</code>\n\nCopy this ID and paste it into your Store Branding settings to activate instant order alerts.`;

      await fetch(`${TELEGRAM_URL}/sendMessage`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ chat_id: chatId, text: reply, parse_mode: 'HTML' }),
      });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Scene B: Inline button callback (callback_query)
    const callback_query = body.callback_query;
    if (!callback_query) {
      console.log('No callback_query or message found, skipping.');
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    const { data, message, id: query_id } = callback_query;
    const parts = data.split(':');
    const action = parts[0];
    let status_text = '';

    console.log(`Processing action: ${action} for ID: ${parts[1]}`);

    if (action === 'confirm' || action === 'reject') {
      const order_id = parts[1];
      if (!order_id) {
        status_text = '⚠️ Order ID missing';
      } else {
        const result = await processOrderCallback(supabase, action, order_id);
        status_text = result.statusText;
      }

      const originalText = message?.text || message?.caption || '';
      const hasCaption = message?.caption !== undefined;
      await editTelegramCallbackMessage(TELEGRAM_URL, message.chat.id, message.message_id, originalText, status_text, hasCaption);

    } else if (action === 'approve' || action === 'ban') {
      const store_id = parts[1];
      const requested_plan = parts[2];

      if (action === 'approve') {
        const result = await processStoreApprove(supabase, store_id, requested_plan);
        status_text = result.statusText;
      } else {
        const result = await processStoreBan(supabase, store_id);
        status_text = result.statusText;
      }

      await fetch(`${TELEGRAM_URL}/editMessageCaption`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          chat_id: message.chat.id,
          message_id: message.message_id,
          caption: `${message.caption || ''}\n\n📌 <b>Шешім:</b> ${status_text}`,
          parse_mode: 'HTML',
        }),
      });
    }

    await answerCallbackQuery(TELEGRAM_URL, query_id, status_text);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Fatal Error in handle-callback:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
