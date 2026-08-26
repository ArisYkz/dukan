import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { processOrderCallback, answerCallbackQuery, editTelegramCallbackMessage } from '../_shared/telegram-callbacks.ts';

const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;
const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
if (!TELEGRAM_API_KEY) throw new Error('TELEGRAM_API_KEY is not configured');
const TELEGRAM_URL = `https://api.telegram.org/bot${TELEGRAM_API_KEY}`;

Deno.serve(async () => {
  console.log('telegram-poll execution started');
  const startTime = Date.now();

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let totalProcessed = 0;
  let currentOffset: number;

  const { data: state, error: stateErr } = await supabase
    .from('telegram_bot_state')
    .select('update_offset')
    .eq('id', 1)
    .single();

  if (stateErr) {
    return new Response(JSON.stringify({ error: stateErr.message }), { status: 500 });
  }

  currentOffset = state.update_offset;
  console.log('telegram-poll current offset:', currentOffset);

  while (true) {
    const elapsed = Date.now() - startTime;
    const remainingMs = MAX_RUNTIME_MS - elapsed;

    if (remainingMs < MIN_REMAINING_MS) break;

    const timeout = Math.min(50, Math.floor(remainingMs / 1000) - 5);
    if (timeout < 1) break;

    const response = await fetch(`${TELEGRAM_URL}/getUpdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offset: currentOffset,
        timeout,
        allowed_updates: ['callback_query'],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data }), { status: 502 });
    }

    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    for (const update of updates) {
      const cb = update.callback_query;
      if (!cb?.data) continue;

      const [action, orderId] = cb.data.split(':');
      if (!orderId || !['confirm', 'reject'].includes(action)) continue;

      const result = await processOrderCallback(supabase, action, orderId);
      const emoji = action === 'confirm' ? '✅' : '❌';
      const label = action === 'confirm' ? 'Payment Confirmed' : 'Payment Rejected';

      let answerText: string;
      if (result.error) {
        answerText = '⚠️ Error updating order. Try from dashboard.';
      } else {
        answerText = `${emoji} ${label} — ${orderId.slice(0, 8)}`;
      }

      await answerCallbackQuery(TELEGRAM_URL, cb.id, answerText);

      if (cb.message?.chat?.id && cb.message?.message_id) {
        const updatedText = cb.message.text
          ? cb.message.text + `\n\n${emoji} <b>${label}</b>`
          : `${emoji} <b>${label}</b>`;

        await fetch(`${TELEGRAM_URL}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id,
            text: updatedText,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [] },
          }),
        }).then(r => r.text());
      }

      totalProcessed++;
    }

    const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;

    await supabase
      .from('telegram_bot_state')
      .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
      .eq('id', 1);

    currentOffset = newOffset;
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed, finalOffset: currentOffset }));
});
