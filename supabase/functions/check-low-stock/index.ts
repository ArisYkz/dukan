import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY');
const TELEGRAM_URL = TELEGRAM_API_KEY
  ? `https://api.telegram.org/bot${TELEGRAM_API_KEY}`
  : null;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all active products with stock at or below threshold
    const { data: lowProducts, error } = await supabase
      .from('products')
      .select('id, name, stock, low_stock_threshold, store_id')
      .eq('is_active', true)
      .lte('stock', supabase.raw('low_stock_threshold'));

    if (error) throw error;
    if (!lowProducts || lowProducts.length === 0) {
      return new Response(JSON.stringify({ alerted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group by store_id
    const storeGroups = new Map<string, typeof lowProducts>();
    for (const p of lowProducts) {
      if (!storeGroups.has(p.store_id)) storeGroups.set(p.store_id, []);
      storeGroups.get(p.store_id)!.push(p);
    }

    let alerted = 0;

    for (const [storeId, products] of storeGroups) {
      // Fetch store telegram_chat_id and plan_type
      const { data: store } = await supabase
        .from('stores')
        .select('telegram_chat_id, plan_type, name')
        .eq('id', storeId)
        .single();

      if (!store?.telegram_chat_id) continue;
      if (!['standard', 'pro', 'pro_monthly', 'pro_year'].includes(store.plan_type)) continue;
      if (!TELEGRAM_URL) continue;

      // Build message
      const lines = products.map(
        (p) => `• <b>${escapeHtml(p.name)}</b> — ${p.stock} left (threshold: ${p.low_stock_threshold})`,
      );
      const text = [
        `<b>⚠️ Low Stock Alert — ${escapeHtml(store.name)}</b>`,
        '',
        ...lines,
        '',
        `<i>${products.length} product(s) need restocking.</i>`,
      ].join('\n');

      try {
        await fetch(`${TELEGRAM_URL}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: store.telegram_chat_id,
            text,
            parse_mode: 'HTML',
          }),
        });
        alerted++;
      } catch {
        console.error(`Failed to send low-stock alert for store ${storeId}`);
      }
    }

    return new Response(JSON.stringify({ alerted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('check-low-stock error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
