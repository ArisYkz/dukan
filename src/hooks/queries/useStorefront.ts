import { useQuery } from "@tanstack/react-query";
import { fetchStoreBySlug } from "@/services/storeService";
import { fetchStoreProducts, fetchProductMeta } from "@/services/productService";
import { supabase } from "@/integrations/supabase/client";
import type { StoreRow } from "@/types/store";
import type { Database } from "@/integrations/supabase/types";
import type { VariantRow } from "@/services/variantService";

type ProductRowFromDB = Pick<Database["public"]["Tables"]["products"]["Row"], "id" | "name" | "price" | "description" | "image_url" | "stock" | "category" | "created_at">;

export const useStorefrontStore = (slug: string | undefined) =>
  useQuery({
    queryKey: ["storefront-store", slug],
    queryFn: async () => {
      const data = await fetchStoreBySlug(slug!);
      return data as unknown as StoreRow | null;
    },
    enabled: !!slug,
    staleTime: 60_000,
  });

export const useStorefrontProducts = (storeId: string | undefined) =>
  useQuery({
    queryKey: ["storefront-products", storeId],
    queryFn: async () => {
      const products = await fetchStoreProducts(storeId!);
      let images: Record<string, string[]> = {};
      let variants: Record<string, VariantRow[]> = {};
      if (products.length > 0) {
        const meta = await fetchProductMeta(products.map((p: ProductRowFromDB) => p.id));
        images = meta.images;
        variants = meta.variants;
      }
      return { products, images, variants };
    },
    enabled: !!storeId,
    staleTime: 30_000,
  });

export const useStorefrontCategories = (storeId: string | undefined) =>
  useQuery({
    queryKey: ["storefront-categories", storeId],
    queryFn: async () => {
      const { fetchCategories } = await import("@/services/categoryService");
      return fetchCategories(storeId!);
    },
    enabled: !!storeId,
    staleTime: 60_000,
  });

export const useProductReviews = (productId: string | undefined) =>
  useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("rating")
        .eq("product_id", productId!);
      if (!data || data.length === 0) return { avgRating: 0, reviewCount: 0 };
      const avg = data.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / data.length;
      return { avgRating: avg, reviewCount: data.length };
    },
    enabled: !!productId,
    staleTime: 60_000,
  });
