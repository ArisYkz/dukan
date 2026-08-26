import { supabase } from "@/integrations/supabase/client";

export interface VariantRow {
  variant_type: string;
  variant_value: string;
  price_adjustment: number;
}

/**
 * Fetch variants for a single product.
 */
export const fetchProductVariants = async (productId: string): Promise<VariantRow[]> => {
  const { data, error } = await supabase
    .from("product_variants")
    .select("variant_type, variant_value, price_adjustment")
    .eq("product_id", productId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data || []).map((v) => ({
    variant_type: v.variant_type,
    variant_value: v.variant_value,
    price_adjustment: v.price_adjustment || 0,
  }));
};

/**
 * Replace all variants for a product.
 */
export const replaceProductVariants = async (
  productId: string,
  variants: { variant_type: string; variant_value: string; price_adjustment: number }[],
) => {
  await supabase.from("product_variants").delete().eq("product_id", productId);
  if (variants.length > 0) {
    const inserts = variants.map((v, i) => ({
      product_id: productId,
      variant_type: v.variant_type,
      variant_value: v.variant_value,
      price_adjustment: v.price_adjustment || 0,
      position: i,
    }));
    await supabase.from("product_variants").insert(inserts);
  }
};
