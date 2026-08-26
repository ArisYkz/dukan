import { supabase } from "@/integrations/supabase/client";

const SUPABASE_STORAGE_HOST = "supabase.co/storage/v1/object/public/";

/**
 * Extracts bucket and path from a Supabase storage public URL.
 * Returns null if the URL is not a Supabase storage URL.
 */
export function extractBucketAndPath(url: string): { bucket: string; path: string } | null {
  if (!url.includes(SUPABASE_STORAGE_HOST)) return null;
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    // Path format: /storage/v1/object/public/<bucket>/<path...>
    const parts = pathname.split("/").filter(p => p);
    if (parts.length < 6) return null;
    const bucket = parts[4]; // after "public"
    const path = parts.slice(5).join("/");
    return { bucket, path };
  } catch {
    return null;
  }
}

/**
 * Deletes a file from Supabase storage if the URL is a valid storage URL.
 * 
 * Features:
 * - Safely parses Supabase storage URLs
 * - Skips placeholder images
 * - Silent error handling (doesn't throw)
 * - Logs warnings for debugging
 * 
 * @param url - The full public URL of the file to delete
 * @returns Promise that resolves when deletion is attempted
 */
export async function deleteStorageFile(url: string | null | undefined): Promise<void> {
  if (!url) return;
  
  const extracted = extractBucketAndPath(url);
  if (!extracted) {
    console.warn(`[deleteStorageFile] Invalid Supabase storage URL: ${url}`);
    return;
  }
  
  // Skip placeholder images
  if (url.includes("/placeholder.svg") || url.includes("/placeholder-")) {
    return;
  }
  
  try {
    const { error } = await supabase.storage
      .from(extracted.bucket)
      .remove([extracted.path]);
    
    if (error) {
      // Log warning but don't throw (best-effort deletion)
      console.warn(
        `[deleteStorageFile] Failed to delete ${extracted.bucket}/${extracted.path}:`,
        error.message
      );
    } else {
      // Success - optional debug logging
      if (import.meta.env.DEV) {
        console.log(
          `[deleteStorageFile] ✅ Deleted ${extracted.bucket}/${extracted.path}`
        );
      }
    }
  } catch (err) {
    // Catch network errors, CORS issues, etc.
    console.warn(
      `[deleteStorageFile] Unexpected error deleting ${url}:`,
      err
    );
  }
}

/**
 * Deletes multiple files, ignoring errors.
 */
export async function deleteStorageFiles(urls: (string | null | undefined)[]): Promise<void> {
  for (const url of urls) {
    await deleteStorageFile(url);
  }
}