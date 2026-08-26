import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rawBody = await req.text();
  console.log('expire-stale-orders request body:', rawBody);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Expire stale "new" orders (>30 min)
    const { data: staleNewOrders, error: fetchNewErr } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'new')
      .lt('created_at', thirtyMinAgo)
      .limit(200);

    if (fetchNewErr) throw fetchNewErr;

    // Expire stale "awaiting_verification" orders (>24 hours)
    const { data: staleAwaitingOrders, error: fetchAwaitErr } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'awaiting_verification')
      .lt('created_at', twentyFourHoursAgo)
      .limit(200);

    if (fetchAwaitErr) throw fetchAwaitErr;

    const staleOrders = [...(staleNewOrders || []), ...(staleAwaitingOrders || [])];

    if (staleOrders.length === 0) {
      return new Response(JSON.stringify({ expired: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ids = staleOrders.map((o: any) => o.id);

    const { error: updateErr } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .in('id', ids);

    if (updateErr) throw updateErr;

    console.log(`Expired ${ids.length} stale orders`);

    // Send Telegram notification for each expired order (fire-and-forget)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const notifyUrl = `${supabaseUrl}/functions/v1/notify-order`;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    for (const id of ids) {
      fetch(notifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ order_id: id, type: 'expired' }),
      }).catch((err) => console.error(`Notify expired order ${id} failed:`, err));
    }

    return new Response(JSON.stringify({ expired: ids.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('expire-stale-orders error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
