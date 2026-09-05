import { Instagram, Mail, Phone } from "lucide-react";
import { useLabels } from "@/hooks/useLabels";
import { SUPPORT_EMAIL, SUPPORT_INSTAGRAM, SUPPORT_PHONE } from "@/constants/business";
import dokanLogo from "@/assets/dokan-logo.webp";

const LandingFooter = () => {
  const { LANDING } = useLabels();

  return (
    <footer className="py-12 md:py-16" style={{ backgroundColor: "hsl(var(--footer-bg))", color: "hsl(var(--footer-fg))" }}>
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <img src={dokanLogo} alt="Dokan" className="h-7 invert" />
            <p className="font-body text-xs mt-1" style={{ color: "hsl(var(--footer-fg) / 0.6)" }}>Made with ❤️ in Dhaka, Bangladesh</p>
            <p className="font-mono text-[10px] tracking-wider mt-1 uppercase" style={{ color: "hsl(var(--footer-fg) / 0.4)" }}>Your brand, your link, anywhere.</p>
          </div>
          <nav className="flex items-center gap-8">
            <a href="/auth" className="font-mono text-xs tracking-wider transition-colors" style={{ color: "hsl(var(--footer-fg) / 0.6)" }} onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(var(--footer-fg))")} onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(var(--footer-fg) / 0.6)")}>{LANDING.LOGIN}</a>
            <a href="/auth" className="font-mono text-xs tracking-wider transition-colors" style={{ color: "hsl(var(--footer-fg) / 0.6)" }} onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(var(--footer-fg))")} onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(var(--footer-fg) / 0.6)")}>{LANDING.SIGN_UP}</a>
            <div className="flex items-center gap-3">
              <a href={SUPPORT_INSTAGRAM} target="_blank" rel="noopener noreferrer" className="transition-colors" style={{ color: "hsl(var(--footer-fg) / 0.6)" }} onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(var(--footer-fg))")} onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(var(--footer-fg) / 0.6)")}><Instagram className="w-4 h-4" /></a>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="transition-colors" style={{ color: "hsl(var(--footer-fg) / 0.6)" }} onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(var(--footer-fg))")} onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(var(--footer-fg) / 0.6)")}><Mail className="w-4 h-4" /></a>
              <a href={`tel:${SUPPORT_PHONE}`} className="transition-colors" style={{ color: "hsl(var(--footer-fg) / 0.6)" }} onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(var(--footer-fg))")} onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(var(--footer-fg) / 0.6)")}><Phone className="w-4 h-4" /></a>
            </div>
          </nav>
        </div>
        <div className="mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderTopColor: "hsl(var(--footer-fg) / 0.15)", borderTopWidth: "1px" }}>
          <p className="font-mono text-[10px] tracking-wider uppercase" style={{ color: "hsl(var(--footer-fg) / 0.4)" }}>© {new Date().getFullYear()} Dokan. {LANDING.ALL_RIGHTS}</p>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="font-mono text-[10px] tracking-wider uppercase transition-colors" style={{ color: "hsl(var(--footer-fg) / 0.5)" }} onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(var(--footer-fg))")} onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(var(--footer-fg) / 0.5)")}>Privacy</a>
            <a href="/terms" className="font-mono text-[10px] tracking-wider uppercase transition-colors" style={{ color: "hsl(var(--footer-fg) / 0.5)" }} onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(var(--footer-fg))")} onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(var(--footer-fg) / 0.5)")}>Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
