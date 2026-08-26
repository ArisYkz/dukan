-- Restrict direct public table access to stores so sensitive columns
-- (payment_phone, total_earned, subscription_* etc.) are not exposed.
--
-- Approach:
--   1. Create a SECURITY DEFINER function that returns only public-safe columns
--   2. Route public storefront queries through it instead of direct table access
--   3. Keep the existing "Anyone can view stores" for authenticated users
--      who need it (store members fetching their own store data)
--
-- Public-safe columns for the storefront:
--   id, name, slug, description, user_id,
--   instagram, tiktok_handle, telegram_chat_id,
--   hero_image_url, hero_title, hero_subtitle,
--   payment_qr_image, is_verified, verification_status,
--   is_paused,
--   show_instagram, show_tiktok, show_telegram, show_banner,
--   default_language, theme_preset,
--   tax_enabled, tax_percent,
--   created_at, updated_at

CREATE OR REPLACE FUNCTION public.get_public_store(p_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  user_id UUID,
  instagram TEXT,
  tiktok_handle TEXT,
  telegram_chat_id TEXT,
  hero_image_url TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  payment_qr_image TEXT,
  is_verified BOOLEAN,
  verification_status TEXT,
  is_paused BOOLEAN,
  show_instagram BOOLEAN,
  show_tiktok BOOLEAN,
  show_telegram BOOLEAN,
  show_banner BOOLEAN,
  default_language TEXT,
  theme_preset TEXT,
  tax_enabled BOOLEAN,
  tax_percent NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id, s.name, s.slug, s.description, s.user_id,
    s.instagram, s.tiktok_handle, s.telegram_chat_id,
    s.hero_image_url, s.hero_title, s.hero_subtitle,
    s.payment_qr_image, s.is_verified, s.verification_status,
    s.is_paused,
    s.show_instagram, s.show_tiktok, s.show_telegram, s.show_banner,
    s.default_language, s.theme_preset,
    s.tax_enabled, s.tax_percent,
    s.created_at, s.updated_at
  FROM public.stores s
  WHERE s.slug = p_slug
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_store(TEXT) TO PUBLIC;
