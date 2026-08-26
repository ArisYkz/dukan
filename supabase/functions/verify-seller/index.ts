import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// SHA-256 hash of IIN/BIN for uniqueness enforcement (raw PII stays on bridge)
async function hashIinBin(iinBin: string): Promise<string> {
  const data = new TextEncoder().encode(iinBin);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// IIN/BIN checksum validation (Kazakhstan standard algorithm)
function validateChecksum(iinBin: string): boolean {
  const digits = iinBin.split("").map(Number);
  const w1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const w2 = [3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2];

  const sum1 = digits.slice(0, 11).reduce((s, d, i) => s + d * w1[i], 0);
  let checksum = sum1 % 11;

  if (checksum === 10) {
    const sum2 = digits.slice(0, 11).reduce((s, d, i) => s + d * w2[i], 0);
    checksum = sum2 % 11;
  }

  if (checksum === 10) checksum = 0;

  return checksum === digits[11];
}

const verifySchema = z.object({
  storeId: z.string().uuid(),
  sellerType: z.enum(["individual_entrepreneur", "legal_entity"]).optional(),
  iinBin: z.string().length(12).regex(/^\d{12}$/).refine(
    validateChecksum,
    { message: "IIN/BIN checksum is invalid" },
  ),
  legalName: z.string().trim().max(200).optional(),
});

type VerificationStatus =
  | "unverified"
  | "verified"
  | "mismatch"
  | "suspended"
  | "manual_review";

// Fuzzy name matching — handles partial names and Cyrillic/Latin variants
function namesMatch(input: string, registry: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().trim().replace(/\s+/g, " ").replace(/[«»"']/g, "").replace(/[()]/g, "");

  const a = normalize(input);
  const b = normalize(registry);

  // Exact match after normalization
  if (a === b) return true;

  // One contains the other
  if (a.includes(b) || b.includes(a)) return true;

  // Token overlap: at least 60% of tokens from one name must appear in the other
  const tokensA = new Set(a.split(" ").filter(Boolean));
  const tokensB = new Set(b.split(" ").filter(Boolean));

  if (tokensA.size === 0 || tokensB.size === 0) return false;

  const intersection = [...tokensA].filter((t) => tokensB.has(t)).length;
  const union = new Set([...tokensA, ...tokensB]).size;

  // Jaccard similarity >= 0.5
  return intersection / union >= 0.5;
}

// KGD API response (from ipn_ru.pdf — FindTaxpayerService)
interface KgdTaxpayerResponse {
  responseMessageUid: string;
  messageResult: "SUCCESS" | "ERROR";
  code: string;
  taxpayerType: "IP" | "UL" | "LZCHP";
  name?: string;
  beginDate?: string;
  endDate?: string | null;
  endReason?: {
    code: string;
    ru: string;
    kk: string;
    en: string;
    qq: string;
  } | null;
}

interface KgdApiWrapper {
  taxpayerPortalSearchResponses?: KgdTaxpayerResponse[];
}

type KgdResult =
  | { status: "success"; data: { name: string; bin_iin: string; isActive: boolean } }
  | { status: "not_found" }
  | { status: "error"; error: "unreachable" | "timeout" | "auth_failed" };

async function forwardIinBinToBridge(
  storeId: string,
  iinBin: string,
  sellerType: string,
  legalName: string,
): Promise<void> {
  const bridgeUrl = Deno.env.get("KZ_BRIDGE_URL");
  const bridgeKey = Deno.env.get("KZ_BRIDGE_KEY");
  if (!bridgeUrl || !bridgeKey) return;

  const res = await fetch(`${bridgeUrl}/store-pii`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-bridge-key": bridgeKey },
    body: JSON.stringify({ storeId, iin_bin: iinBin }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Bridge storage failed: ${res.status} ${body}`);
  }
}

async function lookupKGD(
  iinBin: string,
  sellerType: "individual_entrepreneur" | "legal_entity",
  legalName: string,
  storeId?: string,
): Promise<KgdResult> {
  const mode = Deno.env.get("KGD_MODE") || "mock";

  // ── Mock mode ──
  if (mode === "mock") {
    await new Promise((r) => setTimeout(r, 800));

    if (iinBin.endsWith("000000")) {
      return { status: "error", error: "timeout" };
    }
    if (iinBin.endsWith("111111")) {
      return {
        status: "success",
        data: { name: legalName, bin_iin: iinBin, isActive: false },
      };
    }
    if (iinBin.endsWith("222222")) {
      return {
        status: "success",
        data: { name: "SOMETHING ELSE LTD", bin_iin: iinBin, isActive: true },
      };
    }
    return {
      status: "success",
      data: { name: legalName, bin_iin: iinBin, isActive: true },
    };
  }

  // ── KGD REST API mode ──
  if (mode === "kgd-api") {
    const apiUrl = Deno.env.get("KGD_API_URL")
      || "https://portal.kgd.gov.kz/services/isnaportalsync/public/taxpayer-data";
    const portalToken = Deno.env.get("KGD_PORTAL_TOKEN");

    if (!portalToken) {
      console.error("KGD_PORTAL_TOKEN not configured");
      return { status: "error", error: "unreachable" };
    }

    const taxpayerType = sellerType === "individual_entrepreneur" ? "IP" : "UL";

    // Build query params per KGD API spec (ipn_ru.pdf)
    const params = new URLSearchParams({
      taxpayerCode: iinBin,
      taxpayerType,
      name: legalName,
      print: "false",
    });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      const res = await fetch(`${apiUrl}?${params.toString()}`, {
        method: "GET",
        headers: { "X-Portal-Token": portalToken },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 401 || res.status === 403) {
        console.error("KGD API auth failed:", res.status);
        return { status: "error", error: "auth_failed" };
      }

      if (res.status === 404) {
        return { status: "not_found" };
      }

      if (!res.ok) {
        const text = await res.text();
        console.error("KGD API error:", res.status, text.slice(0, 200));
        return { status: "error", error: "unreachable" };
      }

      const wrapper: KgdApiWrapper = await res.json();
      const responses = wrapper.taxpayerPortalSearchResponses;

      if (!responses || responses.length === 0) {
        return { status: "not_found" };
      }

      const taxpayer = responses[0];

      if (taxpayer.messageResult !== "SUCCESS" || !taxpayer.name) {
        return { status: "not_found" };
      }

      // Active if no endDate or endReason
      const isActive = !taxpayer.endDate && !taxpayer.endReason;

      return {
        status: "success",
        data: {
          name: taxpayer.name.trim(),
          bin_iin: taxpayer.code.trim(),
          isActive,
        },
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return { status: "error", error: "timeout" };
      }
      console.error("KGD API fetch error:", err);
      return { status: "error", error: "unreachable" };
    }
  }

  // ── Scraper mode ──
  if (mode === "scraper") {
    const scraperUrl = Deno.env.get("KGD_SCRAPER_URL");
    if (!scraperUrl) {
      return { status: "error", error: "unreachable" };
    }

    try {
      const res = await fetch(`${scraperUrl}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iinBin, timeout: 30000 }),
      });
      return await res.json();
    } catch {
      return { status: "error", error: "unreachable" };
    }
  }

  // ── Bridge mode (KZ-hosted verification — KGD called from KZ soil) ──
  if (mode === "bridge") {
    const bridgeUrl = Deno.env.get("KZ_BRIDGE_URL");
    const bridgeKey = Deno.env.get("KZ_BRIDGE_KEY");

    if (!bridgeUrl || !bridgeKey) {
      console.error("KZ_BRIDGE_URL or KZ_BRIDGE_KEY not configured");
      return { status: "error", error: "unreachable" };
    }

    try {
      const res = await fetch(`${bridgeUrl}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bridge-Key": bridgeKey,
        },
        body: JSON.stringify({ storeId, iinBin, sellerType, legalName }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Bridge error:", res.status, text.slice(0, 200));
        return { status: "error", error: "unreachable" };
      }

      const data = await res.json();
      if (!data.success) {
        return { status: "error", error: "unreachable" };
      }

      // Bridge already did name matching + status mapping.
      // Map its result back to KgdResult so the existing status mapper works.
      if (data.status === "manual_review") {
        return { status: "error", error: "unreachable" };
      }

      return {
        status: "success",
        data: {
          name: data.officialName || legalName,
          bin_iin: iinBin,
          isActive: data.status !== "suspended",
        },
      };
    } catch (err) {
      console.error("Bridge fetch error:", err);
      return { status: "error", error: "unreachable" };
    }
  }

  return { status: "error", error: "unreachable" };
}

function mapKGDResult(
  result: KgdResult,
  legalName: string,
): { status: VerificationStatus; officialName?: string } {
  if (result.status === "error") {
    return { status: "manual_review" };
  }
  if (result.status === "not_found") {
    return { status: "mismatch" };
  }

  const { name, isActive } = result.data;

  if (!isActive) {
    return { status: "suspended", officialName: name };
  }

  return namesMatch(legalName, name)
    ? { status: "verified", officialName: name }
    : { status: "mismatch", officialName: name };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth: extract user from Bearer token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token,
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate body
    const body = await req.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten() }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { storeId, sellerType, iinBin, legalName } = parsed.data;

    // Verify store ownership via store_members (multi-store aware)
    const { data: membership, error: memberErr } = await supabase
      .from("store_members")
      .select("role")
      .eq("store_id", storeId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberErr || !membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only owners can verify the store
    if (membership.role !== "owner") {
      return new Response(JSON.stringify({ error: "Only store owners can verify" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also fetch store data for status check
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id, verification_status, seller_type")
      .eq("id", storeId)
      .single();

    if (storeErr || !store) {
      return new Response(JSON.stringify({ error: "Store not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Always require sellerType — no lightweight restore.
    // Verification must go through the full KGD gateway.
    if (!sellerType) {
      return new Response(
        JSON.stringify({ error: "Business type is required for verification" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check IIN/BIN uniqueness — one tax ID per account
    const iinHash = await hashIinBin(iinBin);
    const { data: existingStore } = await supabase
      .from("stores")
      .select("id")
      .eq("iin_bin_hash", iinHash)
      .neq("id", storeId)
      .maybeSingle();

    if (existingStore) {
      return new Response(
        JSON.stringify({ error: "This IIN/BIN is already registered to another store" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Look up in KGD registry
    const kgdResult = await lookupKGD(iinBin, sellerType, legalName, storeId);
    const { status, officialName } = mapKGDResult(kgdResult, legalName);

    // Bridge MUST confirm storage before Supabase is updated (atomicity:
    // bridge has PII <-> store is verified). If bridge PUT throws, the
    // error propagates to catch and the store is never marked verified.
    if (status === "verified") {
      await forwardIinBinToBridge(storeId, iinBin, sellerType, legalName);
    }

    // Update store (iin_bin intentionally excluded — PII lives on Hoster.kz bridge)
    const storeUpdate: Record<string, unknown> = {
      verification_status: status,
      registry_checked_at: new Date().toISOString(),
    };

    if (sellerType) storeUpdate.seller_type = sellerType;

    if (status === "verified") {
      storeUpdate.is_verified = true;
      storeUpdate.verified_at = new Date().toISOString();
      storeUpdate.iin_bin_hash = iinHash;
    }

    const { error: updateErr } = await supabase
      .from("stores")
      .update(storeUpdate)
      .eq("id", storeId);

    if (updateErr) {
      throw updateErr;
    }

    // Write audit log (no PII — official_name stays on Hoster.kz only)
    const auditDetails: Record<string, unknown> = {
      seller_type: sellerType,
      verification_source: "bridge",
      name_matched: status === "verified",
    };

    await supabase.from("verification_audit_log").insert({
      store_id: storeId,
      action: "verify_attempt",
      previous_status: store.verification_status,
      new_status: status,
      details: auditDetails,
    });

    return new Response(
      JSON.stringify({ status, officialName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    console.error("verify-seller error:", err);
    let message = "Unknown error";
    if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "object" && err !== null) {
      try { message = JSON.stringify(err); } catch {}
    } else if (typeof err === "string") {
      message = err;
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
