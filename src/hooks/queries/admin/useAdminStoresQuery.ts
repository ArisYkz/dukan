import { useQuery } from "@tanstack/react-query";
import { fetchAllStores } from "@/services/adminService";

export const useAdminStoresQuery = (search: string, page: number) =>
  useQuery({
    queryKey: ["admin-stores", search, page],
    queryFn: () => fetchAllStores(search, page),
    staleTime: 15_000,
  });
