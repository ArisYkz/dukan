import { Check } from "lucide-react";

interface OrderConfirmationProps {
  CHECKOUT: Record<string, string>;
  ACTIONS: Record<string, string>;
  onClose: () => void;
  message?: string;
}

const OrderConfirmation = ({ CHECKOUT, ACTIONS, onClose, message }: OrderConfirmationProps) => (
  <div className="p-12 text-center space-y-6 bg-background">
    <div className="w-20 h-20 bg-green-50 text-green-700 rounded-full flex items-center justify-center mx-auto border border-green-200">
      <Check size={40} />
    </div>
    <h3 className="text-2xl font-black uppercase italic text-foreground">{CHECKOUT.THANK_YOU}</h3>
    <p className="text-sm leading-relaxed font-medium text-foreground">
      {message || CHECKOUT.ORDER_ACCEPTED}
    </p>
    <div className="pt-6 space-y-3">
      <button
        onClick={onClose}
        className="w-full border-2 border-foreground py-4 font-bold uppercase tracking-widest text-xs text-foreground hover:bg-muted transition-colors"
      >
        {ACTIONS.CLOSE}
      </button>
    </div>
  </div>
);

export default OrderConfirmation;
