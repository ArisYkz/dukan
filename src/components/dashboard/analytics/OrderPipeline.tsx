import { useMemo } from "react";
import { useLabels } from "@/hooks/useLabels";
import type { OrderRow } from "@/types/store";
import ProOverlay from "./ProOverlay";

interface OrderPipelineProps {
  orders: OrderRow[];
  views: number | undefined;
  salesTotal: number | undefined;
  isPro: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-secondary-foreground",
  awaiting_verification: "bg-[hsl(45,80%,50%)]",
  paid_confirmed: "bg-accent",
  payment_rejected: "bg-destructive",
  shipped: "bg-primary",
  delivered: "bg-muted-foreground",
  cancelled: "bg-destructive/50",
  returned: "bg-[hsl(200,60%,50%)]",
  refunded: "bg-[hsl(160,60%,40%)]",
};

const STATUS_ORDER = [
  "new", "awaiting_verification", "paid_confirmed", "payment_rejected",
  "shipped", "delivered", "cancelled", "returned", "refunded",
];

const OrderPipeline = ({ orders, views, salesTotal, isPro }: OrderPipelineProps) => {
  const { ANALYTICS, STATUS_LABELS } = useLabels();

  const totalViews = views || 0;
  const totalOrders = salesTotal || 0;
  const conversionRate = totalViews > 0 ? (totalOrders / totalViews) * 100 : 0;

  const { counts, total } = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of orders) {
      map[o.status] = (map[o.status] || 0) + 1;
    }
    return { counts: map, total: orders.length };
  }, [orders]);

  if (total === 0 && totalViews === 0) return null;

  const maxFunnel = Math.max(totalViews, totalOrders, 1);

  return (
    <ProOverlay isPro={isPro}>
      <div className="border border-border rounded-sm p-4 md:p-6 space-y-6">
        <h3 className="text-sm font-medium text-foreground tracking-wide">
          {ANALYTICS.SALES_FUNNEL}
        </h3>

        {/* Funnel: Views → Orders → Conversion */}
        <div className="grid grid-cols-3 gap-6 items-end">
          {[
            { label: ANALYTICS.VIEWS, value: totalViews, pct: 100, color: "hsl(var(--analytics-funnel))" },
            { label: ANALYTICS.ORDERS, value: totalOrders, pct: (totalOrders / maxFunnel) * 100, color: "hsl(var(--analytics-funnel))" },
            { label: "Conversion", value: `${conversionRate.toFixed(1)}%`, pct: Math.max(conversionRate, 2), color: "hsl(var(--analytics-success))" },
          ].map((tier, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <span className="text-[11px] font-mono text-muted-foreground tracking-wide uppercase">
                {tier.label}
              </span>
              <span className="text-xl md:text-2xl font-light text-foreground font-mono tabular-nums">
                {typeof tier.value === "number" ? tier.value.toLocaleString() : tier.value}
              </span>
              <div className="w-full h-1.5 bg-muted rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all duration-500"
                  style={{ width: `${tier.pct}%`, backgroundColor: tier.color }}
                />
              </div>
            </div>
          ))}
        </div>

        {total > 0 && (
          <>
            <div className="border-t border-border/40" />

            {/* Status Breakdown */}
            <div>
              <h4 className="text-[10px] font-mono text-muted-foreground tracking-wide uppercase mb-3">
                {ANALYTICS.ORDERS_BY_STATUS}
              </h4>
              <div className="flex h-2 rounded-sm overflow-hidden mb-3">
                {STATUS_ORDER.filter((s) => (counts[s] || 0) > 0).map((status) => (
                  <div
                    key={status}
                    className={`${STATUS_COLORS[status] || "bg-muted"} transition-all`}
                    style={{ width: `${((counts[status] || 0) / total) * 100}%` }}
                    title={`${STATUS_LABELS[status] || status}: ${counts[status]}`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {STATUS_ORDER.filter((s) => (counts[s] || 0) > 0).map((status) => (
                  <div key={status} className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_COLORS[status] || "bg-muted"}`} />
                    {STATUS_LABELS[status] || status}
                    <span className="font-medium text-foreground/60">{counts[status]}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </ProOverlay>
  );
};

export default OrderPipeline;
