import { memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import ProductListRowSelectable from "@/components/dashboard/ProductListRowSelectable";
import type { ProductRow, ProductImageRow } from "@/types/store";

interface ProductListViewColumnLabels {
  image: string;
  name: string;
  price: string;
  category: string;
  actions: string;
}

interface ProductListViewProps {
  products: ProductRow[];
  productImages: Record<string, ProductImageRow[]>;
  selectedIds: string[];
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onEdit: (product: ProductRow) => void;
  onDelete: (id: string) => void;
  itemsSelectedLabel: string;
  selectAllLabel: string;
  columnLabels: ProductListViewColumnLabels;
}

const ProductListView = memo(({
  products,
  productImages,
  selectedIds,
  onSelect,
  onSelectAll,
  onEdit,
  onDelete,
  itemsSelectedLabel,
  selectAllLabel,
  columnLabels,
}: ProductListViewProps) => (
  <div className="border border-[hsl(var(--border)/0.3)] rounded-sm overflow-hidden bg-[hsl(var(--card))]">
    {/* Select All Header */}
    <div className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1.5 md:py-2 bg-[hsl(var(--muted)/0.3)] border-b border-[hsl(var(--border)/0.3)]">
      <Checkbox
        checked={selectedIds.length === products.length && products.length > 0}
        onCheckedChange={onSelectAll}
        className="w-4 h-4 md:w-5 md:h-5"
      />
      <span className="text-[10px] md:text-xs font-medium text-muted-foreground">
        {selectedIds.length > 0
          ? `${selectedIds.length} / ${products.length} ${itemsSelectedLabel}`
          : `${selectAllLabel} (${products.length})`}
      </span>
    </div>

    {/* Table Header */}
    <div className="grid grid-cols-12 gap-2 md:gap-4 py-1.5 md:py-2 px-2 md:px-4 bg-[hsl(var(--muted)/0.3)] text-[9px] md:text-[10px] font-mono tracking-[0.15em] uppercase text-muted-foreground border-b border-[hsl(var(--border)/0.3)]">
      <div className="col-span-1"></div>
      <div className="col-span-2">{columnLabels.image}</div>
      <div className="col-span-3">{columnLabels.name}</div>
      <div className="col-span-2">{columnLabels.price}</div>
      <div className="col-span-2">{columnLabels.category}</div>
      <div className="col-span-2 text-right">{columnLabels.actions}</div>
    </div>

    {/* Table Rows */}
    {products.map((product) => {
      const imgs = productImages[product.id] || [];
      const mainImg = imgs.find((img) => img.is_main)?.image_url || imgs[0]?.image_url || product.image_url;
      return (
        <ProductListRowSelectable
          key={product.id}
          product={product}
          isSelected={selectedIds.includes(product.id)}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          mainImage={mainImg ?? undefined}
        />
      );
    })}
  </div>
));

export default ProductListView;
