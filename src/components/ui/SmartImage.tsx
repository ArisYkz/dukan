import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageOff } from "lucide-react";

export interface SmartImageProps {
  /** Image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Aspect ratio: "1:1" (square) or "3:4" (portrait) */
  aspectRatio?: "1:1" | "3:4" | "4:3" | "16:9";
  /** Object fit: "contain" or "cover" */
  objectFit?: "contain" | "cover";
  /** Priority loading for above-fold images */
  priority?: boolean;
  /** CSS class name */
  className?: string;
  /** Show loading skeleton */
  showSkeleton?: boolean;
  /** Skeleton background color (Tailwind class) */
  skeletonClassName?: string;
  /** Fallback icon when image fails to load */
  fallbackIcon?: React.ReactNode;
  /** Duration of fade-in animation (ms) */
  transitionDuration?: number;
  /** Additional img attributes */
  imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;
}

/**
 * SmartImage - Aesop Industrial Minimalist Image Component
 * 
 * Features:
 * - Fixed aspect ratio containers (zero layout shift / CLS = 0)
 * - Smooth 700ms fade-in transition using framer-motion
 * - Lazy loading by default, eager for priority images
 * - Elegant skeleton placeholder during loading
 * - Graceful fallback icon on error
 * - Responsive and accessible
 * 
 * Usage:
 * ```tsx
 * // Basic usage (lazy, 1:1 ratio)
 * <SmartImage src="/image.jpg" alt="Product" />
 * 
 * // Priority loading for above-fold images
 * <SmartImage src="/hero.jpg" alt="Hero" priority aspectRatio="3:4" />
 * 
 * // Custom styling
 * <SmartImage 
 *   src="/image.jpg" 
 *   alt="Product" 
 *   aspectRatio="3:4"
 *   objectFit="cover"
 *   className="rounded-lg"
 * />
 * ```
 */
const SmartImage = ({
  src,
  alt,
  aspectRatio = "1:1",
  objectFit = "contain",
  priority = false,
  className = "",
  showSkeleton = true,
  skeletonClassName = "bg-secondary/30",
  fallbackIcon,
  transitionDuration = 700,
  imgProps = {},
}: SmartImageProps) => {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  // Reset status when src changes
  useEffect(() => {
    setStatus("loading");
  }, [src]);

  // Aspect ratio mapping
  const aspectRatioClass = {
    "1:1": "aspect-square",
    "3:4": "aspect-[3/4]",
    "4:3": "aspect-[4/3]",
    "16:9": "aspect-video",
  }[aspectRatio];

  // Loading strategy
  const loading = priority ? "eager" : "lazy";
  const fetchPriority = priority ? "high" : undefined;

  // Default fallback icon
  const defaultFallback = (
    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
      <ImageOff className="w-8 h-8" strokeWidth={1} />
      <span className="text-[10px] font-mono uppercase tracking-wider">No Image</span>
    </div>
  );

  return (
    <div className={`relative overflow-hidden ${aspectRatioClass} ${className}`}>
      {/* Skeleton Placeholder behind the blur */}
      {showSkeleton && status === "loading" && (
        <div className={`absolute inset-0 ${skeletonClassName}`} aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
        </div>
      )}

      {/* Error Fallback */}
      <AnimatePresence>
        {status === "error" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={`absolute inset-0 ${skeletonClassName} flex items-center justify-center`}
          >
            {fallbackIcon || defaultFallback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image with blur-up reveal */}
      {src && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          fetchpriority={fetchPriority}
          className={`absolute inset-0 w-full h-full object-${objectFit}`}
          style={{
            filter: status === "loaded" ? "blur(0)" : "blur(20px)",
            transform: status === "loaded" ? "scale(1)" : "scale(1.05)",
            opacity: status === "error" ? 0 : 1,
            transition: `filter ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1), transform ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          }}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          {...imgProps}
        />
      )}
    </div>
  );
};

export default SmartImage;
