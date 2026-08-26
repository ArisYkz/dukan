import { useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";
import { formatPrice } from "@/lib/format";
import { useLabels } from "@/hooks/useLabels";

interface RevenueChartProps {
  data: { period: string; revenue: number; orders: number }[] | undefined;
  prevRevenue?: number;
  loading: boolean;
}

const RevenueChart = ({ data, prevRevenue, loading }: RevenueChartProps) => {
  const { ANALYTICS } = useLabels();

  const prevAvg = useMemo(() => {
    if (!data || data.length === 0 || !prevRevenue) return null;
    return prevRevenue / data.length;
  }, [data, prevRevenue]);

  if (!data || data.length === 0 || loading) {
    return (
      <div className="border border-border rounded-sm p-4 md:p-6">
        <h3 className="text-sm font-medium text-foreground mb-4">{ANALYTICS.REVENUE} Trend</h3>
        <div className="h-[280px] flex items-center justify-center">
          <p className="text-muted-foreground text-sm">{ANALYTICS.NO_DATA_AVAILABLE}</p>
        </div>
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.period).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return (
    <div className="border border-border rounded-sm p-4 md:p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium text-foreground">{ANALYTICS.REVENUE} Trend</h3>
        <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[hsl(var(--analytics-revenue))]" />
            {ANALYTICS.THIS_PERIOD}
          </span>
          {prevAvg !== null && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-sm bg-[hsl(var(--analytics-comparison))] border-0" style={{ borderTop: "1.5px dashed hsl(var(--analytics-comparison))" }} />
              {ANALYTICS.PREV_PERIOD}
            </span>
          )}
        </div>
      </div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--analytics-revenue))" stopOpacity={0.28} />
                <stop offset="100%" stopColor="hsl(var(--analytics-revenue))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
            <XAxis
              dataKey="label"
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: "11px" }}
              tickLine={false}
              axisLine={false}
              dy={8}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: "11px" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              dx={-4}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "4 4" }}
              formatter={(value: number, name: string) => {
                if (name === "revenue") return [formatPrice(value), ANALYTICS.REVENUE];
                return [String(value), ANALYTICS.ORDERS];
              }}
              labelFormatter={(label) => `${label}`}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--analytics-revenue))"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              name="revenue"
            />
            {prevAvg !== null && (
              <ReferenceLine
                y={prevAvg}
                stroke="hsl(var(--analytics-comparison))"
                strokeDasharray="6 4"
                strokeWidth={1.5}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChart;
