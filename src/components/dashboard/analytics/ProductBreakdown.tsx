import { useLabels } from "@/hooks/useLabels";
import { formatPrice } from "@/lib/format";
import SmartImage from "@/components/ui/SmartImage";
import ProOverlay from "./ProOverlay";
import type { TopProduct } from "@/hooks/useAnalyticsQuery";

const ProductBreakdown = ({ products, isPro }: { products: TopProduct[] | undefined; isPro: boolean }) => {
  const { ANALYTICS } = useLabels();

  if (!products || products.length === 0) {
    return null;
  }

  const topProducts = products.slice(0, 5);
  const maxRevenue = Math.max(...topProducts.map((p) => p.revenue), 1);

  return (
    <ProOverlay isPro={isPro}>
      <div className="border border-border rounded-sm p-4 md:p-6">
        <h3 className="text-sm font-medium text-foreground mb-4">{ANALYTICS.TOP_PRODUCTS}</h3>
        <div className="space-y-4">
          {topProducts.map((product, idx) => {
            const sharePercent = product.share || 0;
            const shareWidth = (product.revenue / maxRevenue) * 100;

            return (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-10 h-10 flex-shrink-0 rounded-sm overflow-hidden bg-muted">
                  {product.image_url ? (
                    <SmartImage
                      src={product.image_url}
                      alt={product.name}
                      aspectRatio="1:1"
                      className="w-full h-full"
                      showSkeleton={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground font-mono uppercase">
                      {ANALYTICS.IMAGE_NOT_AVAILABLE}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-foreground truncate">{product.name}</p>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {product.units_sold} {ANALYTICS.UNITS_SOLD}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-muted rounded-sm overflow-hidden">
                      <div
                        className="h-full rounded-sm"
                        style={{
                          width: `${shareWidth}%`,
                          backgroundColor: "hsl(var(--analytics-revenue))",
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground whitespace-nowrap font-mono">
                      {sharePercent.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 font-mono">
                    {formatPrice(product.revenue)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ProOverlay>
  );
};

export default ProductBreakdown;
