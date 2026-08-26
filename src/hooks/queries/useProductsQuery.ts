import { useQuery } from "@tanstack/react-query";
import { fetchStoreProducts, fetchProductImages } from "@/services/productService";
import type { ProductRow, ProductImageRow } from "@/types/store";

export const useProductsQuery = (storeId: string | undefined) =>
  useQuery({
    queryKey: ["dashboard-products", storeId],
    queryFn: async () => {
      const products = (await fetchStoreProducts(storeId!)) as ProductRow[];
      let images: Record<string, ProductImageRow[]> = {};
      if (products.length > 0) {
        images = await fetchProductImages(products.map((p) => p.id));
      }
      return { products, images };
    },
    enabled: !!storeId,
    staleTime: 30_000,
  });
