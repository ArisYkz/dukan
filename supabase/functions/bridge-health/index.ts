// Bridge health monitor — called by Supabase cron every 5 minutes.
// Logs failures to bridge_delivery_log so you can track bridge uptime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const bridgeUrl = Deno.env.get("KZ_BRIDGE_URL");
  const bridgeKey = Deno.env.get("KZ_BRIDGE_KEY");

  if (!bridgeUrl) {
    console.log("[bridge-health] KZ_BRIDGE_URL not set, skipping");
    return new Response(JSON.stringify({ status: "skipped", reason: "no bridge url" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  let healthy = false;
  let errorMsg: string | null = null;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(`${bridgeUrl}/health`, { signal: controller.signal });
    clearTimeout(t);

    if (res.ok) {
      const body = await res.json();
      healthy = body?.status === "ok";
      if (!healthy) errorMsg = `unexpected health response: ${JSON.stringify(body)}`;
    } else {
      errorMsg = `HTTP ${res.status} ${res.statusText}`;
    }
  } catch (e: any) {
    errorMsg = e?.message || String(e);
  }

  if (healthy) {
    console.log("[bridge-health] bridge is healthy");
  } else {
    console.error(`[bridge-health] bridge DOWN: ${errorMsg}`);
    // Log to bridge_delivery_log as a sentinel (order_id = NULL means health check)
    try {
      await supabase.from("bridge_delivery_log").insert({
        order_id: "00000000-0000-0000-0000-000000000000",
        store_id: "00000000-0000-0000-0000-000000000000",
        status: "failed",
        error_msg: `Health check failed: ${errorMsg}`,
        attempts: 1,
      });
    } catch (logErr: any) {
      console.error(`[bridge-health] failed to log: ${logErr?.message}`);
    }
  }

  return new Response(JSON.stringify({ healthy, error: errorMsg }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
