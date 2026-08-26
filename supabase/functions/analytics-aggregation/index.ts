import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const querySchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  store_id: z.string().uuid().optional(),
  granularity: z.enum(["daily", "hourly"]).default("daily"),
});

// Cache durations in seconds
const CACHE_DURATIONS = {
  daily: 12 * 60 * 60, // 12 hours
  hourly: 60 * 60, // 1 hour
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const parsed = querySchema.safeParse(params);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid query parameters", details: parsed.error.flatten() }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { start_date, end_date, store_id, granularity } = parsed.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables");
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check: verify JWT and enforce store ownership
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If a store_id is provided, verify the authenticated user is a store member
    if (store_id) {
      const { data: membership, error: memberErr } = await supabase
        .from("store_members")
        .select("id")
        .eq("store_id", store_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberErr || !membership) {
        return new Response(JSON.stringify({ error: "Forbidden: you are not a member of this store" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Global analytics without store_id are admin-only (not yet implemented)
      return new Response(JSON.stringify({ error: "Admin access required for global analytics" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call the PostgreSQL function (now using anon role since we've done auth checks)
    const { data, error } = await supabase.rpc("analytics_aggregation", {
      p_start_date: start_date || null,
      p_end_date: end_date || null,
      p_store_id: store_id || null,
      p_granularity: granularity,
    });

    if (error) {
      console.error("RPC error:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch analytics", details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply cache control header
    const cacheDuration = CACHE_DURATIONS[granularity];
    const cacheControl = `public, max-age=${cacheDuration}`;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": cacheControl,
      },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});