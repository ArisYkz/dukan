import { useState } from "react";
import { useAdminOrdersQuery } from "@/hooks/queries/admin/useAdminOrdersQuery";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { formatPrice } from "@/lib/format";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = ["all", "new", "awaiting_verification", "paid_confirmed", "shipped", "delivered", "returned", "refunded", "cancelled", "payment_rejected"];

const OrdersTab = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const { data, isLoading } = useAdminOrdersQuery(search, status, page);

  const orders = data?.orders ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      new: "bg-blue-500/10 text-blue-500",
      awaiting_verification: "bg-yellow-500/10 text-yellow-500",
      paid_confirmed: "bg-green-500/10 text-green-500",
      shipped: "bg-purple-500/10 text-purple-500",
      delivered: "bg-emerald-500/10 text-emerald-500",
      returned: "bg-sky-500/10 text-sky-500",
      refunded: "bg-teal-500/10 text-teal-500",
      cancelled: "bg-red-500/10 text-red-500",
      payment_rejected: "bg-orange-500/10 text-orange-500",
    };
    return map[s] ?? "bg-gray-500/10 text-gray-500";
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by order ID, customer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full border border-border bg-background pl-10 pr-4 py-2.5 font-mono text-xs outline-none focus:border-foreground/40 transition-colors"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          className="border border-border bg-background px-3 py-2.5 font-mono text-xs outline-none"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Order ID</th>
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Store</th>
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Customer</th>
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Total</th>
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td colSpan={6} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">No orders found</td>
              </tr>
            ) : (
              orders.map((o: any) => (
                <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-[10px]">{o.public_order_id}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{o.stores?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">{o.customer_name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatPrice(o.total_price)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-wider ${statusBadge(o.status)}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString()}
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
    </div>
  );
};

export default OrdersTab;
