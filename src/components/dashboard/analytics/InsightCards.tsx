import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, Clock, ShoppingBag } from "lucide-react";
import type { AnalyticsResponse } from "@/hooks/useAnalyticsQuery";

interface InsightCardsProps {
  data: AnalyticsResponse | null | undefined;
}

const InsightCards = ({ data }: InsightCardsProps) => {
  const { t } = useTranslation();
  const insights = useMemo(() => {
    if (!data) return [];

    const result: { icon: typeof TrendingUp; text: string }[] = [];

    // Best selling product
    const top = data.top_products?.[0];
    if (top && top.revenue > 0) {
      const share = top.share ?? 0;
      result.push({
        icon: ShoppingBag,
        text: top.units_sold > 1
          ? t("ANALYTICS.INSIGHT_BEST_SELLER_UNITS", { name: top.name, share: share.toFixed(0), units: top.units_sold })
          : t("ANALYTICS.INSIGHT_BEST_SELLER", { name: top.name, share: share.toFixed(0) }),
      });
    }

    // Peak traffic time
    const peak = (data.series ?? []).reduce(
      (best, h) => (h.count > best.count ? h : best),
      { hour: 0, count: 0 },
    );
    if (peak.count > 0) {
      const time = `${peak.hour % 12 || 12}${peak.hour < 12 ? "AM" : "PM"}`;
      result.push({
        icon: Clock,
        text: t("ANALYTICS.INSIGHT_PEAK_TIME", { time, count: peak.count }),
      });
    }

    // Conversion insight
    if (data.store_views && data.store_views > 0 && data.store_sales_total !== undefined) {
      const rate = ((data.store_sales_total / data.store_views) * 100).toFixed(1);
      result.push({
        icon: TrendingUp,
        text: t("ANALYTICS.INSIGHT_CONVERSION", { rate, sales: data.store_sales_total, views: data.store_views }),
      });
    }

    return result;
  }, [data, t]);

  if (insights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {insights.map((insight, idx) => {
        const Icon = insight.icon;
        return (
          <div key={idx} className="border border-border/50 rounded-sm p-3 flex items-start gap-2.5 bg-muted/20">
            <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">{insight.text}</p>
          </div>
        );
      })}
    </div>
  );
};

export default InsightCards;
