import { Lock } from "lucide-react";
import { useLabels } from "@/hooks/useLabels";

const ProOverlay = ({ children, isPro }: { children: React.ReactNode; isPro: boolean }) => {
  const { ANALYTICS } = useLabels();

  if (isPro) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 backdrop-blur-[2px] grayscale opacity-50 rounded-sm pointer-events-none z-10" />
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-background/80 border border-border rounded-sm px-2 py-1.5">
        <Lock className="w-3 h-3 text-muted-foreground" />
        <span className="text-[10px] font-medium tracking-wide uppercase text-muted-foreground">
          {ANALYTICS.PRO_FEATURE_HINT}
        </span>
      </div>
      {children}
    </div>
  );
};

export default ProOverlay;
