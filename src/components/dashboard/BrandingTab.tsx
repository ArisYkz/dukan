import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, Facebook, Instagram, MessageCircle, Bell, Crown,
  Info, Lock, Check, ChevronDown, Globe, Link as LinkIcon,
  Smartphone, User, Percent, Store, Banknote, Phone,
} from "lucide-react";
import bkashLogo from "@/assets/wallets/bkash.svg";
import nagadLogo from "@/assets/wallets/nagad.svg";
import rocketLogo from "@/assets/wallets/rocket.svg";
import upayLogo from "@/assets/wallets/upay.svg";
import {
  WALLET_KEYS, type WalletKey, type PaymentMethodsConfig,
  walletIsUsable, PAYMENT_METHOD_LABELS,
} from "@/constants/paymentMethods";
import { KNOWN_CARRIERS, type CarrierEntry } from "@/constants/delivery";
import { STORE_THEMES } from "@/lib/storeThemes";
import ImageCropUpload from "@/components/ImageCropUpload";
import type { StoreRow, BrandFormState } from "@/types/store";
import { checkSlugAvailability } from "@/services/storeService";
import { useLabels } from "@/hooks/useLabels";
import QrMarketingCard from "@/components/dashboard/QrMarketingCard";
import HelpButton from "@/components/dashboard/HelpButton";
import { isSlugOffensive, isSlugReserved } from "@/lib/slugFilter";

const WALLET_LOGOS: Record<WalletKey, string> = { bkash: bkashLogo, nagad: nagadLogo, rocket: rocketLogo, upay: upayLogo };

interface BrandingTabProps {
  store: StoreRow;
  userId: string;
  brandForm: BrandFormState;
  setBrandForm: React.Dispatch<React.SetStateAction<BrandFormState>>;
  savingBrand: boolean;
  onSave: () => void;
  isSlugTaken: boolean;
  isCheckingSlug: boolean;
  setIsSlugTaken: (taken: boolean) => void;
  setIsCheckingSlug: (checking: boolean) => void;
  isPro?: boolean;
  onShowUpgrade?: () => void;
  isSlugOffensiveState?: boolean;
  setIsSlugOffensive?: (val: boolean) => void;
}

/* ─── Reusable pill toggle ─── */
const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    onClick={onChange}
    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-none transition-all duration-200 ease-in-out ${
      enabled ? "bg-foreground" : "bg-muted-foreground/20"
    }`}
  >
    <span
      className={`inline-block h-3.5 w-3.5 rounded-none bg-background shadow-sm transition-all duration-200 ease-in-out ${
        enabled ? "translate-x-[18px]" : "translate-x-[3px]"
      }`}
    />
  </button>
);

/* ─── Section card wrapper ─── */
const SectionCard = ({
  title,
  description,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-none border border-border/40 bg-card p-5 md:p-6 space-y-5 transition-colors duration-200 hover:border-border/60 ${
      className || ""
    }`}
  >
    {title && (
      <div className="space-y-1">
        <h3 className="text-xs md:text-sm font-semibold tracking-[0.2em] uppercase text-foreground opacity-90">{title}</h3>
        {description && (
          <p className="text-xs md:text-sm text-muted-foreground/60 leading-relaxed">{description}</p>
        )}
      </div>
    )}
    {children}
  </div>
);

/* ─── Field wrapper ─── */
const Field = ({
  label,
  icon,
  children,
  hint,
  required,
}: {
  label?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
}) => {
  const { BRANDING } = useLabels();
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-muted-foreground/50 w-3.5 h-3.5">{icon}</span>}
          <label className="text-xs md:text-sm font-medium text-foreground/60">{label}</label>
          {required && <span className="text-xs font-medium text-primary/70 uppercase tracking-wider">{BRANDING.REQUIRED}</span>}
        </div>
      )}
      {children}
      {hint && <p className="text-xs md:text-sm text-muted-foreground/40 leading-relaxed">{hint}</p>}
    </div>
  );
};

/* ─── Input style ─── */
const inputClass =
  "w-full h-9 md:h-10 bg-transparent border border-border/50 rounded-none px-3 md:px-3.5 py-2 md:py-2.5 text-xs md:text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/20 transition-all duration-150";

/* ─── WhatsApp icon (inline svg) ─── */
const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

/* ─── TikTok icon ─── */
const TikTokIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

/* ─── Platform row (used inside Social card) ─── */
const PlatformRow = ({
  icon,
  name,
  isPrimary,
  onSetPrimary,
  showToggle,
  onToggleShow,
  children,
  required,
}: {
  icon: React.ReactNode;
  name: string;
  isPrimary: boolean;
  onSetPrimary: () => void;
  showToggle?: boolean;
  onToggleShow?: () => void;
  children: React.ReactNode;
  required?: boolean;
}) => {
  const { BRANDING } = useLabels();
  return (
  <div className="space-y-2.5 pb-4 border-b border-border/20 last:border-b-0 last:pb-0">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground/50 w-4 h-4">{icon}</span>
        <span className="text-xs md:text-sm font-medium text-foreground/70">{name}</span>
        {required && <span className="text-xs font-medium text-primary/70 uppercase tracking-wider">{BRANDING.REQUIRED}</span>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSetPrimary}
          className={`text-xs font-medium uppercase tracking-wider transition-colors ${
            isPrimary ? "text-foreground" : "text-muted-foreground/40 hover:text-foreground/60"
          }`}
        >
          {isPrimary ? "Primary" : "Set primary"}
        </button>
        {onToggleShow && showToggle !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground/40 uppercase tracking-wider">{BRANDING.SHOW_ON_STORE}</span>
            <Toggle enabled={showToggle} onChange={onToggleShow} />
          </div>
        )}
      </div>
    </div>
    {children}
  </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const BrandingTab = ({
  store, userId, brandForm, setBrandForm, savingBrand, onSave,
  isSlugTaken, isCheckingSlug, setIsSlugTaken, setIsCheckingSlug,
  isPro = false, onShowUpgrade,
}: BrandingTabProps) => {
  const { BRANDING, ACTIONS, PAYMENT_METHODS } = useLabels();
  const [themeExpanded, setThemeExpanded] = useState(false);
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFree = !isPro;
  const slugCustomized = (store as any).slug_customized === true;
  const slugEditable = isPro || !slugCustomized;

  const handleSlugChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawSlug = e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setBrandForm((prev) => ({ ...prev, slug: rawSlug }));

    if (slugTimerRef.current) clearTimeout(slugTimerRef.current);

    if (rawSlug.length > 2) {
      if (isSlugOffensive(rawSlug) || isSlugReserved(rawSlug)) {
        setIsSlugTaken(true);
        return;
      }
      setIsCheckingSlug(true);
      slugTimerRef.current = setTimeout(async () => {
        const taken = await checkSlugAvailability(rawSlug, store.id);
        setIsSlugTaken(taken);
        setIsCheckingSlug(false);
      }, 400);
    } else {
      setIsSlugTaken(false);
    }
  }, [store.id, setBrandForm, setIsSlugTaken, setIsCheckingSlug]);

  const set = (field: keyof BrandFormState, value: any) =>
    setBrandForm((prev) => ({ ...prev, [field]: value }));

  const setMethods = (fn: (prev: PaymentMethodsConfig) => PaymentMethodsConfig) =>
    setBrandForm((prev) => ({ ...prev, payment_methods: fn(prev.payment_methods) }));

  const setWallet = (key: WalletKey, patch: Partial<{ enabled: boolean; phone: string; qr_url: string | null }>) =>
    setMethods((prev) => ({
      ...prev,
      wallets: {
        ...prev.wallets,
        [key]: { enabled: false, phone: "", qr_url: null, ...prev.wallets[key], ...patch },
      },
    }));

  const setCarriers = (updater: (prev: CarrierEntry[]) => CarrierEntry[]) =>
    setBrandForm((prev) => ({ ...prev, delivery_carriers: updater(prev.delivery_carriers) }));

  const [customCarrier, setCustomCarrier] = useState("");
  const addCustomCarrier = () => {
    const name = customCarrier.trim();
    if (!name) return;
    // Duplicate check against committed state: functional updaters don't run
    // synchronously, so they can't report back whether the add happened.
    const exists = brandForm.delivery_carriers.some(
      (c) => c.name.toLowerCase() === name.toLowerCase(),
    );
    if (!exists) {
      setCarriers((prev) => [...prev, { name, custom: true }]);
      setCustomCarrier("");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 md:space-y-8">
      {/* ── WhatsApp Warning ── */}
      {!brandForm.whatsapp_phone && brandForm.social_platform === "whatsapp" && (
        <div className="flex items-start gap-3 rounded-none border border-destructive/20 bg-destructive/[0.04] px-5 py-4">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-xs md:text-sm font-semibold text-destructive mb-0.5">{BRANDING.WHATSAPP_WARN_TITLE}</p>
            <p className="text-xs md:text-sm text-destructive/70">{BRANDING.WHATSAPP_WARN_DESC}</p>
          </div>
        </div>
      )}

      {/* ── Grid Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        {/* ================================================================ */}
        {/* LEFT COLUMN                                                     */}
        {/* ================================================================ */}
        <div className="space-y-5 md:space-y-6">
          {/* ── Card: Store Information ── */}
          <SectionCard title={BRANDING.STORE_INFO || "Store Information"}>
            {/* Store Name */}
            <Field label={BRANDING.STORE_NAME} icon={<Store className="w-3.5 h-3.5" />}>
              <input
                value={brandForm.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
                placeholder="My Store"
              />
            </Field>

            {/* Store Link (Slug) */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-muted-foreground/50" />
                <label className="text-xs md:text-sm font-medium text-foreground/60">{BRANDING.STORE_LINK}</label>
                <HelpButton title={BRANDING.STORE_LINK}>{(BRANDING as any).SLUG_HELP as string || ""}</HelpButton>
                <div className="ml-auto text-xs uppercase tracking-wider">
                  {slugEditable && brandForm.slug && brandForm.slug.length > 2 &&
                    (isCheckingSlug ? (
                      <span className="text-muted-foreground/50 animate-pulse">{BRANDING.SLUG_CHECKING}</span>
                    ) : isSlugOffensive(brandForm.slug) ? (
                      <span className="text-destructive/80 font-medium">{BRANDING.SLUG_NOT_ALLOWED}</span>
                    ) : isSlugTaken ? (
                      <span className="text-destructive/80 font-medium">{BRANDING.SLUG_TAKEN}</span>
                    ) : (
                      <span className="text-green-600/60 font-medium">{BRANDING.SLUG_AVAILABLE}</span>
                    ))}
                </div>
              </div>
              <div className="flex items-stretch border border-border/50 rounded-none bg-transparent has-[input:focus]:border-ring/50 has-[input:focus]:ring-1 has-[input:focus]:ring-ring/20 transition-all duration-150">
                <span className="flex items-center pl-3 md:pl-3.5 py-2 md:py-2.5 text-xs md:text-sm text-muted-foreground/30 font-mono shrink-0 select-none pointer-events-none">
                  dokan.example.com/
                </span>
                {slugEditable ? (
                  <input
                    value={brandForm.slug || ""}
                    onChange={handleSlugChange}
                    className={`flex-1 min-w-0 bg-transparent border-none pr-3 md:pr-3.5 py-2 md:py-2.5 text-xs md:text-sm font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-0 ${
                      isSlugTaken ? "text-destructive/80" : ""
                    }`}
                    placeholder="shop-link"
                  />
                ) : (
                  <div className="flex-1 min-w-0 bg-muted/20 pr-10 py-2 md:py-2.5 text-xs md:text-sm font-mono text-left text-muted-foreground/50 cursor-not-allowed relative">
                    {brandForm.slug || "shop-link"}
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              {slugEditable ? (
                isPro ? (
                  <div className="space-y-0.5">
                    <p className="text-xs md:text-sm text-muted-foreground/40">{BRANDING.SLUG_WARN_1}</p>
                    <p className="text-xs md:text-sm text-muted-foreground/40">{BRANDING.SLUG_WARN_2}</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <p className="text-xs md:text-sm text-muted-foreground/40">{BRANDING.SLUG_ONCE_HINT}</p>
                    <p className="text-xs md:text-sm text-muted-foreground/40">{BRANDING.SLUG_WARN_2}</p>
                  </div>
                )
              ) : (
                <p className="text-xs md:text-sm text-muted-foreground/40">{BRANDING.SLUG_LOCKED_CUSTOMIZED}</p>
              )}
            </div>

            {/* Default Language */}
            <div className="space-y-2">
              <Field label={BRANDING.DEFAULT_LANG_HEADER} icon={<Globe className="w-3.5 h-3.5" />}>
                <div className="flex gap-1.5">
                  {([
                    { value: "en", labelKey: "DEFAULT_LANG_EN" as const },
                    { value: "bn", labelKey: "DEFAULT_LANG_BN" as const },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set("default_language", opt.value)}
                      className={`flex-1 h-8 md:h-9 text-xs md:text-sm font-medium rounded-none border transition-all duration-150 ${
                        brandForm.default_language === opt.value
                          ? "bg-foreground text-background border-foreground"
                          : "border-border/50 text-foreground/50 hover:text-foreground/70 hover:border-border/70"
                      }`}
                    >
                      {BRANDING[opt.labelKey]}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </SectionCard>

          {/* ── Card: Social Networks ── */}
          <SectionCard title={BRANDING.SOCIAL_NETWORKS} description={BRANDING.SOCIAL_DESC}>
            {/* WhatsApp */}
            <PlatformRow
              icon={<WhatsAppIcon />}
              name="WhatsApp"
              isPrimary={brandForm.social_platform === "whatsapp"}
              onSetPrimary={() => set("social_platform", "whatsapp")}
              required
            >
              <Field hint={BRANDING.WHATSAPP_FORMAT}>
                <input
                  value={brandForm.whatsapp_phone}
                  onChange={(e) => set("whatsapp_phone", e.target.value)}
                  className={inputClass}
                  placeholder={BRANDING.WHATSAPP_PLACEHOLDER}
                />
              </Field>
            </PlatformRow>

            {/* Instagram */}
            <PlatformRow
              icon={<Instagram className="w-3.5 h-3.5" />}
              name="Instagram"
              isPrimary={brandForm.social_platform === "instagram"}
              onSetPrimary={() => set("social_platform", "instagram")}
              showToggle={brandForm.show_instagram}
              onToggleShow={() => set("show_instagram", !brandForm.show_instagram)}
            >
              <input
                value={brandForm.instagram}
                onChange={(e) => set("instagram", e.target.value)}
                className={inputClass}
                placeholder="@username"
              />
            </PlatformRow>

            {/* TikTok */}
            <PlatformRow
              icon={<TikTokIcon />}
              name="TikTok"
              isPrimary={brandForm.social_platform === "tiktok"}
              onSetPrimary={() => set("social_platform", "tiktok")}
              showToggle={brandForm.show_tiktok}
              onToggleShow={() => set("show_tiktok", !brandForm.show_tiktok)}
            >
              <input
                value={brandForm.tiktok_handle}
                onChange={(e) => set("tiktok_handle", e.target.value)}
                className={inputClass}
                placeholder="@username"
              />
            </PlatformRow>

            {/* Telegram (social) */}
            <PlatformRow
              icon={<MessageCircle className="w-3.5 h-3.5" />}
              name="Telegram"
              isPrimary={brandForm.social_platform === "telegram"}
              onSetPrimary={() => set("social_platform", "telegram")}
              showToggle={brandForm.show_telegram}
              onToggleShow={() => set("show_telegram", !brandForm.show_telegram)}
            >
              <input
                value={brandForm.telegram_chat_id}
                onChange={(e) => set("telegram_chat_id", e.target.value)}
                className={inputClass}
                placeholder="@channel or Chat ID"
              />
            </PlatformRow>

            {/* Facebook */}
            <PlatformRow
              icon={<Facebook className="w-3.5 h-3.5" />}
              name="Facebook"
              isPrimary={brandForm.social_platform === "facebook"}
              onSetPrimary={() => set("social_platform", "facebook")}
              showToggle={brandForm.show_facebook}
              onToggleShow={() => set("show_facebook", !brandForm.show_facebook)}
            >
              <input
                value={brandForm.facebook}
                onChange={(e) => set("facebook", e.target.value)}
                className={inputClass}
                placeholder="@username"
              />
            </PlatformRow>
          </SectionCard>

          {/* ── Card: Tax Settings ── */}
          <SectionCard title={BRANDING.TAX_SETTINGS} description={BRANDING.TAX_DESC}>
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm font-medium text-foreground/70">{BRANDING.TAX_ENABLE}</span>
              <Toggle
                enabled={brandForm.tax_enabled}
                onChange={() => set("tax_enabled", !brandForm.tax_enabled)}
              />
            </div>

            {brandForm.tax_enabled && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-muted-foreground/50" />
                    <label className="text-xs md:text-sm font-medium text-foreground/60">{BRANDING.TAX_PERCENT}</label>
                    <HelpButton title={BRANDING.TAX_PERCENT}>{(BRANDING as any).TAX_HELP as string || ""}</HelpButton>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={brandForm.tax_percent}
                    onChange={(e) => set("tax_percent", e.target.value)}
                    className={`${inputClass} w-32`}
                  />
                </div>
              </motion.div>
            )}
          </SectionCard>
        </div>

        {/* ================================================================ */}
        {/* RIGHT COLUMN                                                    */}
        {/* ================================================================ */}
        <div className="space-y-5 md:space-y-6">
          {/* ── Card: Banner & Branding ── */}
          <SectionCard>
            {/* Banner sub-section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-xs md:text-sm font-semibold tracking-[0.2em] uppercase text-foreground opacity-90">{BRANDING.HERO_BANNER}</h4>
                  <p className="text-xs md:text-sm text-muted-foreground/50">{BRANDING.HERO_IMAGE_DESC}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground/40 uppercase tracking-wider">{BRANDING.SHOW_ON_STORE}</span>
                  <Toggle
                    enabled={brandForm.show_banner}
                    onChange={() => set("show_banner", !brandForm.show_banner)}
                  />
                </div>
              </div>

              <ImageCropUpload
                bucket="store-assets"
                folder={userId}
                value={brandForm.hero_image_url}
                onUpload={(url) => set("hero_image_url", url)}
                onRemove={() => set("hero_image_url", null)}
                label={BRANDING.UPLOAD_HERO}
                previewClass="w-full h-40 object-cover rounded-none border border-border/20"
                aspectRatio={16 / 9}
                maxWidth={1920}
                maxHeight={1080}
                imageType="banner"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={BRANDING.HERO_TITLE}>
                  <input
                    value={brandForm.hero_title}
                    onChange={(e) => set("hero_title", e.target.value)}
                    className={inputClass}
                    placeholder="Handmade Jewelry in Almaty"
                  />
                </Field>
                <Field label={BRANDING.SUBTITLE}>
                  <input
                    value={brandForm.hero_subtitle}
                    onChange={(e) => set("hero_subtitle", e.target.value)}
                    className={inputClass}
                    placeholder="Handcrafted goods"
                  />
                </Field>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border/20" />

            {/* Theme Preset sub-section */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setThemeExpanded((prev) => !prev)}
                className="flex w-full items-center justify-between gap-3 transition-colors"
              >
                <div className="text-left space-y-0.5">
                  <h4 className="text-xs md:text-sm font-semibold tracking-[0.2em] uppercase text-foreground opacity-90">{BRANDING.THEME_PRESET || "Theme Preset"}</h4>
                  <p className="text-xs md:text-sm text-muted-foreground/50">
                    {BRANDING[`THEME_${brandForm.theme_preset.toUpperCase()}` as keyof typeof BRANDING] ||
                      STORE_THEMES[brandForm.theme_preset]?.label ||
                      brandForm.theme_preset ||
                      "Select a theme"}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground/50 transition-transform duration-200 ${themeExpanded ? "rotate-180" : ""}`} />
              </button>

              {themeExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  {Object.entries(STORE_THEMES).map(([key, theme]) => {
                    const isSelected = brandForm.theme_preset === key;
                    const isLocked = theme.proOnly && !isPro;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          if (isLocked) { onShowUpgrade?.(); return; }
                          set("theme_preset", key);
                        }}
                        className={`relative flex items-center gap-4 w-full rounded-none border px-4 py-3 text-left transition-all duration-150 ${
                          isSelected
                            ? "border-foreground/60 bg-foreground/[0.03]"
                            : "border-border/30 hover:border-border/60"
                        } ${isLocked ? "opacity-50" : ""}`}
                      >
                        <div className="flex flex-col items-center gap-0.5 shrink-0">
                          <span className="text-[10px] tracking-wider uppercase text-muted-foreground/50">{BRANDING.THEME_LIGHT}</span>
                          <div className="flex gap-0.5">
                            {theme.preview.light.map((hex, i) => (
                              <span key={i} className="w-3.5 h-3.5 rounded-full border border-border/20" style={{ backgroundColor: hex }} />
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-0.5 shrink-0">
                          <span className="text-[10px] tracking-wider uppercase text-muted-foreground/50">{BRANDING.THEME_DARK}</span>
                          <div className="flex gap-0.5">
                            {theme.preview.dark.map((hex, i) => (
                              <span key={i} className="w-3.5 h-3.5 rounded-full border border-border/20" style={{ backgroundColor: hex }} />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs md:text-sm font-medium text-foreground/80 flex-1">
                          {BRANDING[`THEME_${key.toUpperCase()}` as keyof typeof BRANDING] || theme.label}
                        </span>
                        {isLocked ? (
                          <span className="pro-badge"><Crown className="w-2.5 h-2.5" /> PRO</span>
                        ) : isSelected ? (
                          <Check className="w-3.5 h-3.5 text-foreground/80" />
                        ) : null}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </SectionCard>

          {/* ── Card: Payment Methods ── */}
          <SectionCard title={PAYMENT_METHODS.TITLE} description={PAYMENT_METHODS.DESC}>
            {/* Wallets */}
            <div className="space-y-4">
              <div className="space-y-0.5">
                <h4 className="text-xs md:text-sm font-semibold tracking-[0.15em] uppercase text-foreground/80">{PAYMENT_METHODS.WALLET_TITLE}</h4>
                <p className="text-xs md:text-sm text-muted-foreground/50">{PAYMENT_METHODS.WALLET_DESC}</p>
              </div>
              {WALLET_KEYS.map((key) => {
                const w = brandForm.payment_methods.wallets[key];
                const unusable = w?.enabled && !walletIsUsable(w);
                return (
                  <div key={key} className="rounded-none border border-border/30 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <img src={WALLET_LOGOS[key]} alt="" className="w-6 h-6 rounded-sm shrink-0" />
                        <span className="text-xs md:text-sm font-medium text-foreground/80 truncate">{PAYMENT_METHOD_LABELS[key]}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground/40 uppercase tracking-wider">{PAYMENT_METHODS.ENABLE}</span>
                        <Toggle enabled={!!w?.enabled} onChange={() => setWallet(key, { enabled: !w?.enabled })} />
                      </div>
                    </div>
                    {w?.enabled && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-3">
                        <Field label={PAYMENT_METHODS.PHONE_LABEL} icon={<Phone className="w-3.5 h-3.5" />}>
                          <input
                            value={w.phone}
                            onChange={(e) => setWallet(key, { phone: e.target.value })}
                            className={inputClass}
                            placeholder="01XXXXXXXXX"
                          />
                        </Field>
                        <ImageCropUpload
                          bucket="qr-codes"
                          folder={`${userId}/wallets/${key}`}
                          value={w.qr_url}
                          onUpload={(url) => setWallet(key, { qr_url: url })}
                          onRemove={() => setWallet(key, { qr_url: null })}
                          label={PAYMENT_METHODS.QR_UPLOAD}
                          previewClass="w-28 h-28 object-contain rounded-none border border-border/20"
                          aspectRatio={1}
                        />
                        {unusable && <p className="text-xs text-destructive/80">{PAYMENT_METHODS.WALLET_REQUIRED}</p>}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border/20" />

            {/* COD */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Banknote className="w-3.5 h-3.5 text-muted-foreground/50" />
                  <span className="text-xs md:text-sm font-medium text-foreground/80">{PAYMENT_METHODS.COD_TITLE}</span>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground/50">{PAYMENT_METHODS.COD_DESC}</p>
              </div>
              <Toggle
                enabled={!!brandForm.payment_methods.cod?.enabled}
                onChange={() => setMethods((prev) => ({ ...prev, cod: { enabled: !prev.cod?.enabled } }))}
              />
            </div>

            {/* Contact us */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5 text-muted-foreground/50" />
                  <span className="text-xs md:text-sm font-medium text-foreground/80">{PAYMENT_METHODS.CONTACT_TITLE}</span>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground/50">{PAYMENT_METHODS.CONTACT_DESC}</p>
              </div>
              <Toggle
                enabled={!!brandForm.payment_methods.contact_us?.enabled}
                onChange={() => setMethods((prev) => ({ ...prev, contact_us: { enabled: !prev.contact_us?.enabled } }))}
              />
            </div>

            <div className="border-t border-border/20" />

            {/* Bank QR (legacy fields, now toggleable) */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs md:text-sm font-medium text-foreground/80">{PAYMENT_METHODS.BANK_TITLE}</span>
                  <p className="text-xs md:text-sm text-muted-foreground/50">{PAYMENT_METHODS.BANK_DESC}</p>
                </div>
                <Toggle
                  enabled={!!brandForm.payment_methods.bank?.enabled}
                  onChange={() => setMethods((prev) => ({ ...prev, bank: { enabled: !prev.bank?.enabled } }))}
                />
              </div>
              {brandForm.payment_methods.bank?.enabled && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-3">
                  <ImageCropUpload
                    bucket="qr-codes"
                    folder={userId}
                    value={brandForm.payment_qr_image}
                    onUpload={(url) => set("payment_qr_image", url)}
                    onRemove={() => set("payment_qr_image", null)}
                    label={BRANDING.UPLOAD_QR}
                    previewClass="w-36 h-36 object-contain rounded-none border border-border/20"
                    aspectRatio={1}
                    maxWidth={800}
                    maxHeight={800}
                  />
                  <p className="text-xs md:text-sm text-muted-foreground/50">{BRANDING.NO_QR_FALLBACK}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={BRANDING.PHONE_NUMBER} icon={<Smartphone className="w-3.5 h-3.5" />}>
                      <input
                        value={brandForm.payment_phone}
                        onChange={(e) => set("payment_phone", e.target.value)}
                        className={inputClass}
                        placeholder="+880 1XXX-XXXXXX"
                      />
                    </Field>
                    <Field label={BRANDING.OWNER_NAME} icon={<User className="w-3.5 h-3.5" />}>
                      <input
                        value={brandForm.payment_name}
                        onChange={(e) => set("payment_name", e.target.value)}
                        className={inputClass}
                        placeholder="Owner Name"
                      />
                    </Field>
                  </div>
                </motion.div>
              )}
            </div>
          </SectionCard>

          {/* ── Card: Delivery ── */}
          <SectionCard title={PAYMENT_METHODS.CARRIERS_TITLE} description={PAYMENT_METHODS.CARRIERS_DESC}>
            <div className="space-y-2">
              {KNOWN_CARRIERS.map((name) => {
                const checked = brandForm.delivery_carriers.some((c) => c.name === name);
                return (
                  <label key={name} className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setCarriers((prev) =>
                          checked ? prev.filter((c) => c.name !== name) : [...prev, { name }],
                        )
                      }
                      className="accent-primary"
                    />
                    <span className="text-xs md:text-sm text-foreground/80">{name}</span>
                  </label>
                );
              })}
            </div>
            <div className="space-y-2">
              {brandForm.delivery_carriers.filter((c) => c.custom).map((c) => (
                <div key={c.name} className="flex items-center justify-between border border-border/30 px-3 py-1.5">
                  <span className="text-xs md:text-sm text-foreground/80">{c.name}</span>
                  <button
                    type="button"
                    onClick={() => setCarriers((prev) => prev.filter((x) => x.name !== c.name))}
                    className="text-xs uppercase tracking-wider text-muted-foreground/50 hover:text-destructive"
                  >
                    {ACTIONS.DELETE || "Remove"}
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  value={customCarrier}
                  onChange={(e) => setCustomCarrier(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); addCustomCarrier(); } }}
                  className={inputClass}
                  placeholder={PAYMENT_METHODS.CUSTOM_PLACEHOLDER}
                />
                <button
                  type="button"
                  onClick={addCustomCarrier}
                  disabled={!customCarrier.trim()}
                  className="px-4 h-9 md:h-10 text-xs font-medium uppercase tracking-wide border border-foreground/60 text-foreground hover:bg-foreground hover:text-background transition-colors disabled:opacity-30"
                >
                  {PAYMENT_METHODS.CUSTOM_ADD}
                </button>
              </div>
            </div>
          </SectionCard>

          {/* ── Card: Notifications ── */}
          <SectionCard>
            {/* Telegram Notifications — PRO gate */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-muted-foreground/50" />
                <span className="text-xs md:text-sm font-semibold tracking-[0.2em] uppercase text-foreground opacity-90">{BRANDING.TELEGRAM_HEADER}</span>
                {isFree && <span className="pro-badge"><Crown className="w-2.5 h-2.5" /> PRO</span>}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground/50">{BRANDING.TELEGRAM_DESC}</p>

              <div className="rounded-none border border-border/30 bg-muted/10 p-4 space-y-3">
                <Field label={BRANDING.TELEGRAM_CHAT_ID} icon={<MessageCircle className="w-3.5 h-3.5" />}>
                  <input
                    value={isFree ? "" : brandForm.telegram_chat_id}
                    onChange={isFree ? undefined : (e) => set("telegram_chat_id", e.target.value)}
                    disabled={isFree}
                    placeholder={isFree ? BRANDING.TELEGRAM_DISABLED_PLACEHOLDER : "e.g. 123456789"}
                    className={`${inputClass} font-mono ${isFree ? "cursor-not-allowed text-muted-foreground/40 bg-muted/20" : ""}`}
                  />
                </Field>
                {!isFree && (
                  <div className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground/50">
                    <Info className="w-3 h-3 mt-0.5 shrink-0" />
                    <span dangerouslySetInnerHTML={{ __html: BRANDING.TELEGRAM_HELP }} />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border/20" />

            {/* Marketing QR Card */}
            <QrMarketingCard
              storeSlug={store.slug}
              storeName={store.name}
              isPro={isPro}
              onUpgrade={onShowUpgrade || (() => {})}
            />
          </SectionCard>

        </div>
      </div>

      {/* ── Floating Save Button ── */}
      <div className="sticky bottom-0 py-3 flex items-center justify-center">
        <div className="backdrop-blur-sm bg-background/70 rounded-sm">
          <button
            type="button"
            onClick={onSave}
            disabled={savingBrand}
            className="h-10 md:h-11 px-6 md:px-8 bg-foreground text-background text-xs md:text-sm font-medium rounded-sm hover:opacity-90 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
          >
            {savingBrand ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-background/30 border-t-background animate-spin" />
                {ACTIONS.SAVING}
              </>
            ) : (
              ACTIONS.SAVE_ALL
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default BrandingTab;
