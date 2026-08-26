import { useQuery } from "@tanstack/react-query";
import { fetchAllProducts } from "@/services/adminService";

export const useAdminProductsQuery = (search: string, page: number) =>
  useQuery({
    queryKey: ["admin-products", search, page],
    queryFn: () => fetchAllProducts(search, page),
    staleTime: 15_000,
  });
