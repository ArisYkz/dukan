import { useQuery } from "@tanstack/react-query";
import { fetchAllOrders } from "@/services/adminService";

export const useAdminOrdersQuery = (search: string, status: string, page: number) =>
  useQuery({
    queryKey: ["admin-orders", search, status, page],
    queryFn: () => fetchAllOrders(search, status, page),
    staleTime: 15_000,
  });
