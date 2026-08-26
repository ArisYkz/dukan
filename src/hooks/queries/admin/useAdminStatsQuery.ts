import { useQuery } from "@tanstack/react-query";
import { fetchAdminStats } from "@/services/adminService";

export const useAdminStatsQuery = () =>
  useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchAdminStats,
    staleTime: 30_000,
  });
