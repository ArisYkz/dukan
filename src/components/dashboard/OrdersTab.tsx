import React, { useState } from "react";
import { Search, Download, Plus, Lock } from "lucide-react";
import type { OrderRow } from "@/types/store";
import { formatPrice, statusLabel, statusColor, filterStatuses, type OrderFilter } from "@/lib/format";
import OrderCard from "./OrderCard";
import { useLabels } from "@/hooks/useLabels";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Pagination } from "@/components/ui/pagination";

interface OrdersTabProps {
  orders: OrderRow[];
  filteredOrders: OrderRow[];
  orderFilter: OrderFilter;
  setOrderFilter: (filter: OrderFilter) => void;
  orderSearch: string;
  setOrderSearch: (search: string) => void;
  onStatusChange: (orderId: string, newStatus: string) => void;
  onCancelConfirm: (orderId: string, newStatus: string) => void;
  onArchive: (orderId: string) => void;
  onExportCSV: () => void;
  onCreateOrder?: () => void;
  revenueLimitReached?: boolean;
  isPro?: boolean;
}

const OrdersTab = React.memo(({ orders, filteredOrders, orderFilter, setOrderFilter, orderSearch, setOrderSearch, onStatusChange, onCancelConfirm, onArchive, onExportCSV, onCreateOrder, revenueLimitReached, isPro = false }: OrdersTabProps) => {
  const { ORDERS_TAB, MANUAL_ORDER, ORDER_FILTER_LABELS } = useLabels();

  const ORDER_FILTERS: { key: OrderFilter; label: string }[] = [
    { key: "all", label: ORDER_FILTER_LABELS.all || "All" },
    { key: "new", label: ORDER_FILTER_LABELS.new || "New" },
    { key: "payment", label: ORDER_FILTER_LABELS.payment || "Payment" },
    { key: "shipped", label: ORDER_FILTER_LABELS.shipped || "Shipped" },
  ];

  const [currentPage, setCurrentPage] = useState(1);

  // Memoize filter counts to avoid recomputing on every render
  const filterCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of ORDER_FILTERS) {
      counts[f.key] = orders.filter((order) => filterStatuses[f.key].includes(order.status)).length;
    }
    return counts;
  }, [orders]);

  const csvButton = (
    <button
      onClick={isPro ? onExportCSV : undefined}
      disabled={!isPro}
      className={`flex items-center gap-1.5 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border border-border rounded-sm transition-colors ${
        isPro
          ? "hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
          : "opacity-50 cursor-not-allowed text-muted-foreground"
      }`}
    >
      {isPro ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3" />}
      <span className="hidden md:inline">CSV</span>
    </button>
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-3 md:mb-6">
        <h2 className="text-xs md:text-xl font-semibold tracking-[0.2em] uppercase text-foreground opacity-90">{ORDERS_TAB.TITLE}</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder={ORDERS_TAB.SEARCH_PLACEHOLDER} className="pl-7 md:pl-8 pr-2 md:pr-3 py-1.5 md:py-2 text-xs md:text-sm border border-border bg-transparent rounded-sm focus:outline-none focus:ring-2 focus:ring-ring w-36 md:w-48" />
          </div>
          {isPro ? (
            csvButton
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>{csvButton}</TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px] text-center">
                <p className="text-xs">{ORDERS_TAB.CSV_PRO_TOOLTIP || "Get your tax-ready report instantly with Dokan PRO."}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {onCreateOrder && (
            <button onClick={onCreateOrder} className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm bg-primary text-primary-foreground rounded-sm hover:opacity-90 transition-opacity">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{MANUAL_ORDER.TITLE}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-3 md:mb-6 overflow-x-auto pb-1">
        {ORDER_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setOrderFilter(f.key)}
            className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs tracking-wide uppercase rounded-sm whitespace-nowrap transition-colors ${
              orderFilter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
            <span className="ml-1 opacity-60">({filterCounts[f.key]})</span>
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          {orderSearch ? ORDERS_TAB.NO_SEARCH_RESULTS : ORDERS_TAB.NO_ORDERS}
        </p>
      ) : (
        <div className="space-y-2 md:space-y-4">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} variant="active" onStatusChange={onStatusChange} onCancelConfirm={onCancelConfirm} onArchive={onArchive} revenueLimitReached={revenueLimitReached} />
          ))}
        </div>
      )}
      {filteredOrders.length > 0 && (
        <div className="mt-3 md:mt-6">
          <Pagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            totalItems={filteredOrders.length}
            itemsPerPage={20}
          />
        </div>
      )}
    </div>
  );
});

OrdersTab.displayName = "OrdersTab";

export default OrdersTab;