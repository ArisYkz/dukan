import { memo } from "react";
import ProductCardSelectable from "@/components/dashboard/ProductCardSelectable";
import type { ProductRow, ProductImageRow } from "@/types/store";

interface ProductGridViewProps {
  products: ProductRow[];
  productImages: Record<string, ProductImageRow[]>;
  onEdit: (product: ProductRow) => void;
  onDelete: (id: string) => void;
}

const ProductGridView = memo(({ products, productImages, onEdit, onDelete }: ProductGridViewProps) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
    {products.map((product) => {
      const imgs = productImages[product.id] || [];
      const mainImg = imgs.find((img) => img.is_main)?.image_url || imgs[0]?.image_url || product.image_url;
      return (
        <ProductCardSelectable
          key={product.id}
          product={product}
          isSelected={false}
          onSelect={() => {}}
          selectable={false}
          onEdit={onEdit}
          onDelete={onDelete}
          mainImage={mainImg ?? undefined}
        />
      );
    })}
  </div>
));

export default ProductGridView;
