const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-pii`;

interface StorePiiPayload {
  storeId: string;
  kaspi_phone?: string;
  whatsapp_phone?: string;
  kaspi_name?: string;
}

/**
 * Read store PII (IIN/BIN) from the Hoster.kz bridge via the store-pii
 * Edge Function GET proxy.
 *
 * Returns the IIN/BIN string.
 * Returns null if bridge returns 404 (no PII stored for this store).
 * Throws if bridge is unreachable or returns an error — caller should NOT
 * auto-downgrade the store on transient failures.
 */
export async function getStoreIinBin(storeId: string): Promise<string | null> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) throw new Error("Not authenticated");

  const res = await fetch(`${EDGE_URL}?storeId=${storeId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Bridge request failed: ${res.status}`);
  }

  const data = await res.json();
  return data.iin_bin ?? null;
}

/**
 * Forward store-level PII (kaspi_phone, whatsapp_phone, kaspi_name) to the
 * Hoster.kz bridge via the store-pii Edge Function proxy.
 *
 * The Edge Function validates the user's auth JWT, verifies store ownership,
 * then forwards to the bridge — the bridge key is never exposed client-side.
 *
 * This is fire-and-forget from the caller's perspective: failures are logged
 * but never block the UI.
 */
export async function syncStorePii(payload: StorePiiPayload): Promise<void> {
  const { data: { session } } = await import("@/integrations/supabase/client")
    .then((m) => m.supabase.auth.getSession());

  if (!session?.access_token) {
    console.warn("syncStorePii: no session — skipping");
    return;
  }

  try {
    const res = await fetch(EDGE_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn("syncStorePii failed:", res.status, body);
    }
  } catch (err) {
    console.warn("syncStorePii network error:", err);
  }
}
