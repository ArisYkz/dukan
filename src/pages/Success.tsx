import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, MessageCircle, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { useLabels } from "@/hooks/useLabels";
import { useTranslation } from "react-i18next";

const SuccessPage = () => {
  const { SUCCESS, CHECKOUT } = useLabels();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const storeSlug = searchParams.get("store");
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    Promise.all([
      supabase.rpc("get_order_public", { p_order_id: orderId }),
      supabase.rpc("get_order_items_public", { p_order_id: orderId }),
    ]).then(([{ data: orderRows }, { data: orderItems }]) => {
      if (orderRows && orderRows.length > 0) {
        const orderData = orderRows[0];
        setOrder({ ...orderData, order_items: orderItems || [] });
        supabase
          .from("stores")
          .select("name, whatsapp_phone, social_platform, telegram_chat_id, instagram")
          .eq("id", orderData.store_id)
          .single()
          .then(({ data: storeData }) => {
            if (storeData) setStore(storeData);
          });
      }
      setLoading(false);
    });
  }, [orderId]);

  const contactUrl = store && orderId && order
    ? (() => {
        const platform = store.social_platform || "whatsapp";
        let handle =
          platform === "telegram" ? (store.telegram_chat_id || "").replace("@", "") :
          platform === "instagram" ? (store.instagram || "").replace("@", "") :
          (store.whatsapp_phone || "").replace(/\D/g, "");

        if (platform === "whatsapp" && handle) {
          if (handle.startsWith("8")) handle = "7" + handle.slice(1);
          if (!handle.startsWith("7") && handle.length === 10) handle = "7" + handle;
          handle = "+" + handle;
        }

        const itemsList = order.order_items?.map((item: any) => {
          const itemTotal = item.product_price * item.quantity;
          return `- ${item.product_name} x${item.quantity} - ${formatPrice(itemTotal)}`;
        }).join('\n') || '';

        const orderDisplayId = order.public_order_id || order.reference_code || order.id?.slice(0, 8) || '';
        const message = encodeURIComponent(
          t("SUCCESS.WHATSAPP_MESSAGE", {
            orderId: orderDisplayId,
            storeName: store.name,
            items: itemsList,
            total: formatPrice(order.total_price),
            reference: order.reference_code || SUCCESS.NO_REFERENCE,
          })
        );

        return platform === "telegram" ? `https://t.me/${handle}` :
               platform === "instagram" ? `https://instagram.com/${handle}` :
               `https://wa.me/${handle}?text=${message}`;
      })()
    : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#eeebe2' }}>
      <header className="border-b" style={{ borderColor: '#d4d0c8' }}>
        <div className="container flex items-center justify-between h-14">
          <span className="font-mono text-lg font-bold" style={{ color: '#1a1a1a' }}>Dokan</span>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="border p-10 md:p-16 w-full max-w-md text-center space-y-6"
          style={{ borderColor: '#1a1a1a', backgroundColor: 'rgba(255,255,255,0.4)' }}
        >
          <div className="flex justify-center">
            <div className="w-12 h-12 border-2 flex items-center justify-center" style={{ borderColor: '#1a1a1a' }}>
              <Check className="w-6 h-6" style={{ color: '#1a1a1a' }} strokeWidth={2.5} />
            </div>
          </div>

          {/* Reference Code — THE HERO */}
          {!loading && order?.reference_code && (
            <div className="space-y-2">
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase" style={{ color: '#1a1a1a', opacity: 0.5 }}>
                Reference Code
              </p>
              <p className="font-mono text-5xl md:text-6xl font-black tracking-[0.15em]" style={{ color: '#1a1a1a' }}>
                {order.reference_code}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <h1 className="font-mono text-lg md:text-xl font-bold tracking-wide uppercase" style={{ color: '#1a1a1a' }}>
              {SUCCESS.ORDER_RECEIVED}
            </h1>
            <p className="font-mono text-xs" style={{ color: '#1a1a1a', opacity: 0.6 }}>
              {SUCCESS.SELLER_WILL_CONTACT}
            </p>
            {!loading && order?.payment_method === "cod" && (
              <p className="font-mono text-xs" style={{ color: '#1a1a1a', opacity: 0.6 }}>
                {CHECKOUT.COD_CONFIRMATION}
              </p>
            )}
            {!loading && order?.payment_method === "contact_us" && (
              <p className="font-mono text-xs" style={{ color: '#1a1a1a', opacity: 0.6 }}>
                {CHECKOUT.CONTACT_CONFIRMATION}
              </p>
            )}
            {orderId && (
              <p className="font-mono text-[10px] font-bold tracking-wide uppercase" style={{ color: '#c0392b' }}>
                {SUCCESS.KEEP_LINK || "Save this link to track your order status later:"}
              </p>
            )}
          </div>

          {!loading && orderId && (
            <div className="space-y-3 pt-4 border-t" style={{ borderColor: '#d4d0c8' }}>
              {contactUrl && (
                <a
                  href={contactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 text-xs font-mono font-bold tracking-[0.15em] uppercase transition-all active:scale-[0.98]"
                  style={{ backgroundColor: '#1a1a1a', color: '#eeebe2' }}
                >
                  <MessageCircle className="w-4 h-4" />
                  {SUCCESS.CONTACT_SELLER}
                </a>
              )}

              <Link
                to={`/order/${orderId}`}
                className="inline-flex items-center justify-center gap-2 w-full border-2 py-3 text-xs font-mono font-bold tracking-[0.15em] uppercase transition-all active:scale-[0.98] hover:opacity-80"
                style={{ borderColor: '#1a1a1a', color: '#1a1a1a' }}
              >
                <ExternalLink className="w-4 h-4" />
                {SUCCESS.VIEW_ORDER_STATUS}
              </Link>

              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/order/${orderId}`;
                  navigator.clipboard.writeText(url);
                  toast.success(SUCCESS.LINK_COPIED || "Link copied!");
                }}
                className="inline-flex items-center justify-center gap-2 w-full border-2 py-2.5 text-[10px] font-mono font-bold tracking-[0.15em] uppercase transition-all active:scale-[0.98] animate-pulse"
                style={{ borderColor: '#c0392b', color: '#c0392b' }}
              >
                <Copy className="w-3.5 h-3.5" />
                {SUCCESS.COPY_LINK || "Copy tracking link"}
              </button>
            </div>
          )}

          <Link
            to={storeSlug ? `/s/${storeSlug}` : "/"}
            className="inline-block w-full border-2 py-3 text-xs font-mono tracking-[0.15em] uppercase transition-all active:scale-[0.98] hover:opacity-80 text-center"
            style={{ borderColor: '#1a1a1a', color: '#1a1a1a' }}
          >
            {SUCCESS.RETURN_TO_STORE}
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default SuccessPage;
