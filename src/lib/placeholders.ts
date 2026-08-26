import placeholder1 from "@/assets/placeholder-1.jpg";
import placeholder2 from "@/assets/placeholder-2.jpg";
import placeholder3 from "@/assets/placeholder-3.jpg";
import placeholder4 from "@/assets/placeholder-4.jpg";

const PLACEHOLDERS = [placeholder1, placeholder2, placeholder3, placeholder4];

/** Returns a deterministic abstract placeholder based on product id */
export const getPlaceholderImage = (productId: string): string => {
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = ((hash << 5) - hash + productId.charCodeAt(i)) | 0;
  }
  return PLACEHOLDERS[Math.abs(hash) % PLACEHOLDERS.length];
};

export const isPlaceholder = (url: string | null | undefined): boolean =>
  !url || url === "/placeholder.svg" || url === "";
