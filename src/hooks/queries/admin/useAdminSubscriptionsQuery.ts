import { useQuery } from "@tanstack/react-query";
import { fetchPendingSubscriptions, fetchActiveSubscriptions } from "@/services/adminService";

export const useAdminSubscriptionsQuery = () =>
  useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const [pending, active] = await Promise.all([
        fetchPendingSubscriptions(),
        fetchActiveSubscriptions(),
      ]);
      return { pending, active };
    },
    staleTime: 15_000,
  });
