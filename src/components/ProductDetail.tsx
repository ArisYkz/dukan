import { forwardRef, useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Minus, Plus } from "lucide-react";
import ProductGallery from "@/components/ProductGallery";
import VariantSelector from "@/components/VariantSelector";
import StarRating from "@/components/StarRating";
import { formatPrice } from "@/lib/format";
import { useLabels } from "@/hooks/useLabels";
import { isPlaceholder, getPlaceholderImage } from "@/lib/placeholders";

import { useProductReviews } from "@/hooks/queries/useStorefront";
import type { Product } from "@/data/mockProducts";

interface VariantOption {
  variant_type: string;
  variant_value: string;
  price_adjustment: number;
  stock?: number;
}

interface ProductDetailProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, selectedVariants?: Record<string, string>, quantity?: number, variantPriceAdjustment?: number) => void;
  galleryImages?: string[];
  variants?: VariantOption[];
  isPaused?: boolean;
}

const ProductDetail = forwardRef<HTMLDivElement, ProductDetailProps>(
  ({ product, onClose, onAddToCart, galleryImages, variants = [], isPaused }, ref) => {
    const { PRODUCT } = useLabels();
    const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
    const [quantity, setQuantity] = useState(1);

    // Cached reviews via React Query
    const { data: reviewData } = useProductReviews(product?.id);
    const avgRating = reviewData?.avgRating ?? 0;
    const reviewCount = reviewData?.reviewCount ?? 0;

    useEffect(() => {
      if (!product || variants.length === 0 || Object.keys(selectedVariants).length > 0) return;
      const initialSelection: Record<string, string> = {};
      const variantTypes = [...new Set(variants.map(v => v.variant_type))];
      variantTypes.forEach(type => {
        const availableOption = variants.find(v => v.variant_type === type && (v.stock === undefined || v.stock > 0));
        if (availableOption) initialSelection[type] = availableOption.variant_value;
      });
      if (Object.keys(initialSelection).length > 0) setSelectedVariants(initialSelection);
    }, [product, variants, selectedVariants]);

    if (!product) return null;

    const images = galleryImages && galleryImages.length > 0
      ? galleryImages
      : isPlaceholder(product.image) ? [getPlaceholderImage(product.id)] : [product.image];

    const handleSelectVariant = (type: string, value: string) => {
      const variant = variants.find(v => v.variant_type === type && v.variant_value === value);
      if (variant?.stock !== undefined && variant.stock <= 0) {
        // Optionally show a hint (but button is disabled, so unlikely)
        return;
      }
      setSelectedVariants(prev => ({ ...prev, [type]: value }));
    };

    const priceAdjustment = Object.entries(selectedVariants).reduce((sum, [type, value]) => {
      const v = variants.find(v => v.variant_type === type && v.variant_value === value);
      return sum + (v?.price_adjustment || 0);
    }, 0);

    const finalPrice = product.price + priceAdjustment;
    const variantTypes = [...new Set(variants.map(v => v.variant_type))];
    const allVariantsSelected = variantTypes.length === 0 || variantTypes.every(t => selectedVariants[t]);

    return (
      <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-30" />
        <motion.div
          initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 20, filter: "blur(4px)" }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-0 top-0 bottom-0 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl md:top-[1vh] md:bottom-[5vh] bg-background z-30 rounded-none shadow-2xl overflow-hidden flex flex-col"
        >
          <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-background/80 backdrop-blur rounded-none hover:bg-muted transition-colors active:scale-95">
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 overflow-y-auto min-h-0">
            <ProductGallery images={images} productName={product.name} />
            <div className="p-6 md:p-8 space-y-4">
              <div>
                <h2 className="font-body text-lg font-semibold tracking-[0.12em] uppercase">{product.name}</h2>
                <span className="font-mono text-base md:text-lg text-foreground/70 mt-1 block">{formatPrice(finalPrice)}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-prose text-sm">{product.description}</p>
              {reviewCount > 0 && (
                <div className="flex items-center gap-2">
                  <StarRating rating={avgRating} size={14} />
                  <span className="font-mono text-xs text-muted-foreground tracking-wide">
                    {avgRating.toFixed(1)} / 5.0 · {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                  </span>
                </div>
              )}
              {variants.length > 0 && (
                <div className="space-y-2">
                  <p className="font-mono text-xs tracking-[0.15em] uppercase text-muted-foreground">{PRODUCT.VARIANTS_LABEL || "Options"}</p>
                  <VariantSelector variants={variants} selected={selectedVariants} onSelect={handleSelectVariant} />
                </div>
              )}
              {product.stock > 0 && (
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">{PRODUCT.QTY_LABEL || "Qty"}</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors disabled:opacity-30"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-mono text-sm w-6 text-center">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                      disabled={quantity >= product.stock}
                      className="w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors disabled:opacity-30"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">/ {product.stock} {PRODUCT.STOCK_LEFT}</span>
                </div>
              )}
              <p className="font-mono text-xs tracking-wide text-muted-foreground">
                {product.stock === 0 && PRODUCT.OUT_OF_STOCK}
              </p>
            </div>
          </div>

          <div className="p-6 border-t border-border mt-auto flex-shrink-0">
            <button
              onClick={() => { if (!isPaused) { onAddToCart(product, selectedVariants, quantity, priceAdjustment); onClose(); } }}
              disabled={isPaused || product.stock === 0 || (variants.length > 0 && !allVariantsSelected)}
              className="w-full bg-charcoal text-cream py-3 text-sm font-body tracking-[0.1em] uppercase rounded-none hover:opacity-90 transition-opacity active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPaused
                ? (PRODUCT.PAUSED || "PAUSED")
                : product.stock === 0
                  ? PRODUCT.OUT_OF_STOCK
                  : variants.length > 0 && !allVariantsSelected
                    ? PRODUCT.SELECT_VARIANT
                    : `${PRODUCT.ADD_TO_CART}${quantity > 1 ? ` (${quantity})` : ''}`
              }
            </button>
          </div>
        </motion.div>
      </>
    );
  }
);

ProductDetail.displayName = "ProductDetail";
export default ProductDetail;
