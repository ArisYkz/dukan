import imageCompression from "browser-image-compression";

// Production-optimized settings for LCP < 1.5s
const MAX_DIMENSION = 1080; // Max width/height for product images
const MAX_FILE_SIZE_MB = 0.5; // Target: 500KB max per image
const QUALITY = 0.8; // Balance between quality and file size

// Banner and Logo specific settings
const BANNER_MAX_WIDTH = 1200;
const LOGO_MAX_WIDTH = 400;
const BANNER_QUALITY = 0.8;
const LOGO_QUALITY = 0.8;

/**
 * Preprocess banner or logo images before upload.
 * 
 * @param file - The input File object (banner or logo)
 * @param imageType - Type of image: 'banner' or 'logo'
 * @returns A new File object in WebP format, compressed and resized
 * 
 * Features:
 * - Banner: max width 1200px, WebP format, 80% quality
 * - Logo: max width 400px, WebP format, 80% quality
 * - Converts any image format to WebP
 * - Maintains aspect ratio
 */
export async function preprocessStoreImage(
  file: File,
  imageType: 'banner' | 'logo'
): Promise<File> {
  const maxWidth = imageType === 'banner' ? BANNER_MAX_WIDTH : LOGO_MAX_WIDTH;
  const quality = imageType === 'banner' ? BANNER_QUALITY : LOGO_QUALITY;

  const compressed = await imageCompression(file, {
    maxSizeMB: 1, // Generous limit for banners/logos
    maxWidthOrHeight: maxWidth,
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: quality,
    alwaysKeepResolution: false,
  });

  // Generate clean filename
  const originalName = file.name.replace(/\.[^/.]+$/, '');
  const slug = originalName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50);
  const timestamp = Date.now();
  const fileName = `${imageType}-${slug}-${timestamp}.webp`;

  // Create new File object with WebP type
  return new File([compressed], fileName, {
    type: 'image/webp',
    lastModified: Date.now(),
  });
}

/**
 * Optimize an image file: resize to max 1080px, convert to WebP at 75% quality, max 200KB.
 * Returns a { blob, fileName } ready for upload.
 * 
 * Features:
 * - Converts JPG/PNG/HEIC to WebP format
 * - Resizes to max 1080x1080px (sufficient for Retina displays)
 * - Compresses to < 200KB target
 * - Uses Web Worker for non-blocking compression
 */
export async function optimizeImage(
  file: File | Blob,
  slugName?: string,
): Promise<{ blob: Blob; fileName: string; originalSize: number; optimizedSize: number }> {
  const originalSize = file.size;

  // Step 1: Resize & compress using browser-image-compression
  const compressed = await imageCompression(
    file instanceof File ? file : new File([file], "image.jpg", { type: file.type || "image/png" }),
    {
      maxSizeMB: MAX_FILE_SIZE_MB, // Target: 200KB
      maxWidthOrHeight: MAX_DIMENSION, // Max: 1080px
      useWebWorker: true, // Non-blocking compression
      fileType: "image/webp", // Force WebP format
      initialQuality: QUALITY, // 75% quality
      alwaysKeepResolution: false, // Allow downscaling
    }
  );

  // Step 2: Generate clean filename with .webp extension
  const slug = slugName
    ? slugName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    : "img";
  const timestamp = Date.now();
  const fileName = `${slug}-${timestamp}.webp`;

  return {
    blob: compressed,
    fileName,
    originalSize,
    optimizedSize: compressed.size,
  };
}

/** Format bytes to human-readable string */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
