import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch a single store by slug (public storefront use).
 */
export const fetchStoreBySlug = async (slug: string) => {
  const { data, error } = await supabase
    .from("stores")
    .select(`
      id, name, slug, description, user_id,
      instagram, tiktok_handle, telegram_chat_id,
      hero_image_url, hero_title, hero_subtitle,
      payment_qr_image, is_verified,
      is_paused, total_earned, report_count,
      show_instagram, show_tiktok, show_telegram, show_banner,
      default_language, theme_preset,
      tax_enabled, tax_percent,
      created_at, updated_at
    `)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
};

/**
 * Fetch all stores the current user is a member of (via store_members).
 */
export const fetchUserStores = async (userId: string) => {
  const { data: memberships, error } = await supabase
    .from("store_members")
    .select("store_id, stores(*)")
    .eq("user_id", userId);
  if (error) throw error;
  return (memberships ?? [])
    .map((m: any) => m.stores as Record<string, unknown>)
    .filter(Boolean);
};

/**
 * Create a new store.
 */
export const createStore = async (userId: string, name: string, slug: string) => {
  const { error } = await supabase.from("stores").insert({
    user_id: userId,
    name,
    slug,
  });
  return { error };
};

/**
 * Update store branding fields.
 */
export const updateStoreBranding = async (storeId: string, data: Record<string, unknown>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("stores").update(data as any).eq("id", storeId);
  return { error };
};

/**
 * Check if a slug is already taken by another store.
 */
export const checkSlugAvailability = async (slug: string, excludeStoreId: string) => {
  const { data } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", slug)
    .not("id", "eq", excludeStoreId)
    .maybeSingle();
  return !!data;
};

/**
 * Increment store view count (fire-and-forget).
 */
export const incrementStoreViews = async (storeId: string) => {
  try {
    await supabase.rpc("increment_store_views", { _store_id: storeId });
  } catch {
    // Silently ignore network errors - view count is non-critical
  }
};

/**
 * Check if a store is paused.
 */
export const checkStorePaused = async (storeId: string): Promise<boolean> => {
  const { data } = await supabase
    .from("stores")
    .select("is_paused")
    .eq("id", storeId)
    .single();
  return data?.is_paused === true;
};

/**
 * Fetch user profile display name.
 */
export const fetchUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

/**
 * Update user profile display name.
 */
export const updateUserProfile = async (userId: string, displayName: string) => {
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("user_id", userId);
  return { error };
};
