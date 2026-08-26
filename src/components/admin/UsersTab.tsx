import { useState, useEffect } from "react";
import { useAdminUsersQuery } from "@/hooks/queries/admin/useAdminUsersQuery";
import { useAdminMutations } from "@/hooks/queries/admin/useAdminMutations";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, PenSquare, Loader2 } from "lucide-react";
import { getStoreIinBin } from "@/services/bridgeService";

const PAGE_SIZE = 20;

const PLAN_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "pro_month", label: "Pro Monthly" },
  { value: "pro_year", label: "Pro Yearly" },
];

const STATUS_OPTIONS = [
  { value: "none", label: "None" },
  { value: "pre_authorized", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "banned", label: "Banned" },
];

interface EditDialogProps {
  profile: any;
  onClose: () => void;
  onSave: (userId: string, data: any) => void;
  onVerifyChange: (storeId: string, status: string) => void;
}

const EditDialog = ({ profile, onClose, onSave, onVerifyChange }: EditDialogProps) => {
  const [planType, setPlanType] = useState(profile.plan_type || "free");
  const [subStatus, setSubStatus] = useState(profile.subscription_status || "none");
  const [role, setRole] = useState(profile.role || "user");
  const [expiryDate, setExpiryDate] = useState(
    profile.subscription_expiry
      ? new Date(profile.subscription_expiry).toISOString().slice(0, 10)
      : ""
  );
  const [verifyStatus, setVerifyStatus] = useState(profile.store?.verification_status || "unverified");

  const handleSave = () => {
    onSave(profile.user_id, {
      plan_type: planType,
      subscription_status: subStatus,
      role,
      subscription_expiry: expiryDate ? new Date(expiryDate).toISOString() : null,
    });
    if (profile.store?.id && verifyStatus !== profile.store?.verification_status) {
      onVerifyChange(profile.store.id, verifyStatus);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="bg-background border border-border p-8 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-mono text-xs tracking-[0.2em] uppercase text-foreground/80">Edit User</h3>
          <button onClick={onClose} className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground hover:text-foreground">Close</button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">Store</p>
            <p className="font-mono text-sm">{profile.store?.name || "—"}</p>
          </div>

          <div>
            <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full border border-border bg-background px-3 py-2.5 font-mono text-xs outline-none focus:border-foreground/40 transition-colors">
              {[{ value: "user", label: "User" }, { value: "admin", label: "Admin" }].map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5">Plan</label>
            <select value={planType} onChange={(e) => setPlanType(e.target.value)}
              className="w-full border border-border bg-background px-3 py-2.5 font-mono text-xs outline-none focus:border-foreground/40 transition-colors">
              {PLAN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5">Subscription Status</label>
            <select value={subStatus} onChange={(e) => setSubStatus(e.target.value)}
              className="w-full border border-border bg-background px-3 py-2.5 font-mono text-xs outline-none focus:border-foreground/40 transition-colors">
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5">Expiry</label>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full border border-border bg-background px-3 py-2.5 font-mono text-xs outline-none focus:border-foreground/40 transition-colors" />
          </div>

          {profile.store?.id && (
            <div>
              <label className="block font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5">Verification</label>
              <select value={verifyStatus} onChange={(e) => setVerifyStatus(e.target.value)}
                className="w-full border border-border bg-background px-3 py-2.5 font-mono text-xs outline-none focus:border-foreground/40 transition-colors">
                {[{ value: "unverified", label: "Unverified" }, { value: "verified", label: "Verified" }, { value: "mismatch", label: "Mismatch" }, { value: "suspended", label: "Suspended" }, { value: "manual_review", label: "Manual Review" }].map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={handleSave}
              className="flex-1 bg-foreground text-background py-3 font-mono text-[10px] tracking-[0.2em] uppercase hover:opacity-90 transition-opacity">
              Save
            </button>
            <button onClick={onClose}
              className="flex-1 border border-border py-3 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const UsersTab = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editProfile, setEditProfile] = useState<any | null>(null);
  const { data, isLoading } = useAdminUsersQuery(search, page);
  const { updateSub, updateVerification } = useAdminMutations();

  const users = data?.users ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const [iinBinMap, setIinBinMap] = useState<Record<string, string | null>>({});
  const [readingIinBins, setReadingIinBins] = useState(false);

  // Fetch IIN/BIN from bridge for verified stores
  useEffect(() => {
    const verified = users
      .map((u: any) => u.store)
      .filter((s: any) => s?.verification_status === "verified");
    if (verified.length === 0) return;

    setReadingIinBins(true);
    Promise.all(
      verified.map(async (store: any) => {
        try {
          const bin = await getStoreIinBin(store.id);
          return { storeId: store.id, iinBin: bin };
        } catch {
          return { storeId: store.id, iinBin: null };
        }
      }),
    ).then((results) => {
      const map: Record<string, string | null> = {};
      results.forEach((r) => { map[r.storeId] = r.iinBin; });
      setIinBinMap((prev) => ({ ...prev, ...map }));
    }).finally(() => setReadingIinBins(false));
  }, [users]);

  const handleSave = (userId: string, updates: any) => {
    const expiry = updates.subscription_expiry
      ? new Date(new Date(updates.subscription_expiry).setHours(23, 59, 59, 999)).toISOString()
      : null;
    updateSub.mutate({ userId, data: { ...updates, subscription_expiry: expiry } });
    setEditProfile(null);
  };

  const handleVerifyChange = (storeId: string, status: string) => {
    updateVerification.mutate({ storeId, status });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      none: "bg-gray-500/10 text-gray-500",
      pre_authorized: "bg-yellow-500/10 text-yellow-500",
      active: "bg-green-500/10 text-green-500",
      banned: "bg-red-500/10 text-red-500",
    };
    return map[status] ?? "bg-gray-500/10 text-gray-500";
  };

  const verifyBadge = () => "bg-green-500/10 text-green-500";

  const planBadge = (plan: string) => {
    if (plan === "pro_month" || plan === "pro_year") return "bg-foreground/10 text-foreground";
    return "bg-gray-500/10 text-gray-500";
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by store name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full border border-border bg-background pl-10 pr-4 py-2.5 font-mono text-xs outline-none focus:border-foreground/40 transition-colors"
        />
      </div>

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Store</th>
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Email</th>
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">БИН/ИИН</th>
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Verified</th>
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Plan</th>
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Expires</th>
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td colSpan={8} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-xs">No users found</td>
              </tr>
            ) : (
              users.map((u: any) => (
                <tr key={u.user_id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">
                    {u.store?.name || u.display_name || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                    {u.email || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                    {u.store?.verification_status === "verified"
                      ? (iinBinMap[u.store.id] ?? <Loader2 className="w-3 h-3 animate-spin inline-block" />)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {u.store?.verification_status === "verified" ? (
                      <span className={`inline-block px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-wider ${verifyBadge()}`}>
                        Verified
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.plan_type === "pro_month" || u.plan_type === "pro_year" ? (
                      <span className={`inline-block px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-wider ${planBadge(u.plan_type)}`}>
                        {u.plan_type === "pro_month" ? "Pro Monthly" : "Pro Yearly"}
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-wider ${statusBadge(u.subscription_status)}`}>
                      {u.subscription_status === "pre_authorized" ? "Pending" : u.subscription_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                    {u.subscription_expiry
                      ? new Date(u.subscription_expiry).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setEditProfile(u)}
                      className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground transition-colors"
                      title="Edit User">
                      <PenSquare className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
            className="font-mono text-[10px] tracking-wider uppercase px-3 py-1.5 border border-border hover:bg-muted disabled:opacity-30">Prev</button>
          <span className="font-mono text-[10px] text-muted-foreground">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="font-mono text-[10px] tracking-wider uppercase px-3 py-1.5 border border-border hover:bg-muted disabled:opacity-30">Next</button>
        </div>
      )}

      {editProfile && (
        <EditDialog profile={editProfile} onClose={() => setEditProfile(null)} onSave={handleSave} onVerifyChange={handleVerifyChange} />
      )}
    </div>
  );
};

export default UsersTab;