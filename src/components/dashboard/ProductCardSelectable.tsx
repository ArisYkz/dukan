import { memo, useState } from "react";
import { motion } from "framer-motion";
import { Edit2, Trash2, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPrice } from "@/lib/format";
import type { ProductRow } from "@/types/store";

interface ProductCardSelectableProps {
  product: ProductRow;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (product: ProductRow) => void;
  onDelete: (id: string) => void;
  mainImage?: string;
  selectable?: boolean; // Explicit prop to control checkbox visibility
}

const ProductCardSelectable = memo(({
  product,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  mainImage,
  selectable = true, // Default to true for backward compatibility
}: ProductCardSelectableProps) => {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  return (
    <>
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <img src={lightboxImage} alt="" className="max-w-[95vw] max-h-[95vh] object-contain" />
        </div>
      )}

    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative border rounded-none overflow-hidden bg-[hsl(var(--card))] flex flex-col transition-all ${
        isSelected
          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
          : "border-[hsl(var(--border)/0.3)]"
      }`}
    >
      {/* Checkbox Overlay (only when selectable is true) */}
      {selectable && (
        <div className="absolute top-1.5 md:top-2 left-1.5 md:left-2 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(product.id)}
            className="w-4 h-4 md:w-5 md:h-5 border-2"
          />
        </div>
      )}

      {/* Image */}
      {mainImage && (
        <div className="aspect-square overflow-hidden bg-[hsl(var(--muted))] relative cursor-zoom-in" onClick={() => setLightboxImage(mainImage)}>
          <img src={mainImage} alt={product.name} className="w-full h-full object-contain" loading="lazy" />
          {isSelected && (
            <div className="absolute inset-0 bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
              <Check className="w-8 h-8 text-[hsl(var(--primary))]" />
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-2 md:p-3 flex flex-col flex-grow">
        <h3 className="font-body text-[10px] md:text-[11px] font-semibold tracking-[0.12em] uppercase text-foreground line-clamp-2 min-h-[2.4em]">
          {product.name}
        </h3>
        <p className="font-mono text-[9px] md:text-[10px] tracking-wide text-muted-foreground mt-0.5 md:mt-1 truncate">
          Stock: {product.stock}
          {product.category && ` · ${product.category}`}
          {product.stock === 0 && <span className="text-destructive ml-1">· SOLD OUT</span>}
        </p>
        <p className="font-mono text-[10px] md:text-[11px] text-[hsl(var(--highlight))] text-right mt-auto">
          {formatPrice(product.price)}
        </p>
      </div>

      {/* Actions */}
      <div className="border-t border-[hsl(var(--border)/0.3)] flex shrink-0">
        <button
          onClick={() => onEdit(product)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 md:py-2 text-[9px] md:text-[10px] font-mono tracking-wide uppercase text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-warm))] transition-colors"
        >
          <Edit2 className="w-3 h-3" /> Edit
        </button>
        <div className="w-px bg-[hsl(var(--border)/0.3)]" />
        <button
          onClick={() => onDelete(product.id)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 md:py-2 text-[9px] md:text-[10px] font-mono tracking-wide uppercase text-destructive/70 hover:text-destructive hover:bg-destructive/5 transition-colors"
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>
    </motion.div>
    </>
  );
});

export default ProductCardSelectable;
