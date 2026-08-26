import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { useLanguage, type Language } from "@/contexts/LanguageContext";

const LANG_OPTIONS: { value: Language; label: string }[] = [
  { value: "bn", label: "BN" },
  { value: "en", label: "EN" },
];

const LanguageDropdown = () => {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LANG_OPTIONS.find((o) => o.value === language);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-sm transition-colors opacity-70 hover:opacity-100 flex items-center gap-1"
      >
        <Globe className="w-4 h-4" />
        <span className="text-[10px] font-mono">{current?.label}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 border border-border rounded-sm shadow-lg z-50" style={{ backgroundColor: "hsl(var(--background))" }}>
          {LANG_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setLanguage(opt.value); setOpen(false); }}
              className={`block w-full px-4 py-2 text-xs font-mono tracking-wide text-left transition-colors ${
                language === opt.value
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:bg-foreground/5"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageDropdown;
