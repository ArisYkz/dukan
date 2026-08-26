import { useLanguage, type Language } from "@/contexts/LanguageContext";

const LANG_OPTIONS: { value: Language; label: string }[] = [
  { value: "bn", label: "BN" },
  { value: "en", label: "EN" },
];

const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center rounded-sm border border-foreground/20 overflow-hidden h-8">
      {LANG_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setLanguage(opt.value)}
          className={`px-2.5 py-1 text-xs font-mono tracking-wide transition-colors ${
            language === opt.value
              ? "bg-foreground text-background"
              : "hover:bg-foreground/5 text-foreground/60"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggle;
