import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { User } from "lucide-react";
import dokanLogo from "@/assets/dokan-logo.webp";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import LanguageDropdown from "@/components/LanguageDropdown";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const LandingNavbar = () => {
  const location = useLocation();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border/20 backdrop-blur-md" style={{ backgroundColor: "hsl(var(--nav-bg) / 0.8)", color: "hsl(var(--nav-fg))" }}>
      <div className="container flex items-center justify-between h-14">
        <Link to="/" className="flex items-center group">
          <img src={dokanLogo} alt="Dokan" className="h-8 dark:invert" />
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          {isMobile ? <LanguageDropdown /> : <LanguageToggle />}
          <ThemeToggle />
          <Link to={user ? "/dashboard" : "/auth"} className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-mono tracking-wide uppercase rounded-sm border border-foreground/20 hover:bg-foreground/5 transition-colors">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">{user ? "Dashboard" : t("LANDING", "LOGIN_SIGNUP")}</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default LandingNavbar;
