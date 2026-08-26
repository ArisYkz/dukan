import { memo, useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useLabels } from '@/hooks/useLabels';
import type { ProductRow } from '@/types/store';
import { formatPrice } from '@/lib/format';

interface ProductListRowSelectableProps {
  product: ProductRow;
  isSelected: boolean;
  onSelect: (productId: string) => void;
  onEdit: (product: ProductRow) => void;
  onDelete: (productId: string) => void;
  mainImage?: string;
}

const ProductListRowSelectable = memo(({
  product,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  mainImage,
}: ProductListRowSelectableProps) => {
  const { PRODUCTS_TAB, ACTIONS } = useLabels();
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
    <div
      className={`grid grid-cols-12 items-center gap-2 md:gap-4 py-2 md:py-3 px-2 md:px-4 border-b border-[hsl(var(--border)/0.3)] transition-all ${
        isSelected
          ? 'bg-[hsl(var(--primary)/0.05)] border-l-2 border-l-[hsl(var(--primary))]'
          : 'hover:bg-[hsl(var(--surface-warm)/0.3)]'
      }`}
    >
      {/* Checkbox */}
      <div className="col-span-1 flex items-center">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(product.id)}
          className="w-3.5 h-3.5 md:w-4 md:h-4"
        />
      </div>

      {/* Image */}
      <div className="col-span-2">
        {mainImage ? (
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-sm overflow-hidden bg-[hsl(var(--muted))] cursor-zoom-in" onClick={() => setLightboxImage(mainImage)}>
            <img src={mainImage} alt={product.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-sm bg-[hsl(var(--muted))] flex items-center justify-center text-[9px] md:text-[10px] text-muted-foreground">
            {PRODUCTS_TAB.NO_IMAGE || 'No img'}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="col-span-3">
        <div className="text-xs md:text-sm font-medium truncate" title={product.name}>
          {product.name}
        </div>
        {product.stock === 0 && (
          <div className="text-[10px] md:text-xs text-destructive mt-0.5">{PRODUCTS_TAB.SOLD_OUT}</div>
        )}
      </div>

      {/* Price */}
      <div className="col-span-2">
        <div className="font-mono text-xs md:text-sm">{formatPrice(product.price)}</div>
      </div>

      {/* Category */}
      <div className="col-span-2">
        <div className="text-xs md:text-sm text-muted-foreground truncate">
          {product.category || PRODUCTS_TAB.NONE}
        </div>
      </div>

      {/* Actions */}
      <div className="col-span-2 flex items-center justify-end gap-1 md:gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => onEdit(product)}
              aria-label={PRODUCTS_TAB.EDIT || 'Edit product'}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{PRODUCTS_TAB.EDIT || 'Edit product'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              onClick={() => onDelete(product.id)}
              aria-label={ACTIONS.DELETE || 'Delete product'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{ACTIONS.DELETE || 'Delete product'}</TooltipContent>
        </Tooltip>
      </div>
    </div>
    </>
  );
});

export default ProductListRowSelectable;
