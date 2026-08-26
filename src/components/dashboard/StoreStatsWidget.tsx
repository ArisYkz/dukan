import { useMemo } from "react";
import { useLabels } from "@/hooks/useLabels";
import { formatPrice } from "@/lib/format";
import type { StoreRow, OrderRow } from "@/types/store";

interface StoreStatsWidgetProps {
  store: StoreRow;
  orders: OrderRow[];
}

const StatCell = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col items-center text-center px-0.5 sm:px-3">
    <p className="font-mono text-[9px] sm:text-sm tracking-[0.1em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-0.5">
      {label}
    </p>
    <p className="font-mono text-xs sm:text-xl md:text-2xl text-foreground">{value}</p>
  </div>
);

const StoreStatsWidget = ({ store, orders }: StoreStatsWidgetProps) => {
  const { STORE_STATS } = useLabels();

  const totalViews = store.total_views || 0;
  const totalSales = store.total_sales_count || 0;
  const conversion = totalViews > 0 ? ((totalSales / totalViews) * 100) : 0;
  const conversionDisplay = conversion > 0 ? conversion.toFixed(1) : "0";
  const isLowConversion = conversion < 2 && totalViews > 10;

  // Today's stats
  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const confirmedStatuses = ["paid_confirmed", "confirmed", "shipped", "delivered"];
    const todaySales = orders.filter((o) => {
      const d = new Date(o.created_at);
      return d >= today && confirmedStatuses.includes(o.status);
    }).length;
    return { todaySales };
  }, [orders]);

  // Monthly tax summary
  const monthlyTax = useMemo(() => {
    if (!store.tax_enabled) return 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const confirmedStatuses = ["paid_confirmed", "confirmed", "shipped", "delivered"];
    return orders
      .filter((o) => new Date(o.created_at) >= monthStart && confirmedStatuses.includes(o.status))
      .reduce((sum, o) => sum + (o.tax_amount || 0), 0);
  }, [orders, store.tax_enabled]);

  return (
    <div className="mb-3 md:mb-8">
      <div className={`grid divide-x divide-border border-b border-border pb-1 md:pb-4 ${store.tax_enabled ? "grid-cols-4" : "grid-cols-3"}`}>
        <StatCell
          label={STORE_STATS?.VIEWS || "Views"}
          value={totalViews.toLocaleString()}
        />

        <StatCell
          label={STORE_STATS?.ORDERS || "Orders"}
          value={totalSales.toLocaleString()}
        />

        <StatCell
          label={STORE_STATS?.CONVERSION || "Conversion"}
          value={`${conversionDisplay}%`}
        />

        {store.tax_enabled && (
          <StatCell
            label={STORE_STATS?.TAX_OVERVIEW || "Tax This Month"}
            value={formatPrice(monthlyTax)}
          />
        )}
      </div>

      {/* Insight text */}
      {totalViews > 0 && (
        <div className="pt-1 md:pt-2 space-y-0.5 md:space-y-1">
          <p className="font-mono text-[10px] md:text-xs text-muted-foreground">
            {(STORE_STATS?.TODAY_INSIGHT || "Today: {sales} sales")
              .replace("{sales}", String(todayStats.todaySales))}
          </p>
          {isLowConversion && (
            <p className="font-mono text-[10px] md:text-xs text-accent">
              {STORE_STATS?.LOW_CONVERSION_TIP || "Tip: Try improving product descriptions or photos."}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default StoreStatsWidget;
