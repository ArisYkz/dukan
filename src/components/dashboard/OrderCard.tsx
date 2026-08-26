import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Link2, MessageCircle, Archive, Loader2, ChevronDown } from "lucide-react";
import type { OrderRow } from "@/types/store";
import { formatPrice, statusColor } from "@/lib/format";
import { useLabels } from "@/hooks/useLabels";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface OrderCardProps {
  order: OrderRow;
  variant: "active" | "archived";
  onStatusChange?: (orderId: string, newStatus: string) => void;
  onCancelConfirm?: (orderId: string, newStatus: string) => void;
  onArchive?: (orderId: string) => void;
  revenueLimitReached?: boolean;
}

const OrderCard = React.memo(({ order, variant, onStatusChange, onCancelConfirm, onArchive, revenueLimitReached }: OrderCardProps) => {
  const { STATUS_LABELS, STATUS_TOOLTIPS } = useLabels();
  const [processing, setProcessing] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const lastActionRef = React.useRef(0);
  const isArchived = variant === "archived";
  const isMuted = ["cancelled", "payment_rejected"].includes(order.status);

  // Close status dropdown on click outside
  useEffect(() => {
    if (!statusOpen) return;
    const handler = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [statusOpen]);

  return (
    <motion.div
      initial={{ opacity: 0, y: isArchived ? 8 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border border-border rounded-none p-2 md:p-5 transition-opacity ${
        isArchived ? (isMuted ? "opacity-40 hover:opacity-60" : "opacity-60 hover:opacity-80") : isMuted ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2 md:gap-4 mb-1.5 md:mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 md:mb-1">
            <p className="font-mono text-xs md:text-lg truncate">{order.customer_name}</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`text-[10px] md:text-xs tracking-wider uppercase px-1.5 md:px-2 py-0.5 rounded-none cursor-help shrink-0 ${statusColor(order.status)}`}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" align="center" className="text-xs max-w-[220px]">
                {(STATUS_TOOLTIPS as Record<string, string>)?.[order.status] || ""}
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-[10px] md:text-xs tracking-[0.15em] uppercase text-muted-foreground font-mono">{order.public_order_id}</p>
          {!isArchived && order.status === "awaiting_verification" && order.reference_code && (
            <p className="font-mono text-xs md:text-sm font-bold text-primary mt-0.5 flex items-center gap-1.5">
              🔑 Code: <span className="tracking-[0.2em]">{order.reference_code}</span>
            </p>
          )}
          <p className="text-[11px] md:text-sm text-muted-foreground font-mono truncate">
            {order.customer_phone}{!isArchived && order.customer_address ? ` · ${order.customer_address}` : ""}
          </p>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
            {new Date(order.created_at).toLocaleDateString("en-US", {
              day: "numeric", month: "short",
              ...(isArchived ? { year: "numeric" } : { hour: "2-digit", minute: "2-digit" }),
            })}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-xs md:text-lg">{formatPrice(order.total_price)}</p>

          {!isArchived && onStatusChange && (() => {
            const GRACE_MS = 10 * 60 * 1000;
            const elapsed = Date.now() - new Date(order.updated_at || order.created_at).getTime();
            const pastGrace = elapsed > GRACE_MS;
            const cur = order.status;

            // Build allowed statuses
            const allowed: string[] = [cur];

            if (cur === "new") {
              allowed.push("awaiting_verification", "paid_confirmed", "cancelled");
            } else if (cur === "awaiting_verification") {
              allowed.push("paid_confirmed", "payment_rejected", "cancelled");
            } else if (cur === "paid_confirmed") {
              if (!pastGrace) allowed.push("awaiting_verification");
              allowed.push("shipped", "cancelled");
            } else if (cur === "payment_rejected") {
              allowed.push("awaiting_verification", "cancelled");
            } else if (cur === "shipped") {
              if (!pastGrace) allowed.push("paid_confirmed");
              allowed.push("delivered", "returned", "refunded");
            } else if (cur === "delivered") {
              allowed.push("returned", "refunded");
            }

            const unique = [...new Set(allowed)];

            const allStatuses = [
              { value: "new", label: STATUS_LABELS.new || "New" },
              { value: "awaiting_verification", label: STATUS_LABELS.awaiting_verification },
              { value: "paid_confirmed", label: STATUS_LABELS.paid_confirmed },
              { value: "payment_rejected", label: STATUS_LABELS.payment_rejected },
              { value: "shipped", label: STATUS_LABELS.shipped },
              { value: "delivered", label: STATUS_LABELS.delivered },
              { value: "cancelled", label: STATUS_LABELS.cancelled },
              { value: "returned", label: STATUS_LABELS.returned || "Returned" },
              { value: "refunded", label: STATUS_LABELS.refunded || "Refunded" },
            ];

            const handleStatusChange = (newStatus: string) => {
              if (newStatus === cur || processing) return;
              const now = Date.now();
              if (now - lastActionRef.current < 800) return;
              lastActionRef.current = now;
              setStatusOpen(false);
              setProcessing(true);
              if ((newStatus === "cancelled" || newStatus === "payment_rejected") && onCancelConfirm) {
                onCancelConfirm(order.id, newStatus);
                setProcessing(false);
              } else {
                onStatusChange(order.id, newStatus);
                setTimeout(() => setProcessing(false), 600);
              }
            };

            const getStatusDot = (status: string) => {
              const colors: Record<string, string> = {
                awaiting_verification: "bg-[hsl(45,80%,50%)]",
                paid_confirmed: "bg-accent",
                cancelled: "bg-destructive",
                payment_rejected: "bg-destructive",
                shipped: "bg-primary",
                delivered: "bg-muted-foreground",
                returned: "bg-[hsl(200,60%,50%)]",
                refunded: "bg-[hsl(160,60%,40%)]",
                new: "bg-secondary-foreground",
              };
              return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || "bg-muted-foreground"} shrink-0`} />;
            };

            return (
              <div className="relative flex items-center gap-1.5 mt-0.5 md:mt-1" ref={statusRef}>
                {processing && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                <button
                  type="button"
                  onClick={() => !processing && setStatusOpen(!statusOpen)}
                  disabled={processing}
                  className={`flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-mono border border-border bg-popover text-popover-foreground rounded-none px-1.5 md:px-2 py-0.5 md:py-1 focus:outline-none focus:ring-2 focus:ring-ring transition-opacity ${processing ? "opacity-50" : "hover:bg-accent/10 cursor-pointer"}`}
                >
                  {getStatusDot(cur)}
                  {allStatuses.find(s => s.value === cur)?.label || cur}
                  <ChevronDown className={`w-3 h-3 transition-transform ${statusOpen ? "rotate-180" : ""}`} />
                </button>
                {statusOpen && (
                  <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] border border-border bg-popover shadow-lg rounded-none py-1">
                    {allStatuses.filter(s => unique.includes(s.value)).map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => handleStatusChange(s.value)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-left transition-colors hover:bg-accent/10 ${s.value === cur ? "bg-accent/5" : ""}`}
                      >
                        {getStatusDot(s.value)}
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="flex items-center justify-end gap-2 md:gap-3 mt-1 md:mt-1.5">
            {!isArchived && order.status === "shipped" && (
              <a
                href={`https://wa.me/${order.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                  `Hello, ${order.customer_name}! Your order ${order.public_order_id} has been shipped. Order details: ${window.location.origin}/order/${order.id}`,
                )}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] md:text-xs text-[hsl(142,70%,40%)] hover:opacity-80 transition-opacity"
              >
                <MessageCircle className="w-3 h-3" /> WhatsApp
              </a>
            )}

            <a href={`/order/${order.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Link2 className="w-3 h-3" /> Tracking
            </a>

            {!isArchived && onArchive && !["archived", "delivered", "cancelled", "returned", "refunded"].includes(order.status) && (
              <button
                onClick={() => {
                  const now = Date.now();
                  if (now - lastActionRef.current < 800) return;
                  lastActionRef.current = now;
                  onArchive(order.id);
                }}
                className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground hover:text-foreground transition-colors"
                title="Archive"
              >
                <Archive className="w-3 h-3" /> Archive
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="text-[11px] md:text-sm text-muted-foreground space-y-0.5">
        {order.order_items.map((item, i) => (
          <p key={i}>• {item.product_name} × {item.quantity} — {formatPrice(item.product_price * item.quantity)}</p>
        ))}
        {order.promo_code && (
          <p className="text-[10px] md:text-xs mt-0.5 text-primary font-mono">
            🏷️ Promo: <span className="font-bold">{order.promo_code}</span> — -{formatPrice(order.discount_amount || 0)}
          </p>
        )}
      </div>

    </motion.div>
  );
});

OrderCard.displayName = "OrderCard";

export default OrderCard;
