import { useQuery } from "@tanstack/react-query";
import { fetchUserStores } from "@/services/storeService";
import type { StoreRow } from "@/types/store";

export const useStoreQuery = (userId: string | undefined) =>
  useQuery({
    queryKey: ["dashboard-store", userId],
    queryFn: async () => {
      const stores = await fetchUserStores(userId!);
      if (!stores || stores.length === 0) return [];
      return stores as unknown as StoreRow[];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
