import { useCallback } from "react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types/store";

interface ProductGridSectionProps {
  products: Product[];
  productVariantsMap: Record<string, any[]>;
  activeCategory: string;
  onSelect: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  isPaused: boolean;
  STOREFRONT: Record<string, string>;
}

const ProductGridSection = ({
  products,
  productVariantsMap,
  activeCategory,
  onSelect,
  onQuickAdd,
  isPaused,
  STOREFRONT,
}: ProductGridSectionProps) => {
  const handleQuickAdd = useCallback((p: Product) => {
    if (productVariantsMap[p.id]?.length > 0) {
      onSelect(p);
    } else {
      onQuickAdd(p);
    }
  }, [productVariantsMap, onSelect, onQuickAdd]);

  if (products.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-12 container">
        {activeCategory === "all" ? STOREFRONT.NO_PRODUCTS : STOREFRONT.CATEGORY_EMPTY}
      </p>
    );
  }

  return (
    <div className="container">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-8">
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            index={i}
            onSelect={onSelect}
            onQuickAdd={handleQuickAdd}
            isPaused={isPaused}
          />
        ))}
      </div>
    </div>
  );
};

export default ProductGridSection;
