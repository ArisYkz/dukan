import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditEntry {
  id: string;
  store_id: string;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  created_at: string;
  stores?: { name: string } | null;
}

const AuditLogTab = () => {
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("verification_audit_log")
      .select("id, store_id, action, previous_status, new_status, created_at, stores(name)")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => { setAuditLog((data as AuditEntry[]) ?? []); setLoading(false); });
  }, []);

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Date</th>
            <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Store</th>
            <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Action</th>
            <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Status Change</th>
          </tr>
        </thead>
        <tbody>
          {auditLog.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-xs">No audit entries yet</td>
            </tr>
          ) : (
            auditLog.map((entry) => (
              <tr key={entry.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 font-mono text-[10px] text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 font-mono text-[10px]">
                  {entry.stores?.name || entry.store_id.slice(0, 8) + "..."}
                </td>
                <td className="px-4 py-2 text-[10px]">{entry.action}</td>
                <td className="px-4 py-2 font-mono text-[10px]">
                  {entry.previous_status || "—"} → {entry.new_status || "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AuditLogTab;
