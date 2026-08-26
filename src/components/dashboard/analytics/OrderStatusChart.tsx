import { useMemo } from "react";
import { useLabels } from "@/hooks/useLabels";
import type { OrderRow } from "@/types/store";

interface OrderStatusChartProps {
  orders: OrderRow[];
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

const OrderStatusChart = ({ orders }: OrderStatusChartProps) => {
  const { STATUS_LABELS } = useLabels();

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of orders) {
      map[o.status] = (map[o.status] || 0) + 1;
    }
    return map;
  }, [orders]);

  const total = orders.length;
  if (total === 0) return null;

  return (
    <div className="border border-border rounded-sm p-4 md:p-6">
      <h3 className="text-sm font-medium text-foreground mb-3">
        {STATUS_LABELS?.title || "Order Status"}
      </h3>

      {/* Stacked bar */}
      <div className="flex h-5 rounded-sm overflow-hidden mb-3">
        {STATUS_ORDER.filter((s) => (counts[s] || 0) > 0).map((status) => (
          <div
            key={status}
            className={`${STATUS_COLORS[status] || "bg-muted"} transition-all`}
            style={{ width: `${((counts[status] || 0) / total) * 100}%` }}
            title={`${STATUS_LABELS[status] || status}: ${counts[status]}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {STATUS_ORDER.filter((s) => (counts[s] || 0) > 0).map((status) => (
          <div key={status} className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            <span className={`inline-block w-2 h-2 rounded-full ${STATUS_COLORS[status] || "bg-muted"}`} />
            {STATUS_LABELS[status] || status}
            <span className="font-medium text-foreground/70">{counts[status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderStatusChart;
