import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

interface StoreFooterProps {
  storeName: string;
  STOREFRONT: Record<string, string>;
  onReportClick: () => void;
}

const StoreFooter = ({ storeName, STOREFRONT, onReportClick }: StoreFooterProps) => (
  <footer
    style={{ backgroundColor: "hsl(var(--footer-bg))", color: "hsl(var(--footer-fg))" }}
    className="py-10 pb-16"
  >
    <div className="container text-center space-y-4">
      <p className="font-mono text-xs tracking-[0.2em] uppercase" style={{ color: "hsl(var(--footer-fg) / 0.6)" }}>
        {storeName} ·{" "}
        <Link to="/" className="hover:border-b hover:border-current transition-all" style={{ color: "hsl(var(--footer-fg) / 0.6)" }}>
          Duken
        </Link>
      </p>
      <p className="font-mono text-xs tracking-wide" style={{ color: "hsl(var(--footer-fg) / 0.4)" }}>Dhaka, Bangladesh</p>
      <p className="font-mono text-xs tracking-[0.15em] uppercase font-bold" style={{ color: "hsl(var(--footer-fg) / 0.5)" }}>
        {STOREFRONT.FOR_LOCAL_ENTREPRENEURS}
      </p>
      <Link
        to="/"
        className="inline-block text-xs font-mono tracking-wide border px-4 py-2 rounded-none transition-colors"
        style={{ color: "hsl(var(--footer-fg) / 0.5)", borderColor: "hsl(var(--footer-fg) / 0.2)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "hsl(var(--footer-fg))"; e.currentTarget.style.borderColor = "hsl(var(--footer-fg) / 0.4)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "hsl(var(--footer-fg) / 0.5)"; e.currentTarget.style.borderColor = "hsl(var(--footer-fg) / 0.2)"; }}
      >
        {STOREFRONT.OPEN_YOUR_STORE}
      </Link>
      <div className="pt-2">
        <button
          onClick={onReportClick}
          className="group inline-flex items-center gap-1.5 font-mono text-xs tracking-[0.15em] uppercase transition-all duration-200 px-2 py-1 sm:py-0"
          style={{ color: "hsl(var(--footer-fg) / 0.4)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "hsl(0 60% 50%)"; e.currentTarget.style.opacity = "1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "hsl(var(--footer-fg) / 0.4)"; e.currentTarget.style.opacity = "1"; }}
          onTouchStart={(e) => { e.currentTarget.style.color = "hsl(0 60% 50%)"; e.currentTarget.style.opacity = "1"; }}
          onTouchEnd={(e) => { e.currentTarget.style.color = "hsl(var(--footer-fg) / 0.4)"; e.currentTarget.style.opacity = "1"; }}
        >
          <ShieldAlert size={12} strokeWidth={1.5} className="sm:w-[10px] sm:h-[10px]" />
          {STOREFRONT.REPORT_STORE}
        </button>
      </div>
    </div>
  </footer>
);

export default StoreFooter;
