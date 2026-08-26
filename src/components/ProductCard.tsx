import { useState, memo } from "react";
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import type { Product } from "@/data/mockProducts";
import dukenLogo from "@/assets/duken-logo.webp";
import { isPlaceholder, getPlaceholderImage } from "@/lib/placeholders";
import { useLabels } from "@/hooks/useLabels";
import SmartImage from "@/components/ui/SmartImage";

interface ProductCardProps {
  product: Product;
  index: number;
  onSelect: (product: Product) => void;
  onQuickAdd?: (product: Product) => void;
  isPaused?: boolean;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("bn-BD", { numberingSystem: "latn" }).format(price) + " ৳";

const ProductCard = memo(({ product, index, onSelect, onQuickAdd, isPaused }: ProductCardProps) => {
  const { PRODUCT } = useLabels();
  const rawImage = isPlaceholder(product.image) ? getPlaceholderImage(product.id) : product.image;
  const imgSrc = rawImage || '/placeholder.svg';
  
  const outOfStock = product.stock === 0;
  const disabled = outOfStock || isPaused;
  
  // Prioritize first few visible images (above the fold)
  const isAboveFold = index < 4; // First row on mobile (2x2 grid)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.5,
        delay: Math.min(index * 0.05, 0.3),
      }}
      className="group text-left w-full rounded-none bg-[hsl(var(--card))] border-[hsl(var(--border)/0.3)] overflow-hidden flex flex-col"
    >
      {/* Clickable image + info area */}
      <button
        onClick={() => onSelect(product)}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99] transition-transform"
      >
        {/* Square image with SmartImage component */}
        <div className={`overflow-hidden relative${isPaused ? ' grayscale' : ''}`}>
          {/* Blurred background version of the product image */}
          <div className="absolute inset-0 scale-110" aria-hidden="true">
            <img
              src={imgSrc}
              alt=""
              className="w-full h-full object-cover blur-xl opacity-25"
              loading={isAboveFold ? undefined : "lazy"}
            />
          </div>
          <SmartImage
            src={imgSrc}
            alt={product.name}
            aspectRatio="1:1"
            objectFit="contain"
            priority={isAboveFold}
            skeletonClassName="bg-muted/50"
            transitionDuration={700}
          />
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 bg-[hsl(var(--background)/0.7)] backdrop-blur-sm px-1.5 py-0.5 rounded-sm z-10">
            <img src={dukenLogo} alt="" className="h-2.5 dark:invert opacity-50" />
            <span className="text-[8px] font-mono tracking-wide text-[hsl(var(--muted-foreground)/0.7)] uppercase">Powered by Duken</span>
          </div>
        </div>

        {/* Info area */}
        <div className="p-3 md:p-4">
          <h3 className="font-body text-xs md:text-sm font-semibold tracking-[0.12em] uppercase text-foreground line-clamp-2">
            {product.name}
          </h3>
          <div className="flex items-center justify-between mt-1">
            <span className="font-mono text-[11px] text-muted-foreground">
              {product.stock > 0 ? `× ${product.stock}` : 'Sold out'}
            </span>
            <span className="font-mono text-xs md:text-sm text-[hsl(var(--highlight))]">
              {formatPrice(product.price)}
            </span>
          </div>
        </div>
      </button>

      {/* Quick Add to Cart button */}
      {onQuickAdd && (
        <div className="px-3 pb-3 md:px-4 md:pb-4 min-h-[44px] mt-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) onQuickAdd(product);
            }}
            disabled={disabled}
            className="w-full flex items-center justify-center gap-1.5 py-2 border-2 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: 'hsl(var(--border) / 0.3)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'hsl(var(--highlight))'; (e.currentTarget as HTMLElement).style.color = 'hsl(var(--background))'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; (e.currentTarget as HTMLElement).style.color = ''; }}
          >
            <ShoppingBag className="w-3 h-3" />
            {isPaused ? (PRODUCT.PAUSED || "PAUSED") : outOfStock ? PRODUCT.OUT_OF_STOCK : PRODUCT.ADD_TO_CART}
          </button>
        </div>
      )}
    </motion.div>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
