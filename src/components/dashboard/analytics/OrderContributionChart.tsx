import { useMemo } from "react";

interface OrderContributionChartProps {
  dailySeries: { period: string; orders: number }[] | undefined;
  fullDailySeries?: { period: string; orders: number }[] | undefined;
}

const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;
const R = 2;

const GL = 26;
const GT = 18;
const GB = 28;
const GR = 12;

const TIERS = [
  { fill: "hsl(var(--muted))",          opacity: 0.55 },
  { fill: "hsl(var(--analytics-orders))", opacity: 0.12 },
  { fill: "hsl(var(--analytics-orders))", opacity: 0.32 },
  { fill: "hsl(var(--analytics-orders))", opacity: 0.58 },
  { fill: "hsl(var(--analytics-orders))", opacity: 0.88 },
];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAY_LABELS = [
  { row: 0, label: "Mon" },
  { row: 2, label: "Wed" },
  { row: 4, label: "Fri" },
  { row: 6, label: "Sun" },
];

function getLevel(value: number, max: number): number {
  if (value === 0 || max === 0) return 0;
  const r = value / max;
  if (r <= 0.15) return 1;
  if (r <= 0.35) return 2;
  if (r <= 0.6) return 3;
  return 4;
}

const OrderContributionChart = ({ dailySeries, fullDailySeries }: OrderContributionChartProps) => {
  // Use full_daily_series (12 months) when available, fall back to dailySeries
  const grid = useMemo(() => {
    const source = fullDailySeries ?? dailySeries;
    if (!source || source.length === 0) return null;

    const byDate: Record<string, number> = {};
    for (const d of source) byDate[d.period] = d.orders;

    // Rolling 12-month window centered on the current month
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 6, 0);

    // Align to full weeks: start on Monday, end on Sunday
    const start = new Date(startDate);
    const sd = start.getDay();
    start.setDate(start.getDate() - (sd === 0 ? 6 : sd - 1));

    const end = new Date(endDate);
    const ed = end.getDay();
    end.setDate(end.getDate() + (ed === 0 ? 0 : 7 - ed));

    // Build week columns
    const weeks: { date: Date; count: number }[][] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const week: { date: Date; count: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const key = cursor.toISOString().split("T")[0];
        week.push({ date: new Date(cursor), count: byDate[key] || 0 });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    // Month labels with minimum gap to prevent overlap
    const monthLabels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    let lastLabelCol = -4;
    weeks.forEach((week, ci) => {
      const d = week[3].date;
      // Skip padding weeks outside the rolling window
      if (d < startDate || d > endDate) return;
      const m = d.getMonth();
      if (m !== lastMonth && ci - lastLabelCol >= 3) {
        monthLabels.push({ col: ci, label: MONTHS[m] });
        lastMonth = m;
        lastLabelCol = ci;
      }
    });

    const allCounts = Object.values(byDate);
    const total = allCounts.reduce((a, b) => a + b, 0);
    const maxOrders = Math.max(...allCounts, 1);

    return { weeks, maxOrders, total, monthLabels };
  }, [dailySeries, fullDailySeries]);

  if (!grid || grid.weeks.length === 0) return null;

  const { weeks, maxOrders, total, monthLabels } = grid;
  const MAX_COLS = 54;
  const cols = weeks.length;
  const svgW = GL + MAX_COLS * STEP + GR;
  const svgH = GT + 7 * STEP + GB;

  return (
    <div className="border border-border rounded-sm p-4 md:p-6">
      <h3 className="text-sm font-medium text-foreground tracking-wide mb-4">
        Order Activity
      </h3>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full"
          style={{ minWidth: Math.max(200, cols * STEP + 50) }}
          preserveAspectRatio="xMinYMid meet"
        >
          {/* Month labels */}
          {monthLabels.map((m) => (
            <text
              key={m.label}
              x={GL + m.col * STEP + 1}
              y={GT - 6}
              fill="hsl(var(--muted-foreground))"
              opacity={0.35}
              fontSize={8}
              fontFamily="monospace"
            >
              {m.label}
            </text>
          ))}

          {/* Day labels */}
          {DAY_LABELS.map((d) => (
            <text
              key={d.label}
              x={GL - 6}
              y={GT + d.row * STEP + CELL / 2 + 1}
              textAnchor="end"
              fill="hsl(var(--muted-foreground))"
              opacity={0.35}
              fontSize={8}
              fontFamily="monospace"
            >
              {d.label}
            </text>
          ))}

          {/* Cells */}
          {weeks.map((week, ci) =>
            week.map((day, ri) => {
              const level = getLevel(day.count, maxOrders);
              const t = TIERS[level];
              return (
                <rect
                  key={`${ci}-${ri}`}
                  x={GL + ci * STEP}
                  y={GT + ri * STEP}
                  width={CELL}
                  height={CELL}
                  rx={R}
                  ry={R}
                  fill={t.fill}
                  opacity={t.opacity}
                >
                  <title>
                    {day.date.toISOString().split("T")[0]}: {day.count} order
                    {day.count !== 1 ? "s" : ""}
                  </title>
                </rect>
              );
            }),
          )}

          {/* Legend */}
          <g transform={`translate(${svgW - 118}, ${GT + 7 * STEP + 10})`}>
            <text x={0} y={CELL / 2 + 1} fill="hsl(var(--muted-foreground))" opacity={0.25} fontSize={7} fontFamily="monospace">Less</text>
            {[0, 1, 2, 3, 4].map((l) => {
              const t = TIERS[l];
              return (
                <rect key={l} x={28 + l * (CELL + 2)} y={0} width={CELL - 1} height={CELL - 1} rx={R} ry={R} fill={t.fill} opacity={t.opacity} />
              );
            })}
            <text x={28 + 5 * (CELL + 2) + 4} y={CELL / 2 + 1} fill="hsl(var(--muted-foreground))" opacity={0.25} fontSize={7} fontFamily="monospace">More</text>
          </g>
        </svg>
      </div>

      <div className="mt-3 pt-3 border-t border-border/30">
        <p className="text-[10px] text-muted-foreground/45 font-mono tracking-wider">
          {total} order{total !== 1 ? "s" : ""} &middot; Last 12 months
        </p>
      </div>
    </div>
  );
};

export default OrderContributionChart;
