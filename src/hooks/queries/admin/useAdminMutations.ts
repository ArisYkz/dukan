import { useMutation, useQueryClient } from "@tanstack/react-query";
import { banStore, unbanStore, toggleStorePause, adminUpdateSubscription, adminRejectSubscription } from "@/services/adminService";
import { toast } from "sonner";

export const useAdminMutations = () => {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-stores"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const ban = useMutation({
    mutationFn: (storeId: string) => banStore(storeId),
    onSuccess: () => { toast.success("Store banned"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const unban = useMutation({
    mutationFn: (storeId: string) => unbanStore(storeId),
    onSuccess: () => { toast.success("Store unbanned"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePause = useMutation({
    mutationFn: ({ storeId, paused }: { storeId: string; paused: boolean }) => toggleStorePause(storeId, paused),
    onSuccess: () => { toast.success("Store pause toggled"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateSub = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: { plan_type?: string; subscription_status?: string; subscription_expiry?: string | null; role?: string } }) =>
      adminUpdateSubscription(userId, data),
    // Also refresh the affected user's own dashboard cache (plan limits read from it)
    onSuccess: (_res, { userId }) => { toast.success("Subscription updated"); invalidate(); qc.invalidateQueries({ queryKey: ["user-profile", userId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectSub = useMutation({
    mutationFn: (userId: string) => adminRejectSubscription(userId),
    onSuccess: () => { toast.success("Subscription rejected"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ban, unban, togglePause, updateSub, rejectSub };
};
