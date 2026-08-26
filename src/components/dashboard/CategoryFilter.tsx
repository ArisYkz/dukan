import { useMemo } from "react";

interface CategoryFilterProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  labelAll: string;
}

const CategoryFilter = ({ categories, activeCategory, onCategoryChange, labelAll }: CategoryFilterProps) => {
  const buttons = useMemo(() => {
    const all = (
      <button
        key="all"
        onClick={() => onCategoryChange("all")}
        className={`px-3 md:px-5 py-1.5 md:py-2 text-[10px] md:text-xs font-mono tracking-[0.15em] uppercase whitespace-nowrap transition-colors border-b-2 ${
          activeCategory === "all"
            ? "text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
        style={{ borderColor: activeCategory === "all" ? "hsl(var(--highlight))" : "transparent" }}
      >
        {labelAll}
      </button>
    );

    const catButtons = categories.map((cat) => (
      <button
        key={cat}
        onClick={() => onCategoryChange(cat)}
        className={`px-3 md:px-5 py-1.5 md:py-2 text-[10px] md:text-xs font-mono tracking-[0.15em] uppercase whitespace-nowrap transition-colors border-b-2 ${
          activeCategory === cat
            ? "text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
        style={{ borderColor: activeCategory === cat ? "hsl(var(--highlight))" : "transparent" }}
      >
        {cat}
      </button>
    ));

    return [all, ...catButtons];
  }, [categories, activeCategory, onCategoryChange, labelAll]);

  return (
    <div className="flex gap-0 mb-4 md:mb-6 overflow-x-auto scrollbar-hide border-b border-border">
      {buttons}
    </div>
  );
};

export default CategoryFilter;
