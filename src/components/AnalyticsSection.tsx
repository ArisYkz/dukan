import { useState, useMemo } from "react";
import type { OrderRow } from "@/types/store";
import { useAnalyticsQuery } from "@/hooks/useAnalyticsQuery";
import UnifiedAnalyticsSection from "@/components/dashboard/analytics/UnifiedAnalyticsSection";

interface AnalyticsSectionProps {
  storeId: string | null | undefined;
  isPro: boolean;
  onUpgradeClick?: () => void;
  orders?: OrderRow[];
}

const RANGE_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const AnalyticsSection = ({ storeId, isPro, onUpgradeClick, orders }: AnalyticsSectionProps) => {
  const [selectedRange, setSelectedRange] = useState<"7d" | "30d" | "90d">("7d");

  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    const days = RANGE_DAYS[selectedRange] || 7;
    start.setDate(start.getDate() - days);
    end.setDate(end.getDate() + 1);

    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }, [selectedRange]);

  const { data, isLoading } = useAnalyticsQuery({
    storeId,
    startDate,
    endDate,
    granularity: "daily",
  });

  const handleUpgradeClick = () => {
    onUpgradeClick?.();
  };

  const handleRangeChange = (range: "7d" | "30d" | "90d") => {
    setSelectedRange(range);
  };

  return (
    <UnifiedAnalyticsSection
      data={data}
      isLoading={isLoading}
      isPro={isPro}
      onUpgradeClick={handleUpgradeClick}
      orders={orders}
      selectedRange={selectedRange}
      onRangeChange={handleRangeChange}
    />
  );
};

export default AnalyticsSection;
