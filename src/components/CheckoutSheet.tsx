import { useState, useEffect, useMemo, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, Banknote, MessageCircle, Wallet as WalletIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import { useLabels } from "@/hooks/useLabels";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateVariant, translateVariantType } from "@/lib/translateVariant";
import { isPlaceholder, getPlaceholderImage } from "@/lib/placeholders";
import { getOptimizedProductImageUrl } from "@/lib/imageTransform";
import CityDropdown from "@/components/CityDropdown";
import PaymentView from "@/components/PaymentView";
import OrderConfirmation from "@/components/OrderConfirmation";
import type { CartItem } from "@/types/store";
import { checkStorePaused } from "@/services/storeService";
import { fetchStorePromoCode } from "@/services/orderService";
import {
  normalizePaymentMethods, getEnabledMethods, methodNeedsPayment,
  PAYMENT_METHOD_LABELS,
  type PaymentMethodKey,
} from "@/constants/paymentMethods";
import { normalizeCarriers } from "@/constants/delivery";
import { buildFullAddress, isAddressTooLong } from "@/lib/address";
import bkashLogo from "@/assets/wallets/bkash.svg";
import nagadLogo from "@/assets/wallets/nagad.svg";
import rocketLogo from "@/assets/wallets/rocket.svg";
import upayLogo from "@/assets/wallets/upay.svg";

interface CheckoutSheetProps {
  cart: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (productId: string, delta: number, selectedVariants?: Record<string, string>) => void;
  onRemove: (productId: string, selectedVariants?: Record<string, string>) => void;
  clearCart?: () => void;
  onOrderComplete?: (orderId: string) => void;
  storeId?: string;
  storeName?: string;
  taxEnabled?: boolean;
  taxPercent?: number;
  paymentMethods?: unknown;
  deliveryCarriers?: unknown;
  paymentQrImage?: string | null;
  paymentPhone?: string | null;
  paymentName?: string | null;
}

import { PAYMENT_WINDOW_MS } from "@/constants/business";

const PAYMENT_WINDOW = PAYMENT_WINDOW_MS;

const CheckoutSheet = forwardRef<HTMLDivElement, CheckoutSheetProps>(
  ({ cart, onClose, onUpdateQuantity, onRemove, clearCart, onOrderComplete, storeId, storeName, taxEnabled, taxPercent = 0, paymentMethods, deliveryCarriers, paymentQrImage, paymentPhone }, ref) => {
    const { CHECKOUT, MESSAGES, ACTIONS } = useLabels();
    const { language } = useLanguage();
    const [step, setStep] = useState<"cart" | "pay" | "done">("cart");
    const [form, setForm] = useState({ name: "", phone: "", city: "", zip: "", street: "", house: "" });
    const [loading, setLoading] = useState(false);
    const [order, setOrder] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState(PAYMENT_WINDOW);
    const [promoCode, setPromoCode] = useState("");
    const [promoDiscount, setPromoDiscount] = useState<{ type: "percent" | "amount"; value: number } | null>(null);
    const [promoApplied, setPromoApplied] = useState(false);
    const [promoLoading, setPromoLoading] = useState(false);
    const [sellerLimitReached, setSellerLimitReached] = useState(false);

    const pmConfig = useMemo(() => normalizePaymentMethods(paymentMethods), [paymentMethods]);
    const carriers = useMemo(() => normalizeCarriers(deliveryCarriers), [deliveryCarriers]);
    const methodList = useMemo(() => {
      const list = getEnabledMethods(pmConfig);
      // Legacy stores: nothing configured → fall back to the generic QR if present
      if (list.length === 0 && (paymentQrImage || paymentPhone)) return ["bank" as PaymentMethodKey];
      // bank is only usable with its QR/phone
      return list.filter((m) => m !== "bank" || !!(paymentQrImage || paymentPhone));
    }, [pmConfig, paymentQrImage, paymentPhone]);
    const methodListKey = methodList.join("|");
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethodKey | null>(null);

    // Reset on (re)open; auto-select when exactly one method exists
    useEffect(() => {
      setSelectedMethod(methodList.length === 1 ? methodList[0] : null);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId, methodListKey]);

    useEffect(() => {
      if (!storeId) return;
      checkStorePaused(storeId)
        .then(setSellerLimitReached)
        .catch((error) => {
          console.error("Failed to check store status:", error);
          setSellerLimitReached(false);
        });
    }, [storeId]);

    const subtotal = useMemo(() => cart.reduce((s, i) => s + i.product.price * i.quantity, 0), [cart]);
    const totalQuantity = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);

    const discountAmount = useMemo(() => {
      if (!promoDiscount) return 0;
      if (promoDiscount.type === "percent") return Math.round(subtotal * promoDiscount.value / 100);
      return Math.min(promoDiscount.value, subtotal);
    }, [promoDiscount, subtotal]);

    const afterDiscount = subtotal - discountAmount;
    const taxAmount = taxEnabled ? Math.round(afterDiscount * taxPercent / 100) : 0;
    const total = afterDiscount + taxAmount;

    const applyPromoCode = async () => {
      if (!promoCode.trim() || !storeId) return;
      setPromoLoading(true);
      try {
        const { data, error } = await fetchStorePromoCode(storeId, promoCode.trim().toUpperCase());

        if (error || !data) {
          toast.error(CHECKOUT.PROMO_INVALID || "Invalid promo code");
          setPromoDiscount(null);
          setPromoApplied(false);
          setPromoLoading(false);
          return;
        }

        const now = new Date();
        if (data.start_date && new Date(data.start_date) > now) {
          toast.error(CHECKOUT.PROMO_NOT_STARTED || "This promo code is not active yet");
          setPromoLoading(false);
          return;
        }
        if (data.end_date && new Date(data.end_date) < now) {
          toast.error(CHECKOUT.PROMO_EXPIRED || "This promo code has expired");
          setPromoLoading(false);
          return;
        }
        if (data.max_uses && data.used_count >= data.max_uses) {
          toast.error(CHECKOUT.PROMO_MAX_USED || "This promo code has reached its maximum uses");
          setPromoLoading(false);
          return;
        }
        if (data.min_cart_amount && subtotal < data.min_cart_amount) {
          toast.error(`${CHECKOUT.PROMO_MIN_CART || "Minimum cart amount"}: ${formatPrice(data.min_cart_amount)}`);
          setPromoLoading(false);
          return;
        }
        if (data.min_quantity && totalQuantity < data.min_quantity) {
          toast.error(`${CHECKOUT.PROMO_MIN_QTY || "Minimum quantity"}: ${data.min_quantity}`);
          setPromoLoading(false);
          return;
        }

        setPromoDiscount({ type: data.discount_type as "percent" | "amount", value: Number(data.discount_value) });
        setPromoApplied(true);
        toast.success(CHECKOUT.PROMO_APPLIED || "Promo code applied!");
      } catch {
        toast.error(MESSAGES.SYSTEM_ERROR);
      } finally {
        setPromoLoading(false);
      }
    };

    useEffect(() => {
      if (step !== "pay" || !order) return;
      const timer = setInterval(() => {
        const remaining = Math.max(0, PAYMENT_WINDOW - (Date.now() - order.createdAt));
        setTimeLeft(remaining);
        if (remaining === 0) clearInterval(timer);
      }, 1000);
      return () => clearInterval(timer);
    }, [step, order]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.name || form.phone.length < 10 || !form.city || !form.street) return toast.error(MESSAGES.FILL_ALL_FIELDS);

      const fullAddress = buildFullAddress(form);
      if (isAddressTooLong(fullAddress)) return toast.error(CHECKOUT.ADDRESS_TOO_LONG);
      if (methodList.length > 0 && !selectedMethod) return toast.error(CHECKOUT.CHOOSE_METHOD);

      setLoading(true);
      try {
        const anonKey =
          (import.meta.env as Record<string, string | undefined>).VITE_SUPABASE_ANON_KEY ??
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        const response = await window.fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-order?v=${Date.now()}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${anonKey}`,
              apikey: anonKey,
            },
            body: JSON.stringify({
              storeId,
              customerName: form.name,
              customerPhone: form.phone,
              customerAddress: fullAddress,
              items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity, selectedVariants: i.selectedVariants })),
              promoCode: promoApplied ? promoCode : undefined,
              discountAmount: promoApplied ? discountAmount : 0,
              paymentMethod: selectedMethod ?? undefined,
            }),
          },
        );

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          console.error("create-order request failed", response.status, result);
          const errorMsg = result?.error || MESSAGES.ORDER_NOT_ACCEPTED;
          toast.error(errorMsg);
          return;
        }

        setOrder({ ...result, createdAt: Date.now() });
        if (selectedMethod && !methodNeedsPayment(selectedMethod)) {
          // COD / contact-us: order lands "confirmed" server-side; no payment step
          if (clearCart) clearCart();
          setStep("done");
        } else {
          setStep("pay");
        }
      } catch (err: any) {
        toast.error(`${MESSAGES.SYSTEM_ERROR}: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    const handleIAmPaid = async () => {
      setLoading(true);
      try {
        const { error } = await supabase.functions.invoke("claim-payment", {
          body: { orderId: order.order_id, referenceCode: order.reference_code },
        });
        if (error) throw error;
        if (clearCart) clearCart();
        if (onOrderComplete) {
          onOrderComplete(order.order_id);
        } else {
          setStep("done");
        }
      } catch (err) {
        toast.error(MESSAGES.CLAIM_ERROR);
      } finally {
        setLoading(false);
      }
    };

    const copy = (val: string) => {
      navigator.clipboard.writeText(val);
      toast.success(MESSAGES.COPIED);
    };

    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-40"
        />
        <motion.div
          ref={ref}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 flex flex-col shadow-xl bg-background"
        >
          <div className="p-6 border-b border-border flex justify-between items-center sticky top-0 bg-card">
            <h2 className="font-bold uppercase tracking-widest text-lg text-foreground">
              {step === "cart" ? CHECKOUT.CART : step === "pay" ? CHECKOUT.PAYMENT : CHECKOUT.DONE}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-muted transition-colors text-foreground">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {step === "cart" && (
              <div className="p-6 space-y-8 bg-background">
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={JSON.stringify({ id: item.product.id, variants: item.selectedVariants })} className="flex gap-4">
                      <img 
                        src={getOptimizedProductImageUrl(
                          isPlaceholder(item.product.image) ? getPlaceholderImage(item.product.id) : item.product.image, 
                          150,
                          70,
                          "webp"
                        )} 
                        className="w-16 h-20 object-cover bg-muted" 
                      />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-foreground">{item.product.name}</h4>
                         {item.selectedVariants && Object.entries(item.selectedVariants).length > 0 && (
                          <p className="text-[10px] mt-0.5 text-muted-foreground">
                            {Object.entries(item.selectedVariants).map(([type, value]) => `${translateVariantType(type, language)}: ${translateVariant(value, language)}`).join(', ')}
                          </p>
                        )}
                        <p className="text-xs font-mono text-foreground">{formatPrice(item.product.price)}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.product.id, -1, item.selectedVariants)}
                            className="w-6 h-6 flex items-center justify-center border border-foreground/50 hover:bg-muted transition-colors"
                          >
                            <Minus size={14} strokeWidth={2} className="text-foreground" />
                          </button>
                          <span className="text-xs font-mono w-4 text-center text-foreground">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.product.id, 1, item.selectedVariants)}
                            disabled={item.quantity >= item.product.stock}
                            className="w-6 h-6 flex items-center justify-center border border-foreground/50 hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Plus size={14} strokeWidth={2} className="text-foreground" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-foreground pt-4 space-y-4 bg-background">
                  {/* Subtotal / Discount / Tax / Total */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">{CHECKOUT.SUBTOTAL}</span>
                      <span className="text-sm font-mono text-foreground">{formatPrice(subtotal)}</span>
                    </div>
                    {promoApplied && discountAmount > 0 && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs uppercase tracking-wider text-accent">
                          {CHECKOUT.PROMO_CODE} ({promoCode})
                        </span>
                        <span className="text-sm font-mono text-accent">-{formatPrice(discountAmount)}</span>
                      </div>
                    )}
                    {taxEnabled && taxPercent > 0 ? (
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground">{CHECKOUT.TAX} ({taxPercent}%)</span>
                        <span className="text-sm font-mono text-foreground">{formatPrice(taxAmount)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground">{CHECKOUT.TAX}</span>
                        <span className="text-[10px] italic text-muted-foreground">{CHECKOUT.TAX_INCLUDED}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline pt-1 border-t border-border">
                      <span className="text-sm italic underline underline-offset-4 font-medium text-foreground">{CHECKOUT.TOTAL}</span>
                      <span className="text-2xl font-black text-foreground">{formatPrice(total)}</span>
                    </div>
                  </div>

                  {/* Promo Code */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{CHECKOUT.PROMO_CODE}</label>
                    {promoApplied ? (
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-mono font-bold text-accent">✓ {promoCode}</span>
                        <button
                          type="button"
                          onClick={() => { setPromoApplied(false); setPromoDiscount(null); setPromoCode(""); }}
                          className="text-xs uppercase tracking-wide underline text-muted-foreground"
                        >
                          {ACTIONS.DELETE || "Remove"}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          placeholder={CHECKOUT.PROMO_PLACEHOLDER}
                          className="flex-1 border-b border-border py-2 outline-none focus:border-ring transition-colors bg-transparent text-sm text-foreground"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        />
                        <button
                          type="button"
                          onClick={applyPromoCode}
                          disabled={!promoCode.trim() || promoLoading}
                          className="px-4 py-2 text-xs font-bold uppercase tracking-wide border border-foreground text-foreground hover:bg-muted transition-colors disabled:opacity-30"
                        >
                          {promoLoading ? "..." : CHECKOUT.PROMO_APPLY}
                        </button>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3 pt-4">
                    <input
                      placeholder={CHECKOUT.YOUR_NAME}
                      className="w-full border-b border-border py-3 outline-none focus:border-ring transition-colors bg-transparent text-foreground"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                    <input
                      placeholder={CHECKOUT.PHONE}
                      className="w-full border-b border-border py-3 outline-none focus:border-ring transition-colors bg-transparent text-foreground"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      required
                    />
                    <p className="text-[10px] italic text-muted-foreground">{CHECKOUT.PHONE_HINT}</p>
                    {carriers.length > 0 && (
                      <div className="border-b border-border py-3">
                        <p className="text-[10px] uppercase tracking-wider mb-1 text-muted-foreground">{CHECKOUT.DELIVERY_VIA}</p>
                        <p className="text-sm font-medium text-foreground">{carriers.map((c) => c.name).join(", ")}</p>
                      </div>
                    )}

                    {/* Country (pre-selected) */}
                    <div className="border-b border-border py-3">
                      <p className="text-[10px] uppercase tracking-wider mb-1 text-muted-foreground">{CHECKOUT.COUNTRY}</p>
                      <p className="text-sm font-medium text-foreground">{CHECKOUT.BANGLADESH}</p>
                    </div>

                    {/* City dropdown */}
                    <CityDropdown
                      value={form.city}
                      onChange={(city) => setForm({ ...form, city })}
                      placeholder={CHECKOUT.SELECT_CITY}
                      searchPlaceholder={ACTIONS.SEARCH}
                    />

                    {/* ZIP Code */}
                    <div>
                      <input
                        placeholder={CHECKOUT.ZIP_CODE}
                        className="w-full border-b border-border py-3 outline-none focus:border-ring transition-colors bg-transparent text-foreground"
                        value={form.zip}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setForm({ ...form, zip: val });
                        }}
                        inputMode="numeric"
                        maxLength={6}
                      />
                      <p className="text-[10px] italic mt-1 text-muted-foreground">{CHECKOUT.ZIP_HINT}</p>
                    </div>

                    {/* Street / Building */}
                    <div>
                      <input
                        placeholder={CHECKOUT.STREET_BUILDING}
                        className="w-full border-b border-border py-3 outline-none focus:border-ring transition-colors bg-transparent text-foreground"
                        value={form.street}
                        onChange={(e) => setForm({ ...form, street: e.target.value })}
                        maxLength={250}
                        required
                      />
                      <p className="text-[10px] italic mt-1 text-muted-foreground">
                        {CHECKOUT.ADDRESS_CHAR_COUNT.replace("{count}", String(buildFullAddress(form).length))}
                      </p>
                      <p className="text-[10px] italic mt-1 text-muted-foreground">{CHECKOUT.STREET_HINT}</p>
                    </div>

                    {/* House / Flat / Office */}
                    <div>
                      <input
                        placeholder={CHECKOUT.HOUSE_FLAT}
                        className="w-full border-b border-border py-3 outline-none focus:border-ring transition-colors bg-transparent text-foreground"
                        value={form.house}
                        onChange={(e) => setForm({ ...form, house: e.target.value })}
                      />
                      <p className="text-[10px] italic mt-1 text-muted-foreground">{CHECKOUT.HOUSE_HINT}</p>
                    </div>

                    {methodList.length > 1 && (
                      <div className="py-4 space-y-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{CHECKOUT.CHOOSE_METHOD}</p>
                        {methodList.map((m) => {
                          const wallet = m !== "bank" && m !== "cod" && m !== "contact_us" ? pmConfig.wallets[m] : undefined;
                          const active = selectedMethod === m;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setSelectedMethod(m)}
                              className={`w-full flex items-center gap-3 border p-4 text-left transition-colors ${active ? "border-foreground bg-muted/50" : "border-border hover:border-foreground/60"}`}
                            >
                              {wallet ? (
                                <img src={{ bkash: bkashLogo, nagad: nagadLogo, rocket: rocketLogo, upay: upayLogo }[m as "bkash" | "nagad" | "rocket" | "upay"]} alt="" className="w-8 h-8 rounded-sm" />
                              ) : m === "bank" ? (
                                <WalletIcon className="w-6 h-6 text-foreground" />
                              ) : m === "cod" ? (
                                <Banknote className="w-6 h-6 text-foreground" />
                              ) : (
                                <MessageCircle className="w-6 h-6 text-foreground" />
                              )}
                              <span className="text-sm font-medium text-foreground">
                                {m === "cod" ? CHECKOUT.COD_LABEL : m === "contact_us" ? CHECKOUT.CONTACT_LABEL : PAYMENT_METHOD_LABELS[m]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <button
                      disabled={loading || cart.length === 0}
                      className="w-full py-4 mt-4 font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-30 transition-opacity bg-primary text-primary-foreground"
                    >
                      {loading ? CHECKOUT.PLEASE_WAIT : CHECKOUT.PLACE_ORDER}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {step === "pay" && order && (
              <PaymentView
                order={order}
                total={total}
                timeLeft={timeLeft}
                loading={loading}
                CHECKOUT={CHECKOUT}
                ACTIONS={ACTIONS}
                onIAmPaid={handleIAmPaid}
                onCopy={copy}
              />
            )}

            {step === "done" && (
              <OrderConfirmation CHECKOUT={CHECKOUT} ACTIONS={ACTIONS} onClose={onClose} />
            )}
          </div>
        </motion.div>
      </>
    );
  },
);

CheckoutSheet.displayName = "CheckoutSheet";
export default CheckoutSheet;
