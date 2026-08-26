import { formatPrice } from "@/lib/format";
import { useLabels } from "@/hooks/useLabels";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  label: string;
  value: number;
  previousValue?: number;
  isCurrency?: boolean;
  suffix?: string;
  isPro: boolean;
  /** Show this text instead of the computed value (e.g. "—" when no data) */
  displayOverride?: string;
}

const KPICard = ({
  label,
  value,
  previousValue,
  isCurrency = true,
  suffix,
  isPro,
  displayOverride,
}: KPICardProps) => {
  const { ANALYTICS } = useLabels();
  const hasPrev = isPro && previousValue !== undefined && previousValue > 0;
  const trend = hasPrev ? ((value - previousValue) / previousValue) * 100 : null;
  const deltaAbs = hasPrev ? value - previousValue : null;
  const isPositive = trend !== null && trend >= 0;
  const formatted = displayOverride ?? (isCurrency
    ? formatPrice(value)
    : suffix != null
      ? `${value.toFixed(1)}${suffix}`
      : String(value));

  return (
    <div className="border border-border rounded-sm p-3 md:p-5 flex flex-col gap-2 md:gap-3">
      <p className="text-[10px] md:text-sm text-muted-foreground tracking-wide uppercase">{label}</p>
      <div className="flex items-baseline gap-2 flex-wrap">
        <p className="text-lg md:text-3xl font-light">{formatted}</p>
        {trend !== null && trend !== 0 && (
          <div className={`flex items-center gap-1 text-sm ${isPositive ? "text-green-600" : "text-red-600"}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>
      {deltaAbs !== null && deltaAbs !== 0 && (
        <p className="text-sm text-muted-foreground font-mono">
          {isCurrency
            ? `${deltaAbs > 0 ? "+" : ""}${formatPrice(deltaAbs)} ${ANALYTICS.PREV_PERIOD}`
            : `${deltaAbs > 0 ? "+" : ""}${deltaAbs.toFixed(suffix ? 1 : 0)}${suffix || ""} ${ANALYTICS.PREV_PERIOD}`}
        </p>
      )}
    </div>
  );
};

export default KPICard;
