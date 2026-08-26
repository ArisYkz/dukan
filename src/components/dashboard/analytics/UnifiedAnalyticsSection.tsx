import { useLabels } from "@/hooks/useLabels";
import type { AnalyticsResponse } from "@/hooks/useAnalyticsQuery";
import type { OrderRow } from "@/types/store";
import KPICard from "./KPICard";
import DateRangeSelector from "./DateRangeSelector";
import RevenueChart from "./RevenueChart";
import ProductBreakdown from "./ProductBreakdown";
import PromoROICard from "./PromoROICard";
import InsightCards from "./InsightCards";
import OrderPipeline from "./OrderPipeline";
import OrderContributionChart from "./OrderContributionChart";

interface UnifiedAnalyticsSectionProps {
  data: AnalyticsResponse | null | undefined;
  isLoading: boolean;
  isPro: boolean;
  onUpgradeClick: () => void;
  orders?: OrderRow[];
  selectedRange?: "7d" | "30d" | "90d";
  onRangeChange?: (range: "7d" | "30d" | "90d") => void;
}

const UnifiedAnalyticsSection = ({
  data,
  isLoading,
  isPro,
  onUpgradeClick,
  orders,
  selectedRange,
  onRangeChange,
}: UnifiedAnalyticsSectionProps) => {
  const { ANALYTICS } = useLabels();

  const successIncomplete = data && data.success_rate === 0 && data.orders > 0;

  const kpis: {
    label: string;
    value: number;
    previousValue?: number;
    isCurrency: boolean;
    suffix?: string;
    displayOverride?: string;
  }[] = [
    {
      label: ANALYTICS.REVENUE,
      value: data?.revenue || 0,
      previousValue: data?.prev_revenue,
      isCurrency: true,
    },
    {
      label: ANALYTICS.ORDERS,
      value: data?.orders || 0,
      previousValue: data?.prev_orders,
      isCurrency: false,
    },
    {
      label: ANALYTICS.AVG_ORDER_VALUE,
      value: data?.avg_order_value || 0,
      previousValue: undefined,
      isCurrency: true,
    },
    {
      label: ANALYTICS.SUCCESS_RATE,
      value: data?.success_rate || 0,
      previousValue: data?.prev_success_rate,
      isCurrency: false,
      suffix: "%",
      displayOverride: successIncomplete ? "—" : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xs md:text-xl font-semibold tracking-[0.2em] uppercase text-foreground opacity-90">{ANALYTICS.TITLE}</h2>
        <DateRangeSelector selectedRange={selectedRange || "7d"} onRangeChange={onRangeChange || (() => {})} isPro={isPro} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {kpis.map((kpi, idx) => (
          <KPICard
            key={idx}
            label={kpi.label}
            value={kpi.value}
            previousValue={kpi.previousValue}
            isCurrency={kpi.isCurrency}
            suffix={kpi.suffix}
            isPro={isPro}
            displayOverride={kpi.displayOverride}
          />
        ))}
      </div>

      <InsightCards data={data} />

      <RevenueChart
        data={data?.daily_series}
        prevRevenue={data?.prev_revenue}
        loading={isLoading}
      />

      {/* Hero: full-year contribution chart */}
      <OrderContributionChart dailySeries={data?.daily_series} fullDailySeries={data?.full_daily_series} />

      {/* Pipeline + Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <OrderPipeline
          orders={orders || []}
          views={data?.store_views}
          salesTotal={data?.store_sales_total}
          isPro={isPro}
        />
        <ProductBreakdown products={data?.top_products} isPro={isPro} />
      </div>

      {/* Promo ROI — only when available */}
      {data?.marketing_stats && (
        <PromoROICard stats={data?.marketing_stats} isPro={isPro} />
      )}

      {!isPro && (
        <div className="border border-border rounded-sm p-4 md:p-6 flex flex-col items-center gap-4 bg-muted/30">
          <p className="text-center text-sm md:text-base text-foreground">
            Upgrade to Pro to unlock product insights, ROI analysis, peak hour tracking, and 30+ day trends.
          </p>
          <button
            onClick={onUpgradeClick}
            className="px-6 py-2.5 bg-foreground text-background rounded-sm text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {ANALYTICS.UPGRADE_TO_PRO}
          </button>
        </div>
      )}

      {isPro && data?.top_products && data?.marketing_stats && (
        <div className="border border-border rounded-sm p-4 md:p-6 text-center text-sm text-muted-foreground">
          <p>{ANALYTICS.ADVANCED_UPDATE_NOTE}</p>
        </div>
      )}
    </div>
  );
};

export default UnifiedAnalyticsSection;
