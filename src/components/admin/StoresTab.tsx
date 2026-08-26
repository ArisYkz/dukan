import { useState } from "react";
import { useAdminStoresQuery } from "@/hooks/queries/admin/useAdminStoresQuery";
import { useAdminMutations } from "@/hooks/queries/admin/useAdminMutations";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Ban, CheckCircle, Pause, Play, Package, ShoppingCart, X, ExternalLink } from "lucide-react";
import { fetchStoreProducts, fetchStoreOrders } from "@/services/adminService";
import { formatPrice } from "@/lib/format";

interface StoresTabProps {
  onSelectStore: (storeId: string) => void;
}

const PAGE_SIZE = 20;

const StoresTab = ({ onSelectStore }: StoresTabProps) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const { data, isLoading } = useAdminStoresQuery(search, page);
  const { ban, unban, togglePause } = useAdminMutations();
  const [productsForStore, setProductsForStore] = useState<{ id: string; name: string } | null>(null);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [ordersForStore, setOrdersForStore] = useState<{ id: string; name: string } | null>(null);
  const [storeOrders, setStoreOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const stores = data?.stores ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

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

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search stores..."
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
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Slug</th>
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Verify</th>
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Paused</th>
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td colSpan={6} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                </tr>
              ))
            ) : stores.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">No stores found</td>
              </tr>
            ) : (
              stores.map((s: any) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <button onClick={() => onSelectStore(s.id)} className="font-mono text-xs text-left hover:underline">
                      {s.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">/{s.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-wider ${statusBadge(s.verification_status)}`}>
                      {s.verification_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-wider ${s.subscription_status === "banned" ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}>
                      {s.subscription_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[10px]">{s.is_paused ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={async () => {
                          setProductsForStore({ id: s.id, name: s.name });
                          setLoadingProducts(true);
                          const products = await fetchStoreProducts(s.id);
                          setStoreProducts(products);
                          setLoadingProducts(false);
                        }}
                        className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground transition-colors"
                        title="View Products"
                      >
                        <Package className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          setOrdersForStore({ id: s.id, name: s.name });
                          setLoadingOrders(true);
                          const orders = await fetchStoreOrders(s.id);
                          setStoreOrders(orders);
                          setLoadingOrders(false);
                        }}
                        className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground transition-colors"
                        title="View Orders"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>
                      {s.subscription_status === "banned" ? (
                        <button onClick={() => unban.mutate(s.id)} className="p-1.5 rounded-sm hover:bg-green-500/10 text-green-500" title="Unban">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button onClick={() => ban.mutate(s.id)} className="p-1.5 rounded-sm hover:bg-red-500/10 text-red-500" title="Ban">
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => togglePause.mutate({ storeId: s.id, paused: !s.is_paused })}
                        className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground"
                        title={s.is_paused ? "Unpause" : "Pause"}
                      >
                        {s.is_paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="font-mono text-[10px] tracking-wider uppercase px-3 py-1.5 border border-border hover:bg-muted disabled:opacity-30"
          >
            Prev
          </button>
          <span className="font-mono text-[10px] text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="font-mono text-[10px] tracking-wider uppercase px-3 py-1.5 border border-border hover:bg-muted disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}

      {/* Products modal */}
      {productsForStore && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
          <div className="bg-background border border-border max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-mono text-xs tracking-[0.2em] uppercase text-foreground/80">
                Products — {productsForStore.name}
              </h3>
              <button onClick={() => setProductsForStore(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              {loadingProducts ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : storeProducts.length === 0 ? (
                <p className="text-center text-muted-foreground text-xs font-mono py-8">No products</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-3 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Name</th>
                      <th className="text-left px-3 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Price</th>
                      <th className="text-left px-3 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Stock</th>
                      <th className="text-left px-3 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storeProducts.map((p: any) => (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2.5 font-mono text-xs">{p.name}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{formatPrice(p.price)}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{p.stock}</td>
                        <td className="px-3 py-2.5 text-[10px]">{p.is_active ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Orders modal */}
      {ordersForStore && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
          <div className="bg-background border border-border max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-mono text-xs tracking-[0.2em] uppercase text-foreground/80">
                Orders — {ordersForStore.name}
              </h3>
              <button onClick={() => setOrdersForStore(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              {loadingOrders ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : storeOrders.length === 0 ? (
                <p className="text-center text-muted-foreground text-xs font-mono py-8">No orders</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-3 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Order</th>
                      <th className="text-left px-3 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Status</th>
                      <th className="text-left px-3 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Amount</th>
                      <th className="text-left px-3 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Customer</th>
                      <th className="text-left px-3 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Date</th>
                      <th className="text-left px-3 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Track</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storeOrders.map((o: any) => (
                      <tr key={o.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2.5 font-mono text-[10px]">#{o.public_order_id}</td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-[10px] uppercase tracking-wider">{o.status}</span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs">{formatPrice(o.total_price)}</td>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">{o.customer_name || o.customer_phone || "—"}</td>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2.5">
                          {o.kazpost_barcode ? (
                            <a
                              href={`/track/${o.kazpost_barcode}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-mono text-primary hover:underline"
                            >
                              Track <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoresTab;
