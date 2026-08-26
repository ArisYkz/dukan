import { useLanguage } from "@/contexts/LanguageContext";
import { translateVariant, translateVariantType } from "@/lib/translateVariant";

interface VariantOption {
  variant_type: string;
  variant_value: string;
  price_adjustment: number;
  stock?: number;
}

interface VariantSelectorProps {
  variants: VariantOption[];
  selected: Record<string, string>;
  onSelect: (type: string, value: string) => void;
}

const VariantSelector = ({ variants, selected, onSelect }: VariantSelectorProps) => {
  const { language } = useLanguage();
  if (!variants || variants.length === 0) return null;

  const grouped = variants.reduce<Record<string, VariantOption[]>>((acc, v) => {
    if (!acc[v.variant_type]) acc[v.variant_type] = [];
    acc[v.variant_type].push(v);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([type, options]) => (
        <div key={type}>
          <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">
            {translateVariantType(type, language)}
          </p>
          <div className="flex flex-wrap gap-2">
            {options.map((opt) => {
              const isSelected = selected[type] === opt.variant_value;
              const isOutOfStock = opt.stock !== undefined && opt.stock <= 0;
              return (
                <button
                  key={opt.variant_value}
                  type="button"
                  onClick={() => !isOutOfStock && onSelect(type, opt.variant_value)}
                  disabled={isOutOfStock}
                  className={`min-w-[40px] px-3 py-2 text-sm font-serif transition-all duration-200 ${
                    isOutOfStock
                      ? "border border-border/30 text-muted-foreground/50 opacity-50 line-through cursor-not-allowed"
                      : isSelected
                        ? "border border-foreground bg-muted/30"
                        : "border border-border/60 text-muted-foreground hover:border-foreground/50 hover:text-foreground"
                  }`}
                >
                  {translateVariant(opt.variant_value, language)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default VariantSelector;
