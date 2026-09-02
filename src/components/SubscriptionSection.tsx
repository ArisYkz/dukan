import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, Loader2, X, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import { applyPercentDiscount } from "@/lib/billing";
import { useLabels } from "@/hooks/useLabels";

const QR_IMAGE_URL = `https://bmeqacenolbuxwirxpit.supabase.co/storage/v1/object/public/qr-codes/IPQR.png`;

interface SubscriptionSectionProps {
  userId: string;
  profile: {
    plan_type: string;
    subscription_status: string;
    subscription_screenshot_url: string | null;
    subscription_expiry: string | null;
  };
  isPro: boolean;
  onDataChange: () => void;
}

const SubscriptionSection = ({ userId, profile, isPro, onDataChange }: SubscriptionSectionProps) => {
  const { BILLING, MESSAGES } = useLabels();
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(profile.subscription_screenshot_url);
  const inputRef = useRef<HTMLInputElement>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);

  const [dbStatus, setDbStatus] = useState(profile.subscription_status);
  const [dbPlan, setDbPlan] = useState(profile.plan_type);

  // Watch profile changes (Pro is per-user now)
  useEffect(() => {
    const channel = supabase
      .channel('profile-sub-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${userId}` },
      (payload: any) => { setDbStatus(payload.new.subscription_status); setDbPlan(payload.new.plan_type); onDataChange(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const isActive = dbPlan === "standard" && dbStatus === "active";
  const isPending = dbStatus === "pre_authorized";

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", promoCode.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
        toast.error(BILLING.PROMO_INVALID);
        setPromoApplied(false);
        setPromoDiscount(0);
        return;
      }

      setPromoDiscount(data.discount_percent || 0);
      setPromoApplied(true);
      toast.success(BILLING.PROMO_APPLIED);
    } catch {
      toast.error(BILLING.PROMO_INVALID);
    }
  };

  const getDiscountedPrice = (price: number) => applyPercentDiscount(price, promoDiscount);

  const getExpiryInfo = () => {
    if (!profile.subscription_expiry) return null;
    return new Date(profile.subscription_expiry);
  };
  const expiryDate = isActive ? getExpiryInfo() : null;

  return (
    <div className="space-y-6 md:space-y-8">
      <h2 className="text-base md:text-xl font-semibold tracking-[0.2em] uppercase text-foreground opacity-90 mb-4 md:mb-8">{BILLING.TITLE}</h2>

      {/* Promo Code Section */}
      <div className="flex items-end gap-2 md:gap-3">
        <div className="flex-1">
          <label className="block font-mono text-[10px] md:text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1 md:mb-1.5">
            <Tag className="w-3 h-3 inline mr-1" />{BILLING.PROMO_CODE}
          </label>
          <input
            type="text"
            placeholder={BILLING.PROMO_PLACEHOLDER}
            value={promoCode}
            onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoApplied(false); setPromoDiscount(0); }}
            className="w-full border border-border bg-background px-2 md:px-3 py-2 md:py-2.5 font-mono text-[11px] md:text-xs tracking-wider uppercase text-foreground outline-none focus:border-foreground/40 transition-colors"
          />
        </div>
        <button
          onClick={handleApplyPromo}
          disabled={!promoCode.trim()}
          className="border border-foreground/80 px-3 md:px-5 py-2 md:py-2.5 font-body text-[9px] md:text-[10px] tracking-[0.15em] uppercase hover:bg-foreground hover:text-background transition-all disabled:opacity-30"
        >
          {BILLING.APPLY}
        </button>
      </div>
      {promoApplied && (
        <p className="font-mono text-[10px] text-accent tracking-wider">✓ {promoDiscount}% discount applied</p>
      )}

      <div className="max-w-md mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className={`text-left w-full border border-border rounded-none p-3 md:p-6 flex flex-col relative ${isActive || isPending ? "bg-muted/50 border-foreground/40 shadow-sm" : "bg-background hover:border-foreground/20"}`}
        >
          {(isActive || isPending) && (
            <div className="absolute top-3 md:top-4 right-3 md:right-4">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-pulse" />
                <span className="font-mono text-[9px] md:text-[10px] tracking-[0.1em] uppercase opacity-60">{isActive ? BILLING.ACTIVE : BILLING.PENDING}</span>
              </div>
              {isActive && expiryDate && (
                <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground mt-0.5 md:mt-1">
                  {BILLING.ENDS_ON || "Ends"}: {expiryDate.toLocaleDateString()} {expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          )}
          <div className="mb-3 md:mb-6">
            <p className="font-body text-[9px] md:text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-0.5 md:mb-1">{BILLING.STANDARD_SUB}</p>
            <h3 className="font-body text-[11px] md:text-sm font-semibold tracking-[0.12em] uppercase text-foreground">{BILLING.STANDARD}</h3>
          </div>
          <div className="space-y-1.5 md:space-y-3 mb-4 md:mb-8 flex-grow">
            {(BILLING.FEATURES_STANDARD as string[]).map((f: string) => (<p key={f} className="font-mono text-[10px] md:text-xs tracking-wide text-muted-foreground uppercase leading-relaxed">• {f}</p>))}
          </div>
          <div className="pt-3 md:pt-4 border-t border-border/40">
            <div className="text-right mb-3 md:mb-4">
              {promoApplied && promoDiscount > 0 && (
                <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground line-through">{formatPrice(15000)}</p>
              )}
              <p className="font-mono text-[11px] md:text-sm text-foreground/80">{formatPrice(getDiscountedPrice(15000))}</p>
            </div>
            {!isActive && !isPending ? (
              <button
                onClick={() => setShowModal(true)}
                className="w-full border border-foreground/80 py-2 md:py-2.5 font-body text-[10px] md:text-[11px] tracking-[0.15em] uppercase transition-all hover:bg-foreground hover:text-background"
              >
                {BILLING.SELECT}
              </button>
            ) : (
              <div className={`w-full py-2 md:py-2.5 text-center font-body text-[10px] md:text-[11px] tracking-[0.15em] uppercase border ${isActive ? 'border-foreground/20 text-foreground/60' : 'border-border/40 text-muted-foreground/40'}`}>
                {isActive ? BILLING.ACTIVE : BILLING.PENDING}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Modal: QR */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/95 backdrop-blur-sm">
          <div className="bg-background border border-border p-8 md:p-10 max-w-sm w-full relative rounded-none shadow-2xl">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            <h4 className="font-body text-xs font-semibold tracking-[0.2em] uppercase mb-8 text-center italic">{BILLING.KASPI_QR_PAYMENT}</h4>
            <div className="bg-card p-6 mb-8 border border-border flex justify-center shadow-inner">
              <img src={QR_IMAGE_URL} alt="QR" className="w-40 h-40 object-contain mix-blend-multiply grayscale opacity-90" />
            </div>
            {promoApplied && promoDiscount > 0 && (
              <div className="mb-4 p-3 border border-accent/30 bg-accent/5 text-center">
                <p className="font-mono text-[10px] text-accent uppercase tracking-wider">
                  Promo: {promoCode} • {promoDiscount}% off → {formatPrice(getDiscountedPrice(15000))}
                </p>
              </div>
            )}
            {!screenshotUrl ? (
              <div onClick={() => inputRef.current?.click()} className="border border-dashed border-border p-8 flex flex-col items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors group">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-muted-foreground/30 group-hover:text-foreground" />}
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{BILLING.UPLOAD_RECEIPT}</p>
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                   const file = e.target.files?.[0];
                   if (file) {
                     setUploading(true);
                     const fileName = `${userId}/sub/${crypto.randomUUID()}`;
                     supabase.storage.from("store-assets").upload(fileName, file).then(() => {
                       const { data: { publicUrl } } = supabase.storage.from("store-assets").getPublicUrl(fileName);
                       supabase.from("profiles").update({
                         subscription_screenshot_url: publicUrl,
                         subscription_status: "pre_authorized",
                         plan_type: "standard"
                       }).eq("user_id", userId).then(() => {
                         setScreenshotUrl(publicUrl); setDbStatus("pre_authorized"); setUploading(false);
                       });
                     });
                   }
                }} />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="border border-border p-1 bg-muted/50"><img src={screenshotUrl} className="w-full h-32 object-contain grayscale" /></div>
                <button onClick={async () => {
                    await supabase.functions.invoke('notify-admin', { body: { user_id: userId, plan_type: "standard", screenshot_url: screenshotUrl, amount: formatPrice(getDiscountedPrice(15000)), promo_code: promoApplied ? promoCode : null } });
                    setShowModal(false);
                    toast.success(MESSAGES.PAYMENT_SENT);
                  }} className="w-full bg-foreground text-background py-4 font-body text-[10px] tracking-[0.2em] uppercase font-bold hover:opacity-90 active:scale-[0.98] transition-all">
                  {BILLING.CONFIRM_PAYMENT}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionSection;
