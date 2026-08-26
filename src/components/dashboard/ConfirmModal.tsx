import { AlertTriangle } from "lucide-react";
import { useLabels } from "@/hooks/useLabels";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "default" | "danger";
}

const ConfirmModal = ({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel, variant = "default" }: ConfirmModalProps) => {
  const { ACTIONS } = useLabels();
  const confirm = confirmLabel || ACTIONS.CONFIRM;
  const cancel = cancelLabel || ACTIONS.CANCEL;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative border border-border rounded-none bg-background p-8 w-full max-w-sm space-y-5 z-10">
        <div className="flex items-center gap-2">
          {variant === "danger" && <AlertTriangle className="w-5 h-5 text-destructive" />}
          <h3 className="font-mono text-xl font-bold">{title}</h3>
        </div>
        <p className="font-mono text-sm text-muted-foreground">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-mono tracking-wide uppercase border border-border rounded-none hover:bg-muted transition-colors">{cancel}</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 text-sm font-mono tracking-wide uppercase bg-primary text-primary-foreground rounded-none hover:opacity-90 transition-opacity active:scale-[0.98]">{confirm}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
