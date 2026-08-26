import { formatPrice } from "@/lib/format";
import { useLabels } from "@/hooks/useLabels";
import { TrendingUp, TrendingDown } from "lucide-react";
import ProOverlay from "./ProOverlay";
import type { MarketingStats } from "@/hooks/useAnalyticsQuery";

const PromoROICard = ({ stats, isPro }: { stats: MarketingStats | undefined; isPro: boolean }) => {
  const { ANALYTICS } = useLabels();

  if (!stats || stats.promo_usage_count === 0) {
    return null;
  }

  const roiPercent = stats.promo_roi || 0;
  const aov_diff = (stats.avg_order_value_promo || 0) - (stats.avg_order_value_regular || 0);

  return (
    <ProOverlay isPro={isPro}>
      <div className="border border-border rounded-sm p-4 md:p-6">
        <h3 className="text-sm font-medium text-foreground mb-4">{ANALYTICS.PROMO_ROI}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground tracking-wide uppercase">{ANALYTICS.ROI}</p>
            <p className="text-2xl md:text-3xl font-light">{roiPercent.toFixed(1)}%</p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground tracking-wide uppercase">AOV Lift</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl md:text-3xl font-light">{formatPrice(aov_diff)}</p>
              {aov_diff > 0 && <TrendingUp className="w-4 h-4 text-green-600" />}
              {aov_diff < 0 && <TrendingDown className="w-4 h-4 text-red-600" />}
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-muted-foreground space-y-1 border-t border-border pt-4">
          <p>Promo Orders: {stats.promo_usage_count}</p>
          <p>Total Discount: {formatPrice(stats.total_discount || 0)}</p>
        </div>
      </div>
    </ProOverlay>
  );
};

export default PromoROICard;
