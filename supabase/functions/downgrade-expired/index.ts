import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    // Find all profiles with an expired Pro subscription
    const now = new Date().toISOString();
    const { data: expired, error: fetchErr } = await supabase
      .from('profiles')
      .select('user_id, plan_type, subscription_expiry')
      .in('plan_type', ['standard', 'pro_month', 'pro_year', 'pro', 'pro_monthly'])
      .lt('subscription_expiry', now);

    if (fetchErr) throw fetchErr;

    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ downgraded: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userIds = expired.map((p: any) => p.user_id);

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        plan_type: 'free',
        subscription_status: 'none',
        subscription_expiry: null,
      })
      .in('user_id', userIds);

    if (updateErr) throw updateErr;

    console.log(`Downgraded ${userIds.length} expired subscriptions`, userIds);

    return new Response(JSON.stringify({ downgraded: userIds.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('downgrade-expired error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
