import { useState } from "react";
import { useAdminProductsQuery } from "@/hooks/queries/admin/useAdminProductsQuery";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { formatPrice } from "@/lib/format";

const PAGE_SIZE = 20;

const ProductsTab = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const { data, isLoading } = useAdminProductsQuery(search, page);

  const products = data?.products ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full border border-border bg-background pl-10 pr-4 py-2.5 font-mono text-xs outline-none focus:border-foreground/40 transition-colors"
        />
      </div>

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Product</th>
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Store</th>
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Price</th>
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Stock</th>
              <th className="text-left px-4 py-2 text-[10px] tracking-wider uppercase text-muted-foreground">Active</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td colSpan={5} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">No products found</td>
              </tr>
            ) : (
              products.map((p: any) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                    {p.stores?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{formatPrice(p.price)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.stock}</td>
                  <td className="px-4 py-3 text-[10px]">{p.is_active ? "Yes" : "No"}</td>
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

export default ProductsTab;
