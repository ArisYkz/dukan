import { useState } from "react";
import { Plus, X, Lock } from "lucide-react";
import { useLabels } from "@/hooks/useLabels";

export interface VariantItem {
  variant_type: string;
  variant_value: string;
  price_adjustment: number;
}

interface VariantManagerProps {
  variants: VariantItem[];
  onChange: (variants: VariantItem[]) => void;
  isPro?: boolean;
}

const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL"];

const VariantManager = ({ variants, onChange, isPro = true }: VariantManagerProps) => {
  const { VARIANTS, COLOR_PRESETS, PRODUCTS_TAB } = useLabels();
  const [enableSize, setEnableSize] = useState(() => variants.some(v => v.variant_type === "Size"));
  const [enableColor, setEnableColor] = useState(() => variants.some(v => v.variant_type === "Color"));
  const [enableBoxQty, setEnableBoxQty] = useState(() => variants.some(v => v.variant_type === "Box Quantity"));
  const [customColor, setCustomColor] = useState("");
  const [customSize, setCustomSize] = useState("");
  const [boxQtyInput, setBoxQtyInput] = useState("");
  const [customType, setCustomType] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const addVariant = (type: string, value: string, priceAdj = 0) => {
    if (variants.some(v => v.variant_type === type && v.variant_value === value)) return;
    onChange([...variants, { variant_type: type, variant_value: value, price_adjustment: priceAdj }]);
  };

  const removeVariant = (index: number) => {
    onChange(variants.filter((_, i) => i !== index));
  };

  const toggleSection = (type: string, enabled: boolean, setter: (v: boolean) => void) => {
    setter(!enabled);
    if (enabled) {
      onChange(variants.filter(v => v.variant_type !== type));
    }
  };

  const addCustomColor = () => {
    const color = customColor.trim();
    if (!color) return;
    addVariant("Color", color);
    setCustomColor("");
  };

  const addCustomSize = () => {
    const size = customSize.trim();
    if (!size) return;
    addVariant("Size", size);
    setCustomSize("");
  };

  const addBoxQty = () => {
    const qty = boxQtyInput.trim();
    if (!qty) return;
    addVariant("Box Quantity", qty);
    setBoxQtyInput("");
  };

  const addCustom = () => {
    const type = customType.trim();
    const value = customValue.trim();
    if (!type || !value) return;
    addVariant(type, value, parseInt(customPrice) || 0);
    setCustomValue("");
    setCustomPrice("");
  };

  const groupedVariants = variants.reduce<Record<string, VariantItem[]>>((acc, v) => {
    if (!acc[v.variant_type]) acc[v.variant_type] = [];
    acc[v.variant_type].push(v);
    return acc;
  }, {});

  const ToggleBtn = ({ label, enabled, onToggle, locked }: { label: string; enabled: boolean; onToggle: () => void; locked?: boolean }) => (
    <button
      type="button"
      onClick={locked ? undefined : onToggle}
      disabled={locked}
      className={`flex items-center gap-2 px-3 py-2 text-xs rounded-sm border transition-colors ${
        locked ? "border-border text-muted-foreground/50 cursor-not-allowed opacity-50" :
        enabled ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-foreground"
      }`}
    >
      <span className={`w-3 h-3 rounded-sm border flex items-center justify-center ${enabled ? "bg-primary border-primary" : "border-muted-foreground"}`}>
        {enabled && <span className="w-1.5 h-1.5 bg-primary-foreground rounded-[1px]" />}
      </span>
      {label}
      {locked && <Lock className="w-3 h-3" />}
    </button>
  );

  return (
    <div className="space-y-4">
      <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground block">
        {VARIANTS.LABEL}
      </label>

      {/* Toggle buttons */}
      <div className="flex flex-wrap gap-2">
        <ToggleBtn label={VARIANTS.ENABLE_SIZE} enabled={enableSize} onToggle={() => toggleSection("Size", enableSize, setEnableSize)} />
        <ToggleBtn label={VARIANTS.ENABLE_COLOR} enabled={enableColor} onToggle={() => toggleSection("Color", enableColor, setEnableColor)} />
        <ToggleBtn label={VARIANTS.ENABLE_BOX_QTY} enabled={enableBoxQty} onToggle={() => toggleSection("Box Quantity", enableBoxQty, setEnableBoxQty)} locked={!isPro} />
      </div>

      {/* Sizes section */}
      {enableSize && (
        <div className="border border-border rounded-sm p-3 space-y-2">
          <p className="text-xs text-muted-foreground">{VARIANTS.SIZE}</p>
          <div className="flex flex-wrap gap-1.5">
            {SIZE_PRESETS.map(size => {
              const active = variants.some(v => v.variant_type === "Size" && v.variant_value === size);
              return (
                <button
                  key={size} type="button"
                  onClick={() => active
                    ? onChange(variants.filter(v => !(v.variant_type === "Size" && v.variant_value === size)))
                    : addVariant("Size", size)
                  }
                  className={`px-3 py-1.5 text-xs rounded-sm border transition-colors ${active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"}`}
                >
                  {size}
                </button>
              );
            })}
          </div>
          {/* Custom size - Pro only */}
          {isPro && (
            <div className="flex gap-2 pt-1">
              <input
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                placeholder={VARIANTS.CUSTOM_SIZE_PLACEHOLDER || "Custom size (e.g. 3XL)"}
                className="flex-1 border border-border bg-transparent px-3 py-1.5 text-xs rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSize())}
              />
              <button type="button" onClick={addCustomSize} className="px-3 py-1.5 text-xs border border-border rounded-sm hover:bg-muted transition-colors">
                {VARIANTS.ADD_CUSTOM_COLOR}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Colors section */}
      {enableColor && (
        <div className="border border-border rounded-sm p-3 space-y-2">
          <p className="text-xs text-muted-foreground">{VARIANTS.COLOR}</p>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_PRESETS.map(color => {
              const active = variants.some(v => v.variant_type === "Color" && v.variant_value === color);
              return (
                <button
                  key={color} type="button"
                  onClick={() => active
                    ? onChange(variants.filter(v => !(v.variant_type === "Color" && v.variant_value === color)))
                    : addVariant("Color", color)
                  }
                  className={`px-3 py-1.5 text-xs rounded-sm border transition-colors ${active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"}`}
                >
                  {color}
                </button>
              );
            })}
          </div>
          {/* Custom color input - Pro only */}
          {isPro && (
            <div className="flex gap-2 pt-1">
              <input
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                placeholder={VARIANTS.COLOR_PLACEHOLDER}
                className="flex-1 border border-border bg-transparent px-3 py-1.5 text-xs rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomColor())}
              />
              <button type="button" onClick={addCustomColor} className="px-3 py-1.5 text-xs border border-border rounded-sm hover:bg-muted transition-colors">
                {VARIANTS.ADD_CUSTOM_COLOR}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Box Quantity section */}
      {enableBoxQty && isPro && (
        <div className="border border-border rounded-sm p-3 space-y-2">
          <p className="text-xs text-muted-foreground">{VARIANTS.BOX_QTY}</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {variants.filter(v => v.variant_type === "Box Quantity").map((v, i) => {
              const globalIdx = variants.findIndex(gv => gv === v);
              return (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs border border-border rounded-sm bg-muted/50">
                  {v.variant_value} pcs
                  <button type="button" onClick={() => removeVariant(globalIdx)} className="ml-0.5 hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
                </span>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={boxQtyInput}
              onChange={(e) => setBoxQtyInput(e.target.value)}
              placeholder={VARIANTS.BOX_QTY_PLACEHOLDER}
              className="w-32 border border-border bg-transparent px-3 py-1.5 text-xs rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBoxQty())}
              min="1"
            />
            <button type="button" onClick={addBoxQty} className="p-1.5 border border-border rounded-sm hover:bg-muted transition-colors"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Custom variant input - Pro only */}
      {isPro && (
        <div className="border-t border-border pt-3">
          <p className="text-xs text-muted-foreground mb-2">{VARIANTS.ADD_CUSTOM}</p>
          <div className="flex flex-wrap gap-2">
            <input value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder={VARIANTS.TYPE_PLACEHOLDER} className="flex-1 min-w-[120px] border border-border bg-transparent px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input value={customValue} onChange={(e) => setCustomValue(e.target.value)} placeholder={VARIANTS.VALUE_PLACEHOLDER} className="flex-1 min-w-[120px] border border-border bg-transparent px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input type="number" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} placeholder="+/- ৳" className="w-20 border border-border bg-transparent px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <button type="button" onClick={addCustom} className="p-2 border border-border rounded-sm hover:bg-muted transition-colors"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {!isPro && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Lock className="w-3 h-3" />
          <span>{PRODUCTS_TAB.PRO_ONLY_VARIANTS}</span>
        </div>
      )}

      {/* Active variants summary */}
      {Object.keys(groupedVariants).length > 0 && (
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs text-muted-foreground">{VARIANTS.ACTIVE_VARIANTS}</p>
          {Object.entries(groupedVariants).map(([type, items]) => (
            <div key={type} className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-foreground mr-1">{type}:</span>
              {items.map((item, i) => {
                const globalIdx = variants.findIndex(v => v === item);
                return (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs border border-border rounded-sm bg-muted/50">
                    {item.variant_value}
                    {item.price_adjustment !== 0 && (<span className="text-muted-foreground">({item.price_adjustment > 0 ? "+" : ""}{item.price_adjustment} ৳)</span>)}
                    <button type="button" onClick={() => removeVariant(globalIdx)} className="ml-0.5 hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VariantManager;
