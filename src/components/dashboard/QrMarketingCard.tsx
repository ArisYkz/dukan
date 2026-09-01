import { lazy, Suspense, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Lock, Crown } from "lucide-react";
import { useLabels } from "@/hooks/useLabels";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import dokanLogo from "@/assets/dokan-logo.webp";

const QRCodeSVG = lazy(() =>
  import("qrcode.react").then((m) => ({ default: m.QRCodeSVG }))
);

interface QrMarketingCardProps {
  storeSlug: string;
  storeName: string;
  isPro: boolean;
  onUpgrade: () => void;
}

const QrMarketingCard = ({ storeSlug, storeName, isPro, onUpgrade }: QrMarketingCardProps) => {
  const { QR_CARD } = useLabels();
  const cardRef = useRef<HTMLDivElement>(null);
  const [showCard, setShowCard] = useState(false);

  const hasSlug = storeSlug.length > 0;
  const canToggle = isPro && hasSlug;
  const storeUrl = `https://dokan.example.com/s/${storeSlug}`;

  const handleSwitchClick = () => {
    if (!hasSlug) return; // tooltip handles messaging
    if (!isPro) {
      toast(QR_CARD.UPSELL);
      onUpgrade();
      return;
    }
    setShowCard((v) => !v);
  };

  const handleDownload = useCallback(async () => {
    if (!isPro || !cardRef.current) return;
    const { toPng } = await import("html-to-image");
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 6,
        backgroundColor: "#FFFFFF",
        width: 1080,
        height: 1080,
        style: {
          width: "1080px",
          height: "1080px",
          padding: "80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        },
      });
      const link = document.createElement("a");
      link.download = `${storeSlug}-qr-card.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // silently fail
    }
  }, [isPro, storeSlug]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Switch row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs md:text-sm font-semibold tracking-[0.2em] uppercase text-foreground opacity-90">
            {QR_CARD.HEADER}
          </h2>
          {!isPro && (
             <span className="pro-badge">
               <Crown className="w-2.5 h-2.5" /> PRO
             </span>
          )}
        </div>

        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleSwitchClick}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center border transition-colors ${
                  canToggle && showCard
                    ? "bg-primary border-primary"
                    : "bg-muted border-border"
                } ${!canToggle ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span
                  className={`block h-3.5 w-3.5 bg-background transition-transform ${
                    canToggle && showCard ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </TooltipTrigger>
            {!canToggle && (
              <TooltipContent side="bottom" className="max-w-[240px] text-center">
                <p className="text-xs">
                  {!hasSlug ? QR_CARD.SLUG_REQUIRED : QR_CARD.PRO_TOOLTIP}
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      <p className="text-xs text-muted-foreground">{QR_CARD.DESC}</p>

      {/* Collapsible QR Card */}
      <AnimatePresence>
        {showCard && canToggle && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* The printable card — small preview */}
            <div className="flex flex-col items-center">
              <div
                ref={cardRef}
                className="bg-white border border-[#EAEAEA] p-6 w-full max-w-[250px] flex flex-col items-center space-y-4"
                style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}
              >
                {/* Logo */}
                <img
                  src={dokanLogo}
                  alt="Dokan"
                  className="h-5 object-contain opacity-80"
                  style={{ filter: "grayscale(100%)" }}
                />

                {/* QR Code */}
                <div className="relative p-2">
                  <Suspense
                    fallback={
                      <div className="w-[140px] h-[140px] bg-muted animate-pulse" />
                    }
                  >
                    <QRCodeSVG
                      value={storeUrl}
                      size={140}
                      level="H"
                      bgColor="#FFFFFF"
                      fgColor="#1a1a1a"
                      marginSize={0}
                    />
                  </Suspense>
                  {/* Center logo overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white p-1 rounded-sm">
                      <img
                        src={dokanLogo}
                        alt=""
                        className="h-4 w-4 object-contain"
                        style={{ filter: "grayscale(100%)" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Store name */}
                <p
                  className="text-xs font-bold tracking-[0.1em] uppercase text-center"
                  style={{ color: "#1a1a1a" }}
                >
                  {storeName}
                </p>

                {/* CTA text */}
                <p
                  className="text-[10px] tracking-[0.15em] uppercase text-center leading-relaxed"
                  style={{ color: "#999999" }}
                >
                  {QR_CARD.SCAN_CTA}
                </p>
              </div>
            </div>

            {/* Download button */}
            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-2 px-6 py-2.5 text-xs tracking-[0.15em] uppercase border border-foreground bg-foreground text-background hover:opacity-90 active:scale-[0.98] transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                {QR_CARD.DOWNLOAD}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};

export default QrMarketingCard;
