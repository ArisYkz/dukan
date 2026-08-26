const DateRangeSelector = ({
  selectedRange,
  onRangeChange,
  isPro,
}: {
  selectedRange: "7d" | "30d" | "90d";
  onRangeChange: (range: "7d" | "30d" | "90d") => void;
  isPro: boolean;
}) => {
  const ranges = [
    { label: "7 days", value: "7d" as const },
    { label: "30 days", value: "30d" as const },
    { label: "90 days", value: "90d" as const },
  ];

  const availableRanges = isPro ? ranges : [ranges[0]];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex gap-2">
        {availableRanges.map((range) => (
          <button
            key={range.value}
            onClick={() => onRangeChange(range.value)}
            disabled={!isPro && range.value !== "7d"}
            className={`px-3 py-2 text-xs md:text-sm rounded-sm border transition-colors ${
              selectedRange === range.value
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:border-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
      {!isPro && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-sm px-3 py-2 bg-muted/30">
          <span className="text-[10px] font-medium tracking-wide uppercase text-muted-foreground">
            Pro
          </span>
          <span className="text-muted-foreground hidden sm:inline">Unlock 30+ day insights</span>
        </div>
      )}
    </div>
  );
};

export default DateRangeSelector;
