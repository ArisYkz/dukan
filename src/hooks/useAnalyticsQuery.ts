import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";

const ANALYTICS_EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics-aggregation`;

export interface AnalyticsMetric {
  hour?: string;
  revenue: number;
  orders: number;
  avg_order_value: number;
  success_rate: number;
}

export interface TopProduct {
  name: string;
  units_sold: number;
  revenue: number;
  share: number;
  product_id?: string;
  image_url?: string | null;
}

export interface MarketingStats {
  promo_usage_count: number;
  promo_roi: number;
  avg_order_value_promo: number;
  avg_order_value_regular: number;
  total_discount: number;
}

export interface AnalyticsResponse {
  revenue: number;
  orders: number;
  avg_order_value: number;
  success_rate: number;
  series: { hour: number; count: number }[];
  daily_series: { period: string; revenue: number; orders: number }[];
  full_daily_series: { period: string; revenue: number; orders: number }[];
  top_products: TopProduct[];
  marketing_stats: MarketingStats;
  hourly: AnalyticsMetric[];
  prev_revenue?: number;
  prev_orders?: number;
  prev_success_rate?: number;
  store_views?: number;
  store_sales_total?: number;
}

interface UseAnalyticsQueryProps {
  storeId: string | null | undefined;
  startDate: string;
  endDate: string;
  granularity: "daily" | "hourly";
}

export const useAnalyticsQuery = ({ storeId, startDate, endDate, granularity }: UseAnalyticsQueryProps) => {
  const queryClient = useQueryClient();

  const query = useQuery<AnalyticsResponse | null, PostgrestError>({
    queryKey: ["analytics", storeId, startDate, endDate, granularity],
    queryFn: async () => {
      if (!storeId) return null;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const params = new URLSearchParams({
        store_id: storeId,
        start_date: startDate,
        end_date: endDate,
        granularity,
      });

      const res = await fetch(`${ANALYTICS_EDGE_URL}?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Failed to fetch analytics");
      }

      return (await res.json()) as AnalyticsResponse;
    },
    enabled: !!storeId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Realtime: invalidate analytics when any order changes for this store
  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel(`analytics-rt-${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["analytics", storeId] });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [storeId, queryClient]);

  return query;
};
