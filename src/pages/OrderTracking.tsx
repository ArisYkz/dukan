import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Clock, Truck, Package, MessageCircle, Copy, Timer, RotateCcw, AlertTriangle, Star, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import { useLabels } from "@/hooks/useLabels";
import { useTranslation } from "react-i18next";
import StarRating from "@/components/StarRating";
import { normalizePaymentMethods, WALLET_KEYS, type WalletKey } from "@/constants/paymentMethods";

interface OrderData {
  id: string;
  public_order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_phone_hash: string;
  customer_address: string;
  total_price: number;
  status: string;
  created_at: string;
  store_id: string;
  reference_code: string | null;
  promo_code: string | null;
  discount_amount: number | null;
  payment_method: string | null;
  order_items: { product_name: string; quantity: number; product_price: number; product_id: string }[];
}

interface StoreData {
  name: string;
  slug: string;
  payment_qr_image: string | null;
  is_verified: boolean;
  payment_phone: string | null;
  payment_name: string | null;
  payment_methods: unknown;
  whatsapp_phone: string | null;
  social_platform: string | null;
  telegram_chat_id: string | null;
  instagram: string | null;
}

const PAYMENT_WINDOW_MS = 30 * 60 * 1000;

const STEP_ICONS = [Package, Clock, Check, Truck, Check];

const ORDER_STEP_KEYS = ["new", "awaiting_verification", "paid_confirmed", "shipped", "delivered"];

const getStatusIndex = (status: string) => {
  if (status === "payment_rejected") return 1;
  if (status === "cancelled") return -1;
  return ORDER_STEP_KEYS.indexOf(status);
};

const formatCountdown = (ms: number) => {
  if (ms <= 0) return "00:00";
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const OrderTracking = () => {
  const { TRACKING, ACTIONS, MESSAGES, STATUS_DISPLAY, ORDER_STEPS: ORDER_STEPS_RAW, ERRORS, RETURNS, CHECKOUT } = useLabels();
  const { t } = useTranslation();
  const ORDER_STEPS = ORDER_STEP_KEYS.map(key => ({ key, label: (ORDER_STEPS_RAW as Record<string, string>)[key] || key }));
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [storePaused, setStorePaused] = useState(false);
  const [reviewedProducts, setReviewedProducts] = useState<Set<string>>(new Set());
  const [ratingInputs, setRatingInputs] = useState<Record<string, number>>({});
  const [submittingReview, setSubmittingReview] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const computeRemaining = useCallback((createdAt: string) => {
    const elapsed = Date.now() - new Date(createdAt).getTime();
    return Math.max(0, PAYMENT_WINDOW_MS - elapsed);
  }, []);

  useEffect(() => {
    loadOrder();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [id]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!order || order.status !== "new") { setRemaining(null); return; }

    const update = () => {
      const r = computeRemaining(order.created_at);
      setRemaining(r);
      if (r <= 0 && timerRef.current) clearInterval(timerRef.current);
    };
    update();
    timerRef.current = setInterval(update, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [order, computeRemaining]);

  const loadOrder = async () => {
    if (!id) { setNotFound(true); setLoading(false); return; }

    const { data: orderRows, error } = await supabase
      .rpc("get_order_public", { p_order_id: id });

    if (error || !orderRows || orderRows.length === 0) { setNotFound(true); setLoading(false); return; }
    const orderData = orderRows[0];

    const { data: orderItems } = await supabase
      .rpc("get_order_items_public", { p_order_id: id });

    setOrder({ ...orderData, order_items: orderItems || [] } as unknown as OrderData);

    const { data: storeData } = await supabase
      .from("stores")
      .select("name, slug, payment_qr_image, is_verified, payment_phone, payment_name, payment_methods, whatsapp_phone, social_platform, telegram_chat_id, instagram")
      .eq("id", orderData.store_id)
      .single();

    if (storeData) {
      setStore(storeData as unknown as StoreData);
      // Only block if store owner explicitly paused
      const { data: pauseData } = await supabase
        .from("stores")
        .select("is_paused")
        .eq("id", orderData.store_id)
        .single();
      setStorePaused(!!(pauseData && pauseData.is_paused));
    }
    // Load existing reviews for this order
    if (orderData && ["shipped", "delivered"].includes(orderData.status)) {
      const { data: existingReviews } = await supabase
        .from("reviews")
        .select("product_id")
        .eq("order_id", orderData.id);
      if (existingReviews) {
        setReviewedProducts(new Set(existingReviews.map((r) => r.product_id)));
      }
    }
    setLoading(false);
  };

  const handleSubmitReview = async (productId: string) => {
    if (!order) return;
    const rating = ratingInputs[productId];
    if (!rating) { toast.error(ERRORS?.REVIEW_SELECT_RATING || "Please select a rating"); return; }
    
    setSubmittingReview(productId);
    try {
      const { error } = await supabase.functions.invoke("submit-review", {
        body: {
          orderId: order.id,
          productId,
          rating,
          customerPhoneHash: order.customer_phone_hash,
        },
      });
      if (error) throw error;
      toast.success(ERRORS?.REVIEW_SUBMITTED || "Review submitted!");
      setReviewedProducts(prev => new Set([...prev, productId]));
    } catch (err: any) {
      toast.error(ERRORS?.REVIEW_FAILED || "Failed to submit review");
    } finally {
      setSubmittingReview(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadOrder();
      toast.success(MESSAGES.REFRESHED);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : MESSAGES.ERROR_OCCURRED);
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const handleClaimPaid = async () => {
    if (!order) return;
    setClaiming(true);
    try {
      const { error } = await supabase.functions.invoke("claim-payment", {
        body: { orderId: order.id, referenceCode: order.reference_code, origin: window.location.origin },
      });
      if (error) throw error;
      toast.success(MESSAGES.CLAIM_SENT);
      setShowConfirmDialog(false);
      loadOrder();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : MESSAGES.CLAIM_ERROR);
    } finally {
      setClaiming(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} ${MESSAGES.COPIED.toLowerCase()}`);
  };

  // Dynamic contact link based on platform
  const contactUrl = order && store
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
        
        const orderId = order.public_order_id || order.reference_code || order.id.slice(0, 8);
        const message = encodeURIComponent(
          t("TRACKING.WHATSAPP_MESSAGE", { orderId, storeName: store.name, amount: formatPrice(order.total_price) })
        );
        
        return platform === "telegram" ? `https://t.me/${handle}` :
               platform === "instagram" ? `https://instagram.com/${handle}` :
               `https://wa.me/${handle}?text=${message}`;
      })()
    : null;

  const contactLabel = order && store
    ? (() => {
        const platform = store.social_platform || "whatsapp";
        return platform === "telegram" ? TRACKING.CONTACT_VIA_TELEGRAM :
               platform === "instagram" ? TRACKING.CONTACT_VIA_INSTAGRAM :
               TRACKING.CONTACT_VIA_WHATSAPP;
      })()
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-mono text-3xl mb-2">{TRACKING.ORDER_NOT_FOUND}</h1>
          <p className="text-muted-foreground">{TRACKING.LINK_INVALID}</p>
        </div>
      </div>
    );
  }

  const currentIdx = getStatusIndex(order.status);
  const isCancelled = order.status === "cancelled";
  const isRejected = order.status === "payment_rejected";
  const canClaimPayment = ["new", "payment_rejected"].includes(order.status);
  const pmConfig = normalizePaymentMethods(store?.payment_methods);
  const orderMethod = order.payment_method;
  const methodWallet = orderMethod && WALLET_KEYS.includes(orderMethod as WalletKey)
    ? pmConfig.wallets[orderMethod as WalletKey]
    : undefined;
  const recipientPhone = (orderMethod && methodWallet?.phone) ? methodWallet.phone : store?.payment_phone || null;
  const recipientName = store?.payment_name || null;
  const recipientQr = (orderMethod && methodWallet?.qr_url) ? methodWallet.qr_url : store?.payment_qr_image || null;
  const hasQR = !!recipientQr;
  const hasPayment = !!(recipientPhone && (methodWallet || store?.payment_name));
  const isExpired = order.status === "new" && remaining !== null && remaining <= 0;

  // Expired state
  if (isExpired) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="container flex items-center justify-between h-14">
            <span className="font-mono text-lg">{store?.name || "Dokan"}</span>
          </div>
        </header>
        <div className="container max-w-lg py-16 text-center space-y-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Timer className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="font-mono text-2xl font-bold">{TRACKING.TIME_EXPIRED}</h2>
            <p className="font-mono text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              {TRACKING.TIME_EXPIRED_DESC}
            </p>
            <p className="text-xs text-muted-foreground">
              {TRACKING.ORDER_NUMBER}: <span className="font-medium">{order.public_order_id}</span>
            </p>
          </motion.div>
          {store?.slug && (
            <Link
              to={`/s/${store.slug}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm tracking-wide uppercase rounded-none hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" />
              {TRACKING.RETURN_TO_STORE}
            </Link>
          )}
          <footer className="pt-8">
            <p className="text-xs text-muted-foreground font-mono">Dokan · Dhaka, Bangladesh</p>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex items-center justify-between h-14">
          <span className="font-mono text-lg">{store?.name || "Dokan"}</span>
          <div className="flex items-center gap-3">
            {canClaimPayment && order.status === "new" && remaining !== null && remaining > 0 && (
              <span className="font-mono text-sm font-bold tabular-nums text-muted-foreground flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" />
                {formatCountdown(remaining)}
              </span>
            )}
            {store?.is_verified && (
              <span className="text-[10px] tracking-[0.15em] uppercase bg-accent/15 text-accent px-2 py-1 rounded-none font-mono">✓ Verified</span>
            )}
          </div>
        </div>
      </header>

      <div className="container max-w-lg py-8 space-y-8">
        {/* Order ID */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-mono">{TRACKING.ORDER_NUMBER}</p>
          <p className="font-mono text-4xl font-bold">{order.public_order_id}</p>
          <p className="text-sm text-muted-foreground font-mono">
            {new Date(order.created_at).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </motion.div>

        {/* Status display with Refresh */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className={`text-center p-4 rounded-none border ${isCancelled || isRejected ? "border-destructive/30 bg-destructive/5" : "border-accent/30 bg-accent/5"}`}
        >
          <div className="flex items-center justify-center gap-3">
            <p className={`font-mono text-xl ${isCancelled || isRejected ? "text-destructive" : "text-accent"}`}>
              {STATUS_DISPLAY[order.status] || order.status}
            </p>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 hover:bg-accent/20 rounded-full transition-colors group"
              title={TRACKING.REFRESH}
            >
              <RotateCcw 
                size={16} 
                strokeWidth={1.5}
                className={`${refreshing ? 'animate-spin' : 'group-hover:rotate-[-180deg]'} transition-transform duration-500`} 
                style={{ color: '#3C3935' }} 
              />
            </button>
          </div>
        </motion.div>

        {/* Progress steps */}
        {!isCancelled && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-0">
            {ORDER_STEPS.map((step, i) => {
              const isActive = i <= currentIdx;
              const isCurrent = i === currentIdx;
              const Icon = STEP_ICONS[i];
              return (
                <div key={step.key} className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isActive ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                    } ${isCurrent ? "ring-2 ring-accent/30" : ""}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {i < ORDER_STEPS.length - 1 && (
                      <div className={`w-0.5 h-8 ${i < currentIdx ? "bg-accent" : "bg-border"}`} />
                    )}
                  </div>
                  <p className={`text-sm font-mono ${isActive ? "text-foreground" : "text-muted-foreground"} ${isCurrent ? "font-bold" : ""}`}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Payment section — Three-Point Check */}
        {canClaimPayment && !storePaused && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            {/* Point 1: Exact Amount */}
            <div className="border border-border rounded-none p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-primary text-primary-foreground w-5 h-5 flex items-center justify-center rounded-none">1</span>
                <p className="font-mono text-xs tracking-[0.15em] uppercase text-muted-foreground">{TRACKING.PAYMENT_AMOUNT}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="font-mono text-2xl font-bold">{formatPrice(order.total_price)}</p>
                <button
                  onClick={() => copyToClipboard(String(order.total_price), "Amount")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs tracking-wide uppercase border border-border rounded-none hover:bg-muted transition-colors text-muted-foreground hover:text-foreground font-mono"
                >
                  <Copy className="w-3 h-3" />
                  {ACTIONS.COPY}
                </button>
              </div>
              <p className="font-mono text-xs text-muted-foreground">{TRACKING.TRANSFER_EXACT}</p>
            </div>

            {/* Point 2: Recipient */}
            {hasPayment && (
              <div className="border border-border rounded-none p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-primary text-primary-foreground w-5 h-5 flex items-center justify-center rounded-none">2</span>
                  <p className="font-mono text-xs tracking-[0.15em] uppercase text-muted-foreground">{TRACKING.RECIPIENT}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xl font-bold">{recipientPhone}</p>
                    <button
                      onClick={() => copyToClipboard(recipientPhone!, "Number")}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs tracking-wide uppercase border border-border rounded-none hover:bg-muted transition-colors text-muted-foreground hover:text-foreground font-mono"
                    >
                      <Copy className="w-3 h-3" />
                      {ACTIONS.COPY}
                    </button>
                  </div>
                  {recipientName && <p className="font-mono text-sm font-bold text-foreground">{recipientName}</p>}
                </div>
              </div>
            )}

            {/* Point 3: Reference Code */}
            {order.reference_code && (
              <div className="border border-border rounded-none p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-primary text-primary-foreground w-5 h-5 flex items-center justify-center rounded-none">{hasPayment ? "3" : "2"}</span>
                  <p className="font-mono text-xs tracking-[0.15em] uppercase text-muted-foreground">{TRACKING.PAYMENT_CODE}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-3xl font-bold tracking-[0.2em]">{order.reference_code}</p>
                  <button
                    onClick={() => copyToClipboard(order.reference_code!, "Code")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs tracking-wide uppercase border border-border rounded-none hover:bg-muted transition-colors text-muted-foreground hover:text-foreground font-mono"
                  >
                    <Copy className="w-3 h-3" />
                    {ACTIONS.COPY}
                  </button>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  {TRACKING.PAYMENT_CODE_DESC} <span className="font-bold text-foreground">{order.reference_code}</span>
                </p>
              </div>
            )}

            {/* QR section */}
            {hasQR && (
              <div className="border border-border rounded-none p-4 space-y-3">
                <p className="font-mono text-xs tracking-[0.15em] uppercase text-muted-foreground">{TRACKING.PAY_VIA_QR}</p>
                <img src={recipientQr!} alt="Payment QR" className="w-full rounded-none border border-border object-cover max-h-80" loading="lazy" />
              </div>
            )}

            {/* Claim Payment */}
            <div className="space-y-3">
              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={claiming}
                className="w-full bg-primary text-primary-foreground py-3 text-sm font-mono font-bold tracking-wide uppercase rounded-none hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50"
              >
                {claiming ? TRACKING.SENDING : CHECKOUT.I_HAVE_PAID}
              </button>
            </div>
          </motion.div>
        )}

        {/* COD notice */}
        {order.payment_method === "cod" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="border border-border rounded-none p-4"
          >
            <p className="font-mono text-sm text-foreground">{CHECKOUT.COD_PAY_ON_DELIVERY}</p>
          </motion.div>
        )}

        {/* Seller limit reached */}
        {canClaimPayment && storePaused && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3"
          >
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
            <h3 className="font-mono text-lg font-bold text-destructive">{TRACKING.STORE_NOT_ACCEPTING}</h3>
            <p className="font-mono text-sm text-muted-foreground leading-relaxed">
              {TRACKING.STORE_NOT_ACCEPTING_DESC}
            </p>
          </motion.div>
        )}

        {/* Order details */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="space-y-4">
          <h3 className="font-mono text-xl font-bold">{TRACKING.ORDER_DETAILS}</h3>
          <div className="border border-border rounded-none divide-y divide-border">
            {order.order_items.map((item: any, i: number) => (
              <div key={i} className="p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-mono">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">× {item.quantity}</p>
                  </div>
                  <p className="text-sm font-mono">{formatPrice(item.product_price * item.quantity)}</p>
                </div>
                {["shipped", "delivered"].includes(order.status) && item.product_id && (
                  reviewedProducts.has(item.product_id) ? (
                    <p className="font-mono text-[10px] tracking-wide text-muted-foreground flex items-center gap-1">
                      <Star size={10} strokeWidth={1} className="fill-foreground text-foreground" /> Rated
                    </p>
                  ) : (
                    <div className="flex items-center gap-3">
                      <StarRating
                        rating={ratingInputs[item.product_id] || 0}
                        size={16}
                        interactive
                        onRate={(r) => setRatingInputs(prev => ({ ...prev, [item.product_id]: r }))}
                      />
                      {ratingInputs[item.product_id] && (
                        <button
                          onClick={() => handleSubmitReview(item.product_id)}
                          disabled={submittingReview === item.product_id}
                          className="font-mono text-[10px] tracking-[0.15em] uppercase px-3 py-1 border border-border hover:bg-muted transition-colors disabled:opacity-50"
                        >
                          {submittingReview === item.product_id ? "..." : "Rate"}
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            ))}
            {order.promo_code && (order.discount_amount ?? 0) > 0 && (
              <div className="flex justify-between items-center p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">🏷️ {order.promo_code}</span>
                </div>
                <p className="text-sm font-mono text-accent">-{formatPrice(order.discount_amount!)}</p>
              </div>
            )}
            <div className="flex justify-between items-center p-3 bg-muted/30">
              <p className="text-sm font-mono font-bold">{CHECKOUT.TOTAL}</p>
              <p className="font-mono text-lg font-bold">{formatPrice(order.total_price)}</p>
            </div>
          </div>
        </motion.div>

        {/* Contact Seller - Dynamic Platform */}
        {contactUrl && contactLabel && (
          <a
            href={contactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-accent text-accent-foreground text-sm tracking-wide uppercase rounded-none hover:opacity-90 transition-opacity active:scale-[0.98] font-mono"
          >
            <MessageCircle className="w-4 h-4" />
            {contactLabel}
          </a>
        )}

        {/* Request Return — shipped/delivered within 14 days — contact seller directly */}
        {["shipped", "delivered"].includes(order.status) && contactUrl && (
          (() => {
            const daysSince = (Date.now() - new Date(order.created_at).getTime()) / 86400000;
            if (daysSince > 14) return null;
            return (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="space-y-2">
                <p className="text-xs text-muted-foreground font-mono text-center">{RETURNS?.RETURN_DIRECTIONS || "Contact the seller to arrange a return"}</p>
                <a
                  href={contactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 border border-destructive/30 text-destructive text-sm tracking-wide uppercase rounded-none hover:bg-destructive/5 transition-colors active:scale-[0.98] font-mono"
                >
                  <Undo2 className="w-4 h-4" />
                  {contactLabel}
                </a>
              </motion.div>
            );
          })()
        )}

        {/* Return barcode — shown when seller has issued a return label */}

        <footer className="text-center pt-4">
          <p className="text-xs text-muted-foreground font-mono">Dokan · Dhaka, Bangladesh</p>
        </footer>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && order && (
        <>
          <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50" onClick={() => !claiming && setShowConfirmDialog(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] border border-border rounded-none bg-background p-8 w-full max-w-sm space-y-5"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              <h3 className="font-mono text-lg font-bold">{TRACKING.CONFIRM_PAYMENT}</h3>
            </div>
            <p className="font-mono text-sm text-muted-foreground leading-relaxed">
              {TRACKING.CONFIRM_TRANSFER} <span className="font-bold text-foreground">{formatPrice(order.total_price)}</span>
              {order.reference_code && (
                <> {TRACKING.AND_ENTERED_CODE} <span className="font-bold text-foreground">{order.reference_code}</span></>
              )}.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={claiming}
                className="flex-1 py-2.5 text-sm font-mono tracking-wide uppercase border border-border rounded-none hover:bg-muted transition-colors"
              >
                {ACTIONS.CANCEL}
              </button>
              <button
                onClick={handleClaimPaid}
                disabled={claiming}
                className="flex-1 py-2.5 text-sm font-mono font-bold tracking-wide uppercase bg-primary text-primary-foreground rounded-none hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50"
              >
                {claiming ? TRACKING.SENDING : TRACKING.YES_CONFIRM}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default OrderTracking;