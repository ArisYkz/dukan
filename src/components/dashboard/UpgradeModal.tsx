import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { FREE_PRODUCT_LIMIT } from "@/lib/format";
import { useLabels } from "@/hooks/useLabels";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade: () => void;
}

const UpgradeModal = ({ open, onOpenChange, onUpgrade }: UpgradeModalProps) => {
  const { UPGRADE, BILLING, ACTIONS } = useLabels();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-8 border-border bg-background rounded-none">
        <DialogHeader className="space-y-3">
          <DialogTitle className="font-mono text-2xl font-normal tracking-tight text-foreground uppercase">
            {UPGRADE.LIMIT_REACHED}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground font-mono">
            {UPGRADE.LIMIT_DESC_PREFIX} {FREE_PRODUCT_LIMIT} {UPGRADE.LIMIT_DESC_SUFFIX}
          </DialogDescription>
        </DialogHeader>

        <div className="pt-6 pb-2 space-y-6">
          <ul className="space-y-3 text-[11px] text-foreground uppercase tracking-wider font-mono">
            <li className="flex items-center gap-3"><span className="w-1 h-1 rounded-full bg-foreground shrink-0" />{BILLING.UNLIMITED_PRODUCTS}</li>
            <li className="flex items-center gap-3"><span className="w-1 h-1 rounded-full bg-foreground shrink-0" />Unlimited confirmed revenue</li>
            <li className="flex items-center gap-3"><span className="w-1 h-1 rounded-full bg-foreground shrink-0" />Up to 5 images per product</li>
            <li className="flex items-center gap-3"><span className="w-1 h-1 rounded-full bg-foreground shrink-0" />Custom variants</li>
            <li className="flex items-center gap-3"><span className="w-1 h-1 rounded-full bg-foreground shrink-0" />{BILLING.FULL_ANALYTICS}</li>
            <li className="flex items-center gap-3"><span className="w-1 h-1 rounded-full bg-foreground shrink-0" />Promo codes</li>
            <li className="flex items-center gap-3"><span className="w-1 h-1 rounded-full bg-foreground shrink-0" />{BILLING.TELEGRAM_NOTIFICATIONS}</li>
          </ul>
          <div className="space-y-1">
            <p className="text-2xl font-mono font-semibold tracking-tight text-foreground">
              15,000 ₸ <span className="text-xs font-normal text-muted-foreground uppercase">{BILLING.PER_MONTH}</span>
            </p>
            <p className="text-[10px] font-mono text-accent uppercase tracking-tighter">{BILLING.SAVE_WITH_YEARLY}</p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button onClick={onUpgrade} className="w-full text-center bg-foreground text-background py-4 text-xs tracking-[0.2em] uppercase rounded-none hover:opacity-90 transition-opacity active:scale-[0.98] font-bold">{BILLING.SELECT_PLAN}</button>
            <button onClick={() => onOpenChange(false)} className="w-full text-center py-2.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors tracking-[0.1em] uppercase font-mono">{ACTIONS.LATER}</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
