import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLabels } from "@/hooks/useLabels";

interface VerificationBannerProps {
  verificationStatus: string;
}

const VerificationBanner = ({ verificationStatus }: VerificationBannerProps) => {
  const { VERIFICATION } = useLabels();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || verificationStatus === "verified") return null;

  const messages: Record<string, { title: string; desc: string }> = {
    unverified: {
      title: VERIFICATION.BANNER_UNVERIFIED_TITLE || "Store not verified",
      desc: VERIFICATION.BANNER_UNVERIFIED_DESC || "Complete verification to accept payments and publish your store.",
    },
    mismatch: {
      title: VERIFICATION.STATUS_MISMATCH,
      desc: VERIFICATION.BANNER_MISMATCH_DESC || "The legal name doesn't match the tax registry. Re-verify to continue.",
    },
    suspended: {
      title: VERIFICATION.STATUS_SUSPENDED,
      desc: VERIFICATION.BANNER_SUSPENDED_DESC || "Your business is marked as suspended. Contact support.",
    },
    manual_review: {
      title: VERIFICATION.STATUS_MANUAL_REVIEW,
      desc: VERIFICATION.BANNER_MANUAL_DESC || "Automatic verification failed. Contact support to proceed.",
    },
  };

  const msg = messages[verificationStatus] || messages.unverified;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="border-b border-border/40"
      >
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground/80 truncate">
                {msg.title}
              </p>
              <p className="text-[11px] text-muted-foreground/50 leading-relaxed">
                {msg.desc}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              onClick={() => navigate("/settings?tab=verification")}
              className="text-[10px] font-medium uppercase tracking-wider text-foreground/60 hover:text-foreground transition-colors whitespace-nowrap"
            >
              {VERIFICATION.VERIFY_BTN}
            </button>
            {verificationStatus !== "unverified" && (
              <button
                onClick={() => setDismissed(true)}
                className="p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VerificationBanner;
