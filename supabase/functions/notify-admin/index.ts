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
  await fetch(`${TELEGRAM_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const raw = await req.text();
    let payload: any = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
    console.log('notify-admin body:', JSON.stringify(payload));

    if (payload.message && payload.message.chat) {
      const chatId = payload.message.chat.id;
      const reply = `✦  <b>Dokan Admin</b>  ✦\n\n🆔  Your ID:\n<code>${chatId}</code>`;
      await sendTelegramMessage(chatId, reply);
      return ok();
    }

    if (payload.callback_query) {
      const cb = payload.callback_query;
      const cbData = cb.data || '';
      const queryId = cb.id;
      const chatId = cb.message?.chat?.id;
      const messageId = cb.message?.message_id;
      console.log('Admin callback:', cbData);

      if (!TELEGRAM_URL) {
        console.error('Missing TELEGRAM_API_KEY for callback');
        return ok();
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const parts = cbData.split(':');
      const action = parts[0];
      let statusText = '';

      if (action === 'approve') {
        const userId = parts[1];
        const requestedPlan = parts[2];
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + (requestedPlan === 'pro_year' ? 365 : 31));

        const { error } = await supabase
          .from('profiles')
          .update({
            plan_type: requestedPlan,
            subscription_status: 'active',
            subscription_expiry: expiry.toISOString(),
          })
          .eq('user_id', userId);

        statusText = error
          ? `⚠️ Error: ${error.message}`
          : `✅ Approved (${requestedPlan === 'pro_year' ? 'Yearly' : 'Monthly'})`;
      } else if (action === 'reject') {
        statusText = '❌ Rejected';
      } else if (action === 'ban') {
        const userId = parts[1];
        await supabase.from('profiles').update({ subscription_status: 'banned' }).eq('user_id', userId);
        statusText = '🚫 Banned';
      } else {
        statusText = 'Unknown action';
      }

      if (chatId && messageId) {
        const originalText = cb.message?.caption || cb.message?.text || '';
        const updateMethod = cb.message?.caption !== undefined ? 'editMessageCaption' : 'editMessageText';
        const textField = cb.message?.caption !== undefined ? 'caption' : 'text';

        await fetch(`${TELEGRAM_URL}/${updateMethod}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            [textField]: `${originalText}\n\n📌 <b>Decision:</b> ${statusText}`,
            parse_mode: 'HTML',
          }),
        });

        await fetch(`${TELEGRAM_URL}/editMessageReplyMarkup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            reply_markup: { inline_keyboard: [] },
          }),
        });
      }

      await fetch(`${TELEGRAM_URL}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: queryId, text: statusText }),
      });

      return ok({ success: true });
    }

    const user_id = payload.user_id || payload.seller_id || payload.store_id;
    const { screenshot_url, plan_type, amount, code } = payload;

    if (!user_id || !screenshot_url) {
      return ok({ success: true, message: 'Unknown payload, skipped' });
    }

    const ADMIN_CHAT_ID = Deno.env.get('ADMIN_CHAT_ID');

    if (!TELEGRAM_URL || !ADMIN_CHAT_ID) {
      console.error('Missing keys for subscription notification');
      return ok({ success: true, message: 'Keys missing, skipped' });
    }

    const planDisplay = plan_type === 'pro_year' ? '🏆 Yearly (Pro Year)' : '⚡ Monthly (Pro Month)';

    const caption = `
🚀 <b>Dokan Pro subscription request</b>
━━━━━━━━━━━━━━━━━━
👤 <b>User ID:</b> <code>${user_id}</code>
💰 <b>Amount:</b> ${amount || 'N/A'} ৳
📅 <b>Plan:</b> ${planDisplay}
🔢 <b>Code:</b> <code>${code || 'N/A'}</code>
━━━━━━━━━━━━━━━━━━
⚠️ <b>Check the payment in your app!</b>
    `.trim();

    const res = await fetch(`${TELEGRAM_URL}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        photo: screenshot_url,
        caption,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Approve', callback_data: `approve:${user_id}:${plan_type}` },
              { text: '❌ Reject', callback_data: `reject:${user_id}` },
            ],
            [
              { text: '🚫 Ban', callback_data: `ban:${user_id}` },
            ],
          ],
        },
      }),
    });

    const result = await res.json();
    console.log('Telegram sendPhoto:', res.status, JSON.stringify(result));

    if (!res.ok) {
      console.error('sendPhoto failed:', JSON.stringify(result));
      return ok({ success: false, message: `Telegram error ${res.status}` });
    }

    return ok({ success: true });
  } catch (e) {
    console.error('notify-admin error:', e.message);
    return ok({ ok: true, message: `Error: ${e.message}` });
  }
});
