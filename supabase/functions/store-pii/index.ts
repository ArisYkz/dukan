import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const bridgeUrl = Deno.env.get("KZ_BRIDGE_URL");
    const bridgeKey = Deno.env.get("KZ_BRIDGE_KEY");

    if (!bridgeUrl || !bridgeKey) {
      console.error(`store-pii: missing KZ_BRIDGE_URL=${!!bridgeUrl} KZ_BRIDGE_KEY=${!!bridgeKey}`);
      return new Response(JSON.stringify({ error: "Bridge not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate caller
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GET: read store PII from bridge ──
    if (req.method === "GET") {
      const url = new URL(req.url);
      const storeId = url.searchParams.get("storeId");
      if (!storeId) {
        return new Response(JSON.stringify({ error: "missing storeId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify caller owns this store (admins can read any store's PII)
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      const isAdmin = profile?.role === "admin";

      if (!isAdmin) {
        const { data: membership } = await supabase
          .from("store_members")
          .select("store_id")
          .eq("store_id", storeId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!membership) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const bridgeRes = await fetch(`${bridgeUrl}/store-pii?storeId=${storeId}`, {
        method: "GET",
        headers: { "x-bridge-key": bridgeKey },
      });

      if (!bridgeRes.ok) {
        // Bridge may 404 if no PII stored yet — return empty gracefully
        if (bridgeRes.status === 404) {
          return new Response(JSON.stringify({ iin_bin: null }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errBody = await bridgeRes.text().catch(() => "bridge error");
        console.error(`[store-pii] bridge GET failed: ${bridgeRes.status} — ${errBody}`);
        return new Response(JSON.stringify({ error: "Bridge request failed" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await bridgeRes.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── PUT: forward store-level PII to bridge ──
    if (req.method !== "PUT") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse payload
    const { storeId, kaspi_phone, whatsapp_phone, kaspi_name, iin_bin, orderPii } = await req.json();

    if (!storeId) {
      return new Response(JSON.stringify({ error: "missing storeId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller owns this store
    const { data: membership } = await supabase
      .from("store_members")
      .select("store_id")
      .eq("store_id", storeId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Forward store-level PII to bridge ──
    const storeBody: Record<string, string> = { storeId };
    if (kaspi_phone !== undefined && kaspi_phone !== null) storeBody.kaspi_phone = kaspi_phone;
    if (whatsapp_phone !== undefined && whatsapp_phone !== null) storeBody.whatsapp_phone = whatsapp_phone;
    if (kaspi_name !== undefined && kaspi_name !== null) storeBody.kaspi_name = kaspi_name;
    if (iin_bin !== undefined && iin_bin !== null) storeBody.iin_bin = iin_bin;

    let storeResult = null;
    if (Object.keys(storeBody).length > 1) { // more than just storeId
      const bridgeRes = await fetch(`${bridgeUrl}/store-pii`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-bridge-key": bridgeKey },
        body: JSON.stringify(storeBody),
      });
      storeResult = await bridgeRes.json();
      if (!bridgeRes.ok) {
        console.error(`[store-pii] bridge /store-pii failed: ${bridgeRes.status} — ${JSON.stringify(storeResult)}`);
        return new Response(JSON.stringify(storeResult), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log(`[store-pii] bridge /store-pii ok for store ${storeId}`);
    }

    // ── Forward order PII to bridge ──
    if (orderPii) {
      const { orderId, customerName, customerPhone, customerAddress } = orderPii;
      if (orderId) {
        const orderBody = { storeId, orderId, customerName, customerPhone, customerAddress };
        const bridgeRes = await fetch(`${bridgeUrl}/order-pii`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-bridge-key": bridgeKey },
          body: JSON.stringify(orderBody),
        });
        const orderResult = await bridgeRes.json();
        if (!bridgeRes.ok) {
          console.error(`[store-pii] bridge /order-pii failed: ${bridgeRes.status} — ${JSON.stringify(orderResult)}`);
          return new Response(JSON.stringify(orderResult), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.log(`[store-pii] bridge /order-pii ok for order ${orderId}`);
      }
    }

    return new Response(JSON.stringify({ success: true, storeResult }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("store-pii error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
