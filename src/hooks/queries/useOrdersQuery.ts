import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchStoreOrdersWithContacts } from "@/services/orderService";
import type { OrderRow } from "@/types/store";

export const useOrdersQuery = (storeId: string | undefined, pageSize: number = 20) => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const query = useQuery({
    queryKey: ["dashboard-orders", storeId, currentPage],
    queryFn: async () => {
      const offset = (currentPage - 1) * pageSize;
      const orders = await fetchStoreOrdersWithContacts(storeId!, offset, pageSize);
      return orders.map((row: any) => ({
        ...row,
        public_order_id: row.public_order_id || row.id,
      })) as OrderRow[];
    },
    enabled: !!storeId,
    staleTime: 30_000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel(`orders-rt-${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` },
        (payload) => {
          // Update all pages in the cache so optimistic UI works on every page
          queryClient.setQueriesData<OrderRow[]>({ queryKey: ["dashboard-orders", storeId] }, (prev) => {
            if (!prev) return prev;
            if (payload.eventType === "INSERT") {
              const newOrder = { ...(payload.new as unknown as OrderRow), order_items: [] } as OrderRow;
              return [newOrder, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const updated = payload.new as unknown as OrderRow;
              return prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o));
            }
            return prev;
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [storeId, queryClient]);

  // Optimistic helpers
  const updateOrderOptimistic = useCallback(
    (orderId: string, newStatus: string) => {
      queryClient.setQueryData<OrderRow[]>(["dashboard-orders", storeId, currentPage], (prev) =>
        prev?.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
    },
    [storeId, currentPage, queryClient],
  );

  const rollbackOrder = useCallback(
    (orderId: string, oldStatus: string) => {
      queryClient.setQueryData<OrderRow[]>(["dashboard-orders", storeId, currentPage], (prev) =>
        prev?.map((o) => (o.id === orderId ? { ...o, status: oldStatus } : o)),
      );
    },
    [storeId, currentPage, queryClient],
  );

  return { ...query, updateOrderOptimistic, rollbackOrder, currentPage, setCurrentPage };
};
