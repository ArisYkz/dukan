/**
 * Append Supabase Storage image transformation query params.
 * Only works for URLs hosted on our Supabase storage.
 * Falls back to the original URL for external images.
 */
// Match any Supabase storage URL (with or without https://)
const SUPABASE_STORAGE_HOST = "supabase.co/storage/v1/object/public/";

/**
 * Check if URL is a Supabase storage URL (handles both with and without protocol)
 */
function isSupabaseStorageUrl(url: string): boolean {
  // Remove protocol for matching (handles both http:// and https://)
  const urlWithoutProtocol = url.replace(/^https?:\/\//, '');
  return urlWithoutProtocol.includes(SUPABASE_STORAGE_HOST) || url.includes(SUPABASE_STORAGE_HOST);
}

export function getResizedImageUrl(
  url: string | undefined | null,
  width: number = 600,
): string {
  if (!url) return "";
  if (!isSupabaseStorageUrl(url)) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}width=${width}&resize=contain`;
}

export function getOptimizedProductImageUrl(
  url: string | undefined | null,
  width: number = 1200,
  quality: number = 85,
  format: string = "webp"
): string {
  if (!url) return "";
  if (!isSupabaseStorageUrl(url)) {
    // Log for debugging in development
    if (import.meta.env.DEV && url) {
      console.warn(`[imageTransform] URL is not a Supabase storage URL, skipping optimization: ${url.substring(0, 100)}`);
    }
    return url;
  }

  // Ensure quality is never too low (minimum 20)
  const safeQuality = Math.max(quality, 20);
  // Ensure width is reasonable (min 100, max 2000)
  const safeWidth = Math.min(Math.max(width, 100), 2000);

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}width=${safeWidth}&quality=${safeQuality}&format=${format}&resize=contain`;
}

/**
 * Generate srcset string for responsive images.
 * Returns: "url?width=300 300w, url?width=600 600w, url?width=900 900w"
 */
export function getImageSrcset(
  url: string | undefined | null,
  widths: number[] = [300, 600, 900],
  quality: number = 75,
  format: string = "webp"
): string {
  if (!url) return "";
  if (!isSupabaseStorageUrl(url)) return url;

  // Ensure quality is never too low (minimum 20)
  const safeQuality = Math.max(quality, 20);

  return widths
    .map(w => {
      const safeWidth = Math.min(Math.max(w, 100), 2000);
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}width=${safeWidth}&quality=${safeQuality}&format=${format}&resize=contain ${safeWidth}w`;
    })
    .join(", ");
}

/**
 * Get responsive image props for <img> tag.
 * Returns { src, srcSet, sizes } object.
 */
export function getResponsiveImageProps(
  url: string | undefined | null,
  options?: {
    widths?: number[];
    quality?: number;
    format?: string;
    sizes?: string;
  }
) {
  const widths = options?.widths || [300, 600, 900];
  const baseWidth = widths[widths.length - 1];
  
  return {
    src: getOptimizedProductImageUrl(url, baseWidth, options?.quality, options?.format),
    srcSet: getImageSrcset(url, widths, options?.quality, options?.format),
    sizes: options?.sizes || "(max-width: 768px) 50vw, 25vw",
  };
}
