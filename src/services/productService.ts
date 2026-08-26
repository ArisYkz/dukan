import { supabase } from "@/integrations/supabase/client";
import type { ProductImageRow } from "@/types/store";
import { deleteStorageFile, deleteStorageFiles } from "@/lib/storageCleanup";

/**
 * Fetch all products for a store.
 * Note: Only active products are returned (physical delete means no need to filter is_active).
 */
export const fetchStoreProducts = async (storeId: string, searchTerm?: string) => {
  let query = supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId);

  if (searchTerm && searchTerm.trim()) {
    const term = `%${searchTerm.trim()}%`;
    query = query.or(`name.ilike.${term},description.ilike.${term}`);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Fetch active products for a storefront with pagination.
 */
export const fetchActiveProducts = async (
  storeId: string,
  from: number,
  to: number,
  searchTerm?: string,
  sortBy: 'created_at' | 'price' | 'name' = 'created_at',
  sortOrder: 'asc' | 'desc' = 'desc'
) => {
  let query = supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId);

  if (searchTerm && searchTerm.trim()) {
    const term = `%${searchTerm.trim()}%`;
    query = query.or(`name.ilike.${term},description.ilike.${term}`);
  }

  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  query = query.range(from, to);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Count active products for a store, optionally filtered by search term.
 */
export const countActiveProducts = async (storeId: string, searchTerm?: string) => {
  let query = supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("store_id", storeId);

  if (searchTerm && searchTerm.trim()) {
    const term = `%${searchTerm.trim()}%`;
    query = query.or(`name.ilike.${term},description.ilike.${term}`);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
};

/**
 * Delete a product permanently from database AND storage.
 * 
 * Process:
 * 1. Fetch product details (image_url) and all product_images
 * 2. Delete all image files from Supabase Storage
 * 3. Delete product_images records from database
 * 4. Delete product record from database
 * 
 * Safety:
 * - Storage deletion failures are logged but don't block database deletion
 * - Foreign key constraints (orders) are properly handled
 * - All cleanup operations run even if some fail
 * 
 * @param productId - The product ID to delete
 * @returns Object with success status and error details
 */
export const deleteProduct = async (productId: string) => {
  const errors: string[] = [];
  const deletedFiles: string[] = [];
  
  try {
    // Step 1: Fetch product details to get image URLs
    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("id, image_url, store_id")
      .eq("id", productId)
      .single();
    
    if (fetchError || !product) {
      return {
        success: false,
        error: fetchError,
        message: "Product not found",
        deletedFiles: [],
      };
    }
    
    // Step 2: Fetch all product images (gallery)
    const { data: productImages } = await supabase
      .from("product_images")
      .select("image_url")
      .eq("product_id", productId);
    
    // Collect all image URLs to delete
    const imageUrlsToDelete: string[] = [];
    
    // Add main product image
    if (product.image_url) {
      imageUrlsToDelete.push(product.image_url);
    }
    
    // Add gallery images
    if (productImages && productImages.length > 0) {
      productImages.forEach(img => {
        if (img.image_url) {
          imageUrlsToDelete.push(img.image_url);
        }
      });
    }
    
    // Step 3: Delete all image files from Storage (best effort)
    if (imageUrlsToDelete.length > 0) {
      const { deleteStorageFiles } = await import("@/lib/storageCleanup");
      
      // Delete files in parallel for speed
      const deletePromises = imageUrlsToDelete.map(async (url) => {
        try {
          await deleteStorageFile(url);
          deletedFiles.push(url);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          errors.push(`Failed to delete ${url}: ${errorMsg}`);
          console.warn(`[deleteProduct] Storage deletion failed:`, errorMsg);
        }
      });
      
      // Wait for all deletions to complete (don't block on errors)
      await Promise.allSettled(deletePromises);
    }
    
    // Step 4: Delete product_images records from database
    const { error: deleteImagesError } = await supabase
      .from("product_images")
      .delete()
      .eq("product_id", productId);
    
    if (deleteImagesError) {
      errors.push(`Failed to delete product_images: ${deleteImagesError.message}`);
      console.warn("[deleteProduct] Database cleanup failed:", deleteImagesError);
    }
    
    // Step 5: Delete product record from database
    const { error: deleteProductError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);
    
    // Handle foreign key constraint violations
    if (deleteProductError) {
      if (deleteProductError.code === "23503") {
        return {
          success: false,
          error: deleteProductError,
          isConstraintError: true,
          message: "Cannot delete: product has existing order records",
          deletedFiles,
          partialCleanup: true,
        };
      }
      
      errors.push(`Failed to delete product: ${deleteProductError.message}`);
      return {
        success: false,
        error: deleteProductError,
        isConstraintError: false,
        message: "Failed to delete product from database",
        deletedFiles,
        errors,
      };
    }
    
    // Success
    if (errors.length > 0) {
      console.warn("[deleteProduct] Completed with warnings:", errors);
    }
    
    return {
      success: true,
      message: `Product deleted successfully (${deletedFiles.length} files removed)`,
      deletedFiles,
      deletedFilesCount: deletedFiles.length,
      warnings: errors.length > 0 ? errors : undefined,
    };
    
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[deleteProduct] Unexpected error:", err);
    
    return {
      success: false,
      error: err,
      message: `Unexpected error: ${message}`,
      deletedFiles,
      errors: [message],
    };
  }
};

/**
 * Create a new product. Returns the inserted product id.
 */
export const createProduct = async (data: {
  store_id: string;
  name: string;
  price: number;
  description: string | null;
  stock: number;
  image_url: string | null;
  category: string | null;
  sort_order?: number;
  tags?: string[] | null;
  barcode_gtin?: string | null;
  ntin?: string | null;
  country_of_origin?: string | null;
  low_stock_threshold?: number;
}) => {
  const trimmed = data.category?.trim() || null;
  if (trimmed) {
    const { upsertCategories } = await import("./categoryService");
    const { error: categoryError } = await upsertCategories(data.store_id, [trimmed]);
    if (categoryError) return { id: null, error: categoryError };
  }

  const { data: inserted, error } = await supabase
    .from("products")
    .insert({ ...data, category: trimmed })
    .select("id");
  if (error || !inserted || inserted.length === 0) return { id: null, error };
  return { id: inserted[0].id, error: null };
};

export const createProductsBulk = async (rows: Array<{
  store_id: string;
  name: string;
  price: number;
  description: string | null;
  stock: number;
  image_url: string | null;
  category: string | null;
}>) => {
  const { data: inserted, error } = await supabase
    .from("products")
    .insert(rows)
    .select("id");
  return { inserted: inserted || [], error };
};

export const createProductsBulkWithImages = async (rows: Array<{
  store_id: string;
  name: string;
  price: number;
  description: string | null;
  stock: number;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
  images: string[];
}>) => {
  if (rows.length === 0) return { inserted: [], error: null };

  const { upsertCategories } = await import("./categoryService");
  const categories = Array.from(
    new Set(rows.map((row) => row.category?.trim()).filter((value): value is string => Boolean(value))),
  );
  if (categories.length > 0) {
    const { error: categoryError } = await upsertCategories(rows[0].store_id, categories);
    if (categoryError) return { inserted: [], error: categoryError };
  }

  const { data: inserted, error } = await supabase
    .from("products")
    .insert(rows.map(({ images, ...rest }) => ({ ...rest, category: rest.category?.trim() || null })))
    .select("id");

  if (error || !inserted) return { inserted: [], error };

  const imageInserts = inserted.flatMap((product, index) => {
    const images = rows[index].images.filter(Boolean);
    return images.map((imageUrl, position) => ({
      product_id: product.id,
      image_url: imageUrl,
      position,
      is_main: position === 0,
    }));
  });

  if (imageInserts.length > 0) {
    const { error: imageError } = await supabase.from("product_images").insert(imageInserts);
    if (imageError) return { inserted: inserted || [], error: imageError };
  }

  return { inserted: inserted || [], error: null };
};

/**
 * Update a product.
 */
export const updateProduct = async (
  productId: string,
  data: {
    store_id: string;
    name: string;
    price: number;
    description: string | null;
    stock: number;
    image_url: string | null;
    category: string | null;
    sort_order?: number;
    tags?: string[] | null;
    barcode_gtin?: string | null;
    ntin?: string | null;
    country_of_origin?: string | null;
    low_stock_threshold?: number;
  },
) => {
  // If image_url is being updated, fetch old image_url for cleanup
  if (data.image_url !== undefined) {
    const { data: existingProduct } = await supabase
      .from("products")
      .select("image_url")
      .eq("id", productId)
      .single();
    
    if (existingProduct?.image_url && existingProduct.image_url !== data.image_url) {
      try {
        await deleteStorageFile(existingProduct.image_url);
      } catch {
        // Silently ignore cleanup errors - old image will be orphaned
      }
    }
  }

  const trimmedCategory = data.category?.trim() || null;
  if (trimmedCategory) {
    const { upsertCategories } = await import("./categoryService");
    const { error: categoryError } = await upsertCategories(data.store_id, [trimmedCategory]);
    if (categoryError) return { error: categoryError };
  }

  const { error } = await supabase.from("products").update({ ...data, category: trimmedCategory }).eq("id", productId);
  return { error };
};

/**
 * Fetch product images for a set of product IDs.
 */
export const fetchProductImages = async (productIds: string[]): Promise<Record<string, ProductImageRow[]>> => {
  if (productIds.length === 0) return {};
  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .in("product_id", productIds)
    .order("position", { ascending: true });
  if (error) throw error;
  const map: Record<string, ProductImageRow[]> = {};
  (data || []).forEach((img) => {
    if (!map[img.product_id]) map[img.product_id] = [];
    map[img.product_id].push(img as ProductImageRow);
  });
  return map;
};

/**
 * Replace all images for a product.
 */
export const replaceProductImages = async (productId: string, imageUrls: string[]) => {
  const { data: existingImages } = await supabase
    .from("product_images")
    .select("image_url")
    .eq("product_id", productId);
  const oldUrls = existingImages?.map(img => img.image_url) || [];
  try {
    await deleteStorageFiles(oldUrls);
  } catch {
    // Silently ignore - old images will be orphaned
  }
  await supabase.from("product_images").delete().eq("product_id", productId);
  if (imageUrls.length > 0) {
    const inserts = imageUrls.map((url, i) => ({
      product_id: productId,
      image_url: url,
      position: i,
      is_main: i === 0,
    }));
    await supabase.from("product_images").insert(inserts);
  }
};

/**
 * Insert product images (for new products).
 */
export const insertProductImages = async (productId: string, imageUrls: string[]) => {
  if (imageUrls.length === 0) return;
  const inserts = imageUrls.map((url, i) => ({
    product_id: productId,
    image_url: url,
    position: i,
    is_main: i === 0,
  }));
  await supabase.from("product_images").insert(inserts);
};

// Re-export variant functions from variantService
export { fetchProductVariants, replaceProductVariants } from "./variantService";
export type { VariantRow } from "./variantService";

/**
 * Fetch product images and variants (for storefront display).
 * Optimized: Fetches images and variants in parallel with batch queries.
 */
export const fetchProductMeta = async (productIds: string[]) => {
  if (productIds.length === 0) return { images: {}, variants: {} };

  // PARALLEL: Fetch images and variants simultaneously
  const [imagesResult, variantsResult] = await Promise.all([
    supabase
      .from("product_images")
      .select("product_id, image_url, position, is_main")
      .in("product_id", productIds)
      .order("position", { ascending: true }),
    
    // Batch fetch ALL variants in ONE query instead of N+1
    supabase
      .from("product_variants")
      .select("product_id, variant_type, variant_value, price_adjustment")
      .in("product_id", productIds)
      .order("position", { ascending: true }),
  ]);

  if (imagesResult.error) throw imagesResult.error;
  if (variantsResult.error) throw variantsResult.error;

  // Group images by product_id
  const images = imagesResult.data?.reduce((acc, img) => {
    if (!acc[img.product_id]) acc[img.product_id] = [];
    acc[img.product_id].push(img.image_url);
    return acc;
  }, {} as Record<string, string[]>) || {};

  // Group variants by product_id
  const variants = variantsResult.data?.reduce((acc, variant) => {
    if (!acc[variant.product_id]) acc[variant.product_id] = [];
    acc[variant.product_id].push({
      variant_type: variant.variant_type,
      variant_value: variant.variant_value,
      price_adjustment: variant.price_adjustment || 0,
    });
    return acc;
  }, {} as Record<string, Array<{ variant_type: string; variant_value: string; price_adjustment: number }>>) || {};

  return { images, variants };
};

/**
 * Bulk update category for multiple products.
 */
export const bulkUpdateCategory = async (productIds: string[], categoryId: string | null) => {
  const { error } = await supabase
    .from("products")
    .update({ category: categoryId })
    .in("id", productIds);
  return { error };
};

/**
 * Bulk toggle active status for multiple products.
 */
export const bulkToggleStatus = async (productIds: string[], isActive: boolean) => {
  const { error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .in("id", productIds);
  return { error };
};

/**
 * Bulk update price for multiple products.
 */
export const bulkUpdatePrice = async (productIds: string[], newPrice: number) => {
  const { error } = await supabase
    .from("products")
    .update({ price: newPrice })
    .in("id", productIds);
  return { error };
};

/**
 * Bulk update stock for multiple products.
 */
export const bulkUpdateStock = async (productIds: string[], newStock: number) => {
  const { error } = await supabase
    .from("products")
    .update({ stock: newStock })
    .in("id", productIds);
  return { error };
};

/**
 * Bulk delete products permanently from database.
 * Note: Will fail if any product is referenced in orders (foreign key constraint).
 */
export const bulkDeleteProducts = async (productIds: string[]) => {
  const { error } = await supabase
    .from("products")
    .delete()
    .in("id", productIds);
  
  // Check for foreign key constraint violations
  if (error) {
    // Postgres error code 23503 = foreign key violation
    if (error.code === "23503") {
      return { 
        error, 
        isConstraintError: true,
        message: "Cannot delete: one or more products have existing order records" 
      };
    }
    return { error, isConstraintError: false };
  }
  
  return { error: null, isConstraintError: false };
};
