import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

/**
 * Fetch all categories for a store.
 */
export const fetchCategories = async (storeId: string) => {
  const { data, error } = await supabase
    .from("categories")
    .select("name")
    .eq("store_id", storeId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data || []).map((item: { name: string }) => item.name) as string[];
};

/**
 * Upsert categories (insert or update if exists).
 */
export const upsertCategories = async (storeId: string, categories: string[]) => {
  const rows = Array.from(new Set(categories.map((name) => name.trim()).filter(Boolean))).map((name) => ({
    store_id: storeId,
    name,
  }));
  if (rows.length === 0) return { error: null };
  const { error } = await supabase
    .from("categories")
    .upsert(rows, { onConflict: "store_id,name" });
  return { error };
};

/**
 * Save categories and return updated list.
 */
export const saveCategories = async (storeId: string, categories: string[]) => {
  const { error } = await upsertCategories(storeId, categories);
  if (error) return { categories: [], error };
  const fetched = await fetchCategories(storeId);
  return { categories: fetched, error: null };
};

/**
 * Delete a single category for a store.
 */
export const deleteCategory = async (storeId: string, categoryName: string) => {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("store_id", storeId)
    .eq("name", categoryName);
  return { error };
};
