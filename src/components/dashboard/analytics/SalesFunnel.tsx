import { useLabels } from "@/hooks/useLabels";
import ProOverlay from "./ProOverlay";

const SalesFunnel = ({
  views,
  orders,
  isPro,
}: {
  views: number | undefined;
  orders: number | undefined;
  isPro: boolean;
}) => {
  const { ANALYTICS } = useLabels();

  const totalViews = views || 0;
  const totalOrders = orders || 0;
  const conversionRate = totalViews > 0 ? (totalOrders / totalViews) * 100 : 0;

  if (totalViews === 0 && totalOrders === 0) {
    return null;
  }

  const maxWidth = Math.max(totalViews, 1);

  const tiers = [
    { label: ANALYTICS.VIEWS, value: totalViews, width: 100 },
    { label: ANALYTICS.ORDERS, value: totalOrders, width: Math.max((totalOrders / maxWidth) * 100, 4) },
    {
      label: ANALYTICS.CONVERSION || "Conversion",
      value: `${conversionRate.toFixed(1)}%`,
      width: Math.max(conversionRate, 2),
    },
  ];

  return (
    <ProOverlay isPro={isPro}>
      <div className="border border-border rounded-sm p-4 md:p-6">
        <h3 className="text-sm font-medium text-foreground mb-4">{ANALYTICS.SALES_FUNNEL}</h3>
        <div className="space-y-4">
          {tiers.map((tier, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5">
              <div className="flex items-center justify-between w-full max-w-md">
                <span className="text-sm text-muted-foreground font-mono tracking-wide uppercase">
                  {tier.label}
                </span>
                <span className="text-sm font-medium text-foreground font-mono">
                  {typeof tier.value === "number" ? tier.value.toLocaleString() : tier.value}
                </span>
              </div>
              <div className="w-full max-w-md h-2.5 bg-muted rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all duration-500"
                  style={{
                    width: `${tier.width}%`,
                    backgroundColor: idx === 2
                      ? "hsl(var(--analytics-success))"
                      : "hsl(var(--analytics-funnel))",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </ProOverlay>
  );
};

export default SalesFunnel;
