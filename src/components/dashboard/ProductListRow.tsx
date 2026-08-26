import { useState, useRef, useEffect, memo } from 'react';
import { Edit2, Save, X, MoreVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useLabels } from '@/hooks/useLabels';
import type { ProductRow } from '@/types/store';
import { formatPrice } from '@/lib/format';

interface ProductListRowProps {
  product: ProductRow;
  categories: string[];
  onSave: (updatedFields: Partial<ProductRow>) => Promise<void>;
  onEditClick?: () => void;
  imageUrls?: string[];
  mainImageUrl?: string;
}

const ProductListRow = ({
  product,
  categories,
  onSave,
  onEditClick,
  imageUrls = [],
  mainImageUrl,
}: ProductListRowProps) => {
  const { PRODUCTS_TAB, ACTIONS } = useLabels();
  const NONE_VALUE = "__none__";
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(product.name);
  const [tempPrice, setTempPrice] = useState(product.price.toString());
  const [tempStock, setTempStock] = useState(product.stock.toString());
  const [tempCategory, setTempCategory] = useState(product.category || NONE_VALUE);
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset temp values when product changes
  useEffect(() => {
    if (!isEditing) {
      setTempName(product.name);
      setTempPrice(product.price.toString());
      setTempStock(product.stock.toString());
      setTempCategory(product.category || NONE_VALUE);
    }
  }, [product, isEditing]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setTimeout(() => nameInputRef.current?.focus(), 10);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTempName(product.name);
    setTempPrice(product.price.toString());
    setTempStock(product.stock.toString());
    setTempCategory(product.category || NONE_VALUE);
  };

  const handleSave = async () => {
    const updated: Partial<ProductRow> = {};
    if (tempName !== product.name) updated.name = tempName;
    const priceNum = parseFloat(tempPrice);
    if (!isNaN(priceNum) && priceNum !== product.price) updated.price = priceNum;
    const stockNum = parseInt(tempStock, 10);
    if (!isNaN(stockNum) && stockNum !== product.stock) updated.stock = stockNum;
    const categoryToSave = tempCategory === NONE_VALUE ? null : tempCategory;
    if (categoryToSave !== product.category) updated.category = categoryToSave;

    if (Object.keys(updated).length === 0) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(updated);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isEditing) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const mainImage = mainImageUrl || imageUrls[0] || product.image_url;

  return (
    <div
      className="grid grid-cols-12 items-center gap-4 py-3 px-4 border-b border-[hsl(var(--border)/0.3)] hover:bg-[hsl(var(--surface-warm)/0.3)] transition-colors"
      onKeyDown={handleKeyDown}
    >
      {/* Image */}
      <div className="col-span-1">
        {mainImage ? (
          <div className="w-10 h-10 rounded-sm overflow-hidden bg-[hsl(var(--muted))]">
            <img src={mainImage} alt={product.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-sm bg-[hsl(var(--muted))] flex items-center justify-center text-[10px] text-muted-foreground">
            No img
          </div>
        )}
      </div>

      {/* Name */}
      <div className="col-span-3">
        {isEditing ? (
          <Input
            ref={nameInputRef}
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            className="text-xs h-7"
            placeholder="Product name"
          />
        ) : (
          <div className="text-sm font-medium truncate" title={product.name}>
            {product.name}
          </div>
        )}
      </div>

      {/* Price */}
      <div className="col-span-2">
        {isEditing ? (
          <Input
            value={tempPrice}
            onChange={(e) => setTempPrice(e.target.value)}
            className="text-xs h-7"
            type="number"
            step="0.01"
            placeholder="0.00"
          />
        ) : (
          <div className="font-mono text-sm">{formatPrice(product.price)}</div>
        )}
      </div>

      {/* Stock */}
      <div className="col-span-2">
        {isEditing ? (
          <Input
            value={tempStock}
            onChange={(e) => setTempStock(e.target.value)}
            className="text-xs h-7"
            type="number"
            step="1"
            placeholder="0"
          />
        ) : (
          <div className="text-sm">{product.stock}</div>
        )}
      </div>

      {/* Category */}
      <div className="col-span-2">
        {isEditing ? (
          <Select value={tempCategory} onValueChange={setTempCategory}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="No category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>{PRODUCTS_TAB.NONE}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="text-sm text-muted-foreground truncate">
            {product.category || PRODUCTS_TAB.NONE}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="col-span-2 flex items-center justify-end gap-2">
        {isEditing ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="default"
              className="h-7 w-7 p-0"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={handleStartEdit}
                  aria-label="Inline edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Quick edit</TooltipContent>
            </Tooltip>
            {onEditClick && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={onEditClick}
                    aria-label="Full edit"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Open full editor</TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Memoized to prevent re-renders during search/filter operations
export default memo(ProductListRow);