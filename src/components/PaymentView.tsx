import { Timer, Copy } from "lucide-react";
import { formatPrice } from "@/lib/format";

interface PaymentViewProps {
  order: {
    public_order_id?: string;
    reference_code?: string;
    qr_image_url?: string;
    payment_phone?: string | null;
    payment_method?: string | null;
  };
  total: number;
  timeLeft: number;
  loading: boolean;
  CHECKOUT: Record<string, string>;
  ACTIONS: Record<string, string>;
  onIAmPaid: () => void;
  onCopy: (val: string) => void;
  methodLabel?: string;
  methodLogo?: string | null;
}

const PaymentView = ({ order, total, timeLeft, loading, CHECKOUT, ACTIONS, onIAmPaid, onCopy, methodLabel, methodLogo }: PaymentViewProps) => (
  <div className="p-6 space-y-6 bg-background">
    <div className="bg-amber-50 border border-amber-200 p-4 flex justify-between items-center text-amber-800">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tighter">
        <Timer size={14} /> {CHECKOUT.PAYMENT_TIME}
      </div>
      <span className="font-mono font-bold text-foreground">
        {Math.floor(timeLeft / 60000)}:{(Math.floor(timeLeft / 1000) % 60).toString().padStart(2, "0")}
      </span>
    </div>

    {methodLabel && (
      <div className="flex items-center gap-2">
        {methodLogo && <img src={methodLogo} alt="" className="w-6 h-6 rounded-sm" />}
        <p className="text-xs font-bold uppercase tracking-wider text-foreground">{methodLabel}</p>
      </div>
    )}

    <div className="text-center space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-widest text-foreground">
        {CHECKOUT.ORDER_NUMBER}{order.public_order_id}
      </p>
      <div
        className="flex items-center justify-center gap-2 group cursor-pointer"
        onClick={() => onCopy(total.toString())}
      >
        <h3 className="text-4xl font-black text-foreground">{formatPrice(total)}</h3>
        <Copy size={16} className="opacity-40 group-hover:opacity-100 transition-opacity text-foreground" />
      </div>
    </div>

    <div className="space-y-4">
      <div className="p-5 border-2 border-foreground rounded-sm space-y-3 bg-card">
        <p className="text-[10px] font-medium uppercase tracking-wide text-foreground">{CHECKOUT.PAYMENT_CODE}</p>
        <div className="flex justify-between items-center gap-3">
          <span className="text-3xl font-mono font-black tracking-widest text-foreground">
            {order.reference_code}
          </span>
          <button
            onClick={() => onCopy(order.reference_code || "")}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wide border-2 border-foreground text-foreground bg-card hover:bg-muted transition-colors"
          >
            {ACTIONS.COPY}
          </button>
        </div>
      </div>

      {order.payment_phone && (
        <div className="p-5 border-2 border-foreground rounded-sm flex justify-between items-center gap-3 bg-card">
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-foreground">{CHECKOUT.PHONE}</p>
            <p className="text-sm font-mono font-bold text-foreground">{order.payment_phone}</p>
          </div>
          <button
            onClick={() => onCopy(order.payment_phone || "")}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wide border-2 border-foreground text-foreground bg-card hover:bg-muted transition-colors"
          >
            {ACTIONS.COPY}
          </button>
        </div>
      )}

      {order.qr_image_url && (
        <div className="space-y-2">
          <p className="text-[10px] text-center italic font-medium uppercase text-foreground">{CHECKOUT.PAY_VIA_QR}</p>
          <div className="flex justify-center">
            <img src={order.qr_image_url} className="max-w-full h-auto border-2 border-foreground rounded-sm" alt="QR" />
          </div>
        </div>
      )}
    </div>

    <button
      onClick={onIAmPaid}
      disabled={loading}
      className="w-full py-4 font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-30 transition-opacity bg-primary text-primary-foreground"
    >
      {loading ? CHECKOUT.VERIFYING : CHECKOUT.I_HAVE_PAID}
    </button>
  </div>
);

export default PaymentView;
