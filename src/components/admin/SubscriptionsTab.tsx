import { useState } from "react";
import { useAdminSubscriptionsQuery } from "@/hooks/queries/admin/useAdminSubscriptionsQuery";
import { useAdminMutations } from "@/hooks/queries/admin/useAdminMutations";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Loader2, X } from "lucide-react";

const PLAN_LABELS: Record<string, string> = {
  pro_month: "Pro Monthly",
  pro_year: "Pro Yearly",
  free: "Free",
};

const PLAN_PRICES: Record<string, string> = {
  pro_month: "2,000 ৳/mo",
  pro_year: "150,000 ৳/yr",
};

const PLAN_EXPIRY_DAYS: Record<string, number> = {
  pro_month: 31,
  pro_year: 365,
};

const SubscriptionsTab = () => {
  const { data, isLoading } = useAdminSubscriptionsQuery();
  const { updateSub, rejectSub } = useAdminMutations();
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);

  const pending = data?.pending ?? [];
  const active = data?.active ?? [];

  const handleApprove = (userId: string, planType: string) => {
    const days = PLAN_EXPIRY_DAYS[planType] ?? 31;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    updateSub.mutate({
      userId,
      data: {
        plan_type: planType,
        subscription_status: "active",
        subscription_expiry: expiry.toISOString(),
      },
    });
    setConfirmUserId(null);
  };

  return (
    <div className="space-y-10">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-border p-5">
          <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">
            Pending
          </p>
          <p className="font-mono text-2xl">{pending.length}</p>
        </div>
        <div className="border border-border p-5">
          <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">
            Active Pro
          </p>
          <p className="font-mono text-2xl">{active.length}</p>
        </div>
        <div className="border border-border p-5">
          <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">
            Monthly Revenue
          </p>
          <p className="font-mono text-2xl">
            {active.filter((p: any) => p.plan_type === "pro_month").length * 2000 +
             active.filter((p: any) => p.plan_type === "pro_year").length * 12500}
            <span className="text-xs text-muted-foreground ml-1">৳</span>
          </p>
        </div>
      </div>

      {/* Pending Approvals */}
      <div>
        <h3 className="font-mono text-xs tracking-[0.2em] uppercase text-foreground/60 mb-4">
          Pending Approvals
        </h3>
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">User</th>
                <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Plan</th>
                <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Submitted</th>
                <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={5} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  </tr>
                ))
              ) : pending.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">No pending approvals</td>
                </tr>
              ) : (
                pending.map((profile: any) => (
                  <tr key={profile.user_id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs">{profile.display_name || "—"}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {PLAN_LABELS[profile.plan_type] ?? profile.plan_type}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {PLAN_PRICES[profile.plan_type] ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                      {profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {confirmUserId === profile.user_id ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground">Confirm?</span>
                          <button
                            onClick={() => handleApprove(profile.user_id, profile.plan_type)}
                            disabled={updateSub.isPending}
                            className="p-1.5 rounded-sm hover:bg-green-500/10 text-green-500 transition-colors"
                            title="Confirm Approve"
                          >
                            {updateSub.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => setConfirmUserId(null)}
                            className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={() => setConfirmUserId(profile.user_id)}
                            className="p-1.5 rounded-sm hover:bg-green-500/10 text-green-500 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => rejectSub.mutate(profile.user_id)}
                            disabled={rejectSub.isPending}
                            className="p-1.5 rounded-sm hover:bg-red-500/10 text-red-500 transition-colors"
                            title="Reject"
                          >
                            {rejectSub.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Subscriptions */}
      <div>
        <h3 className="font-mono text-xs tracking-[0.2em] uppercase text-foreground/60 mb-4">
          Active Pro Subscriptions
        </h3>
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">User</th>
                <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Plan</th>
                <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Expiry</th>
                <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={4} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  </tr>
                ))
              ) : active.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-xs">No active Pro subscriptions</td>
                </tr>
              ) : (
                active.map((profile: any) => {
                  const expired = profile.subscription_expiry && new Date(profile.subscription_expiry) < new Date();
                  return (
                    <tr key={profile.user_id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs">{profile.display_name || "—"}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{PLAN_LABELS[profile.plan_type] ?? profile.plan_type}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                        {profile.subscription_expiry
                          ? `${new Date(profile.subscription_expiry).toLocaleDateString()} ${expired ? "(expired)" : ""}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-wider ${
                          expired
                            ? "bg-red-500/10 text-red-500"
                            : "bg-green-500/10 text-green-500"
                        }`}>
                          {expired ? "Expired" : "Active"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionsTab;
