import {
  Palette, Package, ShoppingBag, Archive, Sparkles, CreditCard, Tag,
  Settings, LogOut,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuBadge, SidebarHeader,
} from "@/components/ui/sidebar";
import type { DashboardTab } from "@/components/dashboard/DashboardTabs";
import { FREE_PRODUCT_LIMIT } from "@/lib/format";
import { useLabels } from "@/hooks/useLabels";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import dukenLogo from "@/assets/duken-logo.webp";
import { Link } from "react-router-dom";

const LANG_OPTIONS: { value: Language; label: string }[] = [
  { value: "bn", label: "BN" },
  { value: "en", label: "EN" },
];

interface DashboardSidebarProps {
  tab: DashboardTab;
  setTab: (tab: DashboardTab) => void;
  productCount: number;
  activeOrderCount: number;
  archivedOrderCount: number;
  isPro: boolean;
  onLogout: () => void;
}

const TAB_ICONS: Record<DashboardTab, React.ElementType> = {
  branding: Palette, products: Package, orders: ShoppingBag,
  promo: Tag, archive: Archive, stats: Sparkles, billing: CreditCard,
};

const TAB_KEYS: DashboardTab[] = [
  "branding", "products", "orders", "promo", "archive", "stats", "billing",
];

const DashboardSidebar = ({
  tab, setTab, productCount, activeOrderCount, archivedOrderCount, isPro, onLogout,
}: DashboardSidebarProps) => {
  const { DASHBOARD_TABS } = useLabels();
  const { language, setLanguage } = useLanguage();

  const labelMap: Record<DashboardTab, string> = {
    branding: DASHBOARD_TABS.BRANDING, products: DASHBOARD_TABS.PRODUCTS,
    orders: DASHBOARD_TABS.ORDERS, promo: DASHBOARD_TABS.PROMO || "Promo",
    archive: DASHBOARD_TABS.ARCHIVE,
    stats: DASHBOARD_TABS.STATS, billing: DASHBOARD_TABS.BILLING,
  };

  const badgeCount = (key: DashboardTab): number | null => {
    if (key === "orders") return activeOrderCount || null;
    if (key === "archive") return archivedOrderCount || null;
    return null;
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r-0">
      {/* Logo area — minimal, breathing */}
      <SidebarHeader className="px-0 pt-0">
        <Link to="/" className="flex items-center gap-2.5 px-4 pt-5 pb-6 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
          <img src={dukenLogo} alt="Dukan" className="h-5 dark:invert shrink-0" />
          <span className="font-mono text-xs tracking-[0.25em] uppercase text-foreground/50 group-data-[collapsible=icon]:hidden">
            Duken
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {TAB_KEYS.map((key) => {
                const Icon = TAB_ICONS[key];
                const badge = badgeCount(key);
                const isActive = tab === key;
                const needsProGate = !isPro && (key === "promo" || key === "stats");

                return (
                  <SidebarMenuItem key={key} className="relative">
                    {/* Active indicator — thin left line */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-foreground" />
                    )}
                    <SidebarMenuButton
                      onClick={() => setTab(key)}
                      isActive={isActive}
                      size="lg"
                      className="group rounded-none data-[active=true]:bg-transparent hover:bg-transparent active:bg-transparent"
                      tooltip={labelMap[key]}
                    >
                      <Icon
                        strokeWidth={1.5}
                        className={`w-[18px] h-[18px] shrink-0 transition-opacity duration-500 ${isActive ? "opacity-100" : "opacity-50 group-hover:opacity-80"}`}
                      />
                      <span
                        className={`font-mono text-xs md:text-sm tracking-[0.18em] uppercase transition-opacity duration-500 ${isActive ? "opacity-100" : "opacity-50 group-hover:opacity-80"}`}
                      >
                        {labelMap[key]}
                      </span>
                      {needsProGate && (
                        <span className="ml-auto font-mono text-[10px] tracking-[0.2em] uppercase border border-foreground/20 text-foreground/35 px-1.5 py-[1px] group-data-[collapsible=icon]:hidden transition-opacity duration-500 group-hover:opacity-70">
                          Pro
                        </span>
                      )}
                      {!needsProGate && badge != null && (
                        <SidebarMenuBadge className="font-mono text-xs tracking-wider opacity-50 transition-opacity duration-500">
                          {badge}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Product count — quiet footnote */}
        <SidebarGroup className="mt-2">
          <SidebarGroupContent>
            <div className="px-4 py-2 group-data-[collapsible=icon]:hidden">
              <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground/30">
                Products
              </p>
              <p className="font-mono text-xs tracking-wider text-foreground/40 mt-0.5">
                {productCount}{!isPro ? ` / ${FREE_PRODUCT_LIMIT}` : ""}
              </p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Language toggle */}
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="px-4 py-2 group-data-[collapsible=icon]:hidden">
              <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground/30 mb-2">
                Language
              </p>
              <div className="flex gap-1.5">
                {LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLanguage(opt.value)}
                    className={`px-2.5 py-1 text-[10px] font-mono tracking-wider rounded-none border transition-colors ${
                      language === opt.value
                        ? "bg-foreground text-background border-foreground"
                        : "border-border/30 text-foreground/40 hover:text-foreground/70 hover:border-foreground/20"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer — settings, logout, tagline */}
      <SidebarFooter className="pb-6">
        <div className="space-y-1 px-3">
          <Link
            to="/settings"
            className="flex items-center gap-2.5 px-1 py-2 text-foreground/50 hover:text-foreground transition-colors duration-300 rounded-none"
          >
            <Settings strokeWidth={1.5} className="w-[18px] h-[18px] shrink-0" />
            <span className="font-mono text-xs md:text-sm tracking-[0.18em] uppercase">Settings</span>
          </Link>
          <button
            onClick={onLogout}
            className="flex items-center gap-2.5 px-1 py-2 text-foreground/50 hover:text-foreground transition-colors duration-300 rounded-none w-full text-left"
          >
            <LogOut strokeWidth={1.5} className="w-[18px] h-[18px] shrink-0" />
            <span className="font-mono text-xs md:text-sm tracking-[0.18em] uppercase">Log Out</span>
          </button>
        </div>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/15 px-4 leading-relaxed mt-3">
          For local<br />entrepreneurs
        </p>
      </SidebarFooter>
    </Sidebar>
  );
};

export default DashboardSidebar;
