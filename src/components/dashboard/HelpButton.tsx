import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface HelpButtonProps {
  title?: string;
  children: React.ReactNode;
}

const HelpButton = ({ title, children }: HelpButtonProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        className="p-0.5 rounded-full hover:bg-muted/50 transition-colors text-muted-foreground/40 hover:text-muted-foreground"
        aria-label="Help"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
    </PopoverTrigger>
    <PopoverContent side="top" align="start" className="w-72 p-4 rounded-none border-border text-sm">
      <div className="space-y-2">
        {title && (
          <h4 className="font-semibold text-xs uppercase tracking-wider text-foreground/70">{title}</h4>
        )}
        <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
          {children}
        </div>
      </div>
    </PopoverContent>
  </Popover>
);

export default HelpButton;
