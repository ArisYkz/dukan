import {
  Palette, Package, ShoppingBag, Archive, Sparkles, CreditCard, Tag,
} from "lucide-react";
import { ARCHIVED_STATUSES, FREE_PRODUCT_LIMIT } from "@/lib/format";
import { useLabels } from "@/hooks/useLabels";

export type DashboardTab = "branding" | "products" | "orders" | "promo" | "archive" | "stats" | "billing";

interface DashboardTabsProps {
  tab: DashboardTab;
  setTab: (tab: DashboardTab) => void;
  productCount: number;
  activeOrderCount: number;
  archivedOrderCount: number;
  isPro: boolean;
}

const TAB_ICONS: Record<DashboardTab, React.ElementType> = {
  branding: Palette, products: Package, orders: ShoppingBag,
  promo: Tag, archive: Archive, stats: Sparkles, billing: CreditCard,
};

const DashboardTabs = ({ tab, setTab, productCount, activeOrderCount, archivedOrderCount, isPro }: DashboardTabsProps) => {
  const { DASHBOARD_TABS } = useLabels();

  // Show all tabs for everyone (promo & stats gated in Dashboard)
  const TAB_KEYS: DashboardTab[] = ["branding", "products", "orders", "promo", "archive", "stats", "billing"];

  const labelMap: Record<DashboardTab, string> = {
    branding: DASHBOARD_TABS.BRANDING, products: DASHBOARD_TABS.PRODUCTS,
    orders: DASHBOARD_TABS.ORDERS, promo: DASHBOARD_TABS.PROMO || "Promo Codes",
    archive: DASHBOARD_TABS.ARCHIVE,
    stats: DASHBOARD_TABS.STATS, billing: DASHBOARD_TABS.BILLING,
  };

  const badge = (key: DashboardTab): string => {
    if (key === "products") return ` (${productCount}${!isPro ? `/${FREE_PRODUCT_LIMIT}` : ""})`;
    if (key === "orders") return ` (${activeOrderCount})`;
    if (key === "archive") return ` (${archivedOrderCount})`;
    return "";
  };

  return (
    <div>
      <div className="flex gap-5 border-b border-border mb-6 overflow-x-auto scrollbar-hide">
        {TAB_KEYS.map((key) => {
          const Icon = TAB_ICONS[key];
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-3 text-sm tracking-wide uppercase transition-colors whitespace-nowrap ${
                tab === key ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4 inline mr-2" />
              {labelMap[key]}{badge(key)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardTabs;
