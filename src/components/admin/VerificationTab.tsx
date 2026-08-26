import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, RotateCcw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminVerify } from "@/services/adminService";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface VerificationEntry {
  id: string;
  name: string;
  slug: string;
  seller_type: string | null;
  verification_status: string;
  registry_checked_at: string | null;
}

const VerificationTab = () => {
  const [entries, setEntries] = useState<VerificationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data: stores } = await supabase
      .from("stores")
      .select("id, name, slug, seller_type, verification_status, registry_checked_at")
      .not("verification_status", "eq", "verified")
      .order("registry_checked_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(50);
    setEntries((stores as VerificationEntry[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAction = async (storeId: string, action: "approve" | "reject" | "reset") => {
    setActingId(storeId);
    try {
      await adminVerify(storeId, action);
      toast.success(`${action}d`);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActingId(null);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      unverified: "bg-gray-500/10 text-gray-500",
      verified: "bg-green-500/10 text-green-500",
      mismatch: "bg-red-500/10 text-red-500",
      suspended: "bg-yellow-500/10 text-yellow-500",
      manual_review: "bg-blue-500/10 text-blue-500",
    };
    return map[status] ?? "bg-gray-500/10 text-gray-500";
  };

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Store</th>
            <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Type</th>
            <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Status</th>
            <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-xs">No pending verifications</td>
            </tr>
          ) : (
            entries.map((entry) => (
              <tr key={entry.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <div className="font-mono text-xs">{entry.name}</div>
                  <div className="text-[10px] text-muted-foreground">/{entry.slug}</div>
                </td>
                <td className="px-4 py-3 text-xs">
                  {entry.seller_type === "individual_entrepreneur" ? "ИП" : entry.seller_type === "legal_entity" ? "ТОО" : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-wider ${statusBadge(entry.verification_status)}`}>
                    {entry.verification_status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {entry.verification_status !== "verified" && (
                      <button onClick={() => handleAction(entry.id, "approve")} disabled={actingId === entry.id}
                        className="p-1.5 rounded-sm hover:bg-green-500/10 text-green-500 transition-colors" title="Approve">
                        {actingId === entry.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {entry.verification_status !== "mismatch" && (
                      <button onClick={() => handleAction(entry.id, "reject")} disabled={actingId === entry.id}
                        className="p-1.5 rounded-sm hover:bg-red-500/10 text-red-500 transition-colors" title="Reject">
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => handleAction(entry.id, "reset")} disabled={actingId === entry.id}
                      className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground transition-colors" title="Reset">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default VerificationTab;
