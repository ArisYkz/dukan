import { useQuery } from "@tanstack/react-query";
import { fetchUsersWithStores } from "@/services/adminService";

export const useAdminUsersQuery = (search: string, page: number) =>
  useQuery({
    queryKey: ["admin-users", search, page],
    queryFn: () => fetchUsersWithStores(search, page),
    staleTime: 15_000,
  });
