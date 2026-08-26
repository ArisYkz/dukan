import { useQuery } from "@tanstack/react-query";
import { fetchAllProfiles } from "@/services/adminService";

export const useAdminProfilesQuery = (search: string, page: number) =>
  useQuery({
    queryKey: ["admin-profiles", search, page],
    queryFn: () => fetchAllProfiles(search, page),
    staleTime: 15_000,
  });
