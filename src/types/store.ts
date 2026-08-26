export interface StoreRow {
  id: string;
  name: string;
  slug: string;
  instagram: string | null;
  tiktok_handle: string | null;
  telegram_chat_id: string | null;
  payment_qr_image: string | null;
  is_verified: boolean;
  hero_image_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  kaspi_phone: string | null;
  kaspi_name: string | null;
  whatsapp_phone: string | null;
  plan_type: string;
  subscription_active: boolean;
  social_platform: string;
  show_instagram: boolean;
  show_tiktok: boolean;
  show_telegram: boolean;
  show_banner: boolean;
  subscription_status: string;
  subscription_screenshot_url: string | null;
  default_language: string;
  tax_enabled: boolean;
  tax_percent: number;
  total_earned: number;
  is_paused: boolean;
  total_views: number;
  total_sales_count: number;
  report_count: number;
  theme_preset: string;
  average_rating: number;
  review_count: number;
  subscription_expiry: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  slug_customized: boolean;
}

export interface ProductRow {
  id: string;
  store_id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  stock: number;
  is_active: boolean;
  category: string | null;
  sort_order: number;
  tags: string[] | null;
  barcode_gtin: string | null;
  ntin: string | null;
  country_of_origin: string | null;
  low_stock_threshold: number;
  created_at: string;
}

export interface ProductImageRow {
  id: string;
  product_id: string;
  image_url: string;
  position: number;
  is_main: boolean;
}

export interface OrderRow {
  id: string;
  store_id: string;
  public_order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  total_price: number;
  subtotal: number;
  tax_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  reference_code: string | null;
  promo_code: string | null;
  discount_amount: number;
  order_items: { product_name: string; quantity: number; product_price: number }[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  stock: number;
  sort_order?: number;
  tags?: string[];
}

/** Shared cart item type */
export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariants?: Record<string, string>;
}

export interface BrandFormState {
  name: string;
  slug: string;
  instagram: string;
  tiktok_handle: string;
  telegram_chat_id: string;
  hero_image_url: string | null;
  hero_title: string;
  hero_subtitle: string;
  payment_qr_image: string | null;
  kaspi_phone: string;
  kaspi_name: string;
  whatsapp_phone: string;
  social_platform: string;
  show_instagram: boolean;
  show_tiktok: boolean;
  show_telegram: boolean;
  show_banner: boolean;
  default_language: string;
  tax_enabled: boolean;
  tax_percent: string;
  theme_preset: string;
}

export interface ProductFormState {
  name: string;
  price: string;
  description: string;
  stock: string;
  image_url: string;
  category: string;
  categoryInput: string;
  barcode_gtin: string;
  ntin: string;
  country_of_origin: string;
  low_stock_threshold: string;
}

export interface ReturnRequestRow {
  id: string;
  order_id: string;
  store_id: string;
  reason: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  resolved_at: string | null;
}
