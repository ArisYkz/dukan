import { Link } from "react-router-dom";
import { Copy, ExternalLink, Crown, Plus, Settings, LogOut, Shield } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageDropdown from "@/components/LanguageDropdown";
import { SidebarTrigger } from "@/components/ui/sidebar";
import StoreSelector from "@/components/dashboard/StoreSelector";
import dokanLogo from "@/assets/dokan-logo.webp";
import { toast } from "sonner";
import type { StoreRow } from "@/types/store";
import { useLabels } from "@/hooks/useLabels";

interface DashboardHeaderProps {
  store: StoreRow;
  stores: StoreRow[];
  currentStoreId: string;
  onStoreChange: (storeId: string) => void;
  onCreateStore: () => void;
  isPro: boolean;
  isAdmin: boolean;
  onLogout: () => void;
}

const DashboardHeader = ({ store, stores, currentStoreId, onStoreChange, onCreateStore, isPro, isAdmin, onLogout }: DashboardHeaderProps) => {
  const { MESSAGES } = useLabels();
  const copyStoreLink = () => {
    const url = `https://dokan.example.com/${store.slug}`;
    navigator.clipboard.writeText(url);
    toast.success(MESSAGES.LINK_COPIED, { className: "font-mono" });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border/20 backdrop-blur-md" style={{ backgroundColor: "hsl(var(--nav-bg) / 0.8)", color: "hsl(var(--nav-fg))" }}>
      <div className="container flex items-center justify-between h-14">
        <div className="flex items-center gap-1">
          <SidebarTrigger className="h-8 w-8 p-1.5 text-foreground/70 hover:text-foreground shrink-0 md:hidden" />
          <Link to="/">
            <img src={dokanLogo} alt="Dokan" className="h-7 dark:invert shrink-0" />
          </Link>
          {stores.length > 1 ? (
            <StoreSelector stores={stores} currentStoreId={currentStoreId} onSelect={onStoreChange} onCreateNew={onCreateStore} />
          ) : (
            <>
              <span className="font-mono text-lg hidden sm:inline">{store.name}</span>
              <button onClick={onCreateStore} className="p-2 rounded-sm transition-colors opacity-70 hover:opacity-100" title="Create new store">
                <Plus className="w-4 h-4" />
              </button>
            </>
          )}
          {store.is_verified && (
            <span className="text-xs tracking-[0.15em] uppercase px-2 py-1 rounded-sm hidden sm:inline" style={{ backgroundColor: "hsl(var(--nav-fg) / 0.12)", color: "hsl(var(--nav-fg) / 0.8)" }}>
              Verified
            </span>
          )}
          {isPro && (
            <span className="pro-badge">
              <Crown className="w-3 h-3" /> Pro
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={copyStoreLink} className="p-2 rounded-sm transition-colors opacity-70 hover:opacity-100" title="Copy store link">
            <Copy className="w-4 h-4" />
          </button>
          <a href={`/${store.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-sm transition-colors opacity-70 hover:opacity-100" title="View store">
            <ExternalLink className="w-4 h-4" />
          </a>
          <div className="hidden sm:block"><LanguageDropdown /></div>
          <ThemeToggle />
          {isAdmin && (
            <Link to="/admin" className="hidden sm:flex p-2 rounded-sm transition-colors text-primary hover:text-primary/80" title="Admin Panel">
              <Shield className="w-4 h-4" />
            </Link>
          )}
          <Link to="/settings" className="hidden sm:flex p-2 rounded-sm transition-colors opacity-70 hover:opacity-100" title="Settings">
            <Settings className="w-4 h-4" />
          </Link>
          <button onClick={onLogout} className="hidden sm:flex p-2 rounded-sm transition-colors opacity-70 hover:opacity-100" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
