import { Search } from "lucide-react";
import type { OrderRow } from "@/types/store";
import OrderCard from "./OrderCard";
import { useLabels } from "@/hooks/useLabels";

interface ArchiveTabProps {
  archivedOrders: OrderRow[];
  archiveSearch: string;
  setArchiveSearch: (search: string) => void;
}

const ArchiveTab = ({ archivedOrders, archiveSearch, setArchiveSearch }: ArchiveTabProps) => {
  const { ARCHIVE_TAB, ORDERS_TAB } = useLabels();
  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-3 md:mb-6">
        <h2 className="text-xs md:text-xl font-semibold tracking-[0.2em] uppercase text-foreground opacity-90">{ARCHIVE_TAB.TITLE}</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={archiveSearch} onChange={(e) => setArchiveSearch(e.target.value)} placeholder={ORDERS_TAB.SEARCH_PLACEHOLDER} className="pl-8 pr-3 py-1.5 md:py-2 text-xs md:text-sm border border-border bg-transparent rounded-sm focus:outline-none focus:ring-2 focus:ring-ring w-full max-w-48 md:w-64" />
        </div>
      </div>

      {archivedOrders.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          {archiveSearch ? ARCHIVE_TAB.NO_SEARCH_RESULTS : ARCHIVE_TAB.NO_ARCHIVED}
        </p>
      ) : (
        <div className="space-y-2 md:space-y-3">
          {archivedOrders.map((order) => (
            <OrderCard key={order.id} order={order} variant="archived" />
          ))}
        </div>
      )}
    </div>
  );
};

export default ArchiveTab;
