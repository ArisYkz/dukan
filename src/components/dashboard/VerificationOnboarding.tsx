import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, CheckCircle, XCircle, AlertTriangle, Clock, Loader2 } from "lucide-react";
import { verifySeller, validateIinBinChecksum, type VerifySellerResult } from "@/services/verificationService";
import { useLabels } from "@/hooks/useLabels";

type SellerType = "individual_entrepreneur" | "legal_entity";
type Step = "form" | "verifying" | "result";

interface VerificationOnboardingProps {
  storeId: string;
  onVerified: (iinBin?: string) => void;
  /** Render as an inline card instead of full-page */
  compact?: boolean;
}

const VerificationOnboarding = ({
  storeId,
  onVerified,
  compact = false,
}: VerificationOnboardingProps) => {
  const V = useLabels().VERIFICATION;
  const [step, setStep] = useState<Step>("form");
  const [sellerType, setSellerType] = useState<SellerType>("individual_entrepreneur");
  const [iinBin, setIinBin] = useState("");
  const [legalName, setLegalName] = useState("");
  const [result, setResult] = useState<VerifySellerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleIinBinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 12);
    setIinBin(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateIinBinChecksum(iinBin)) {
      setError(V.CHECKSUM_ERROR);
      return;
    }

    setStep("verifying");

    try {
      const res = await verifySeller({ storeId, sellerType, iinBin, legalName });
      setResult(res);
      setStep("result");
      if (res.status === "verified") {
        setTimeout(() => onVerified(iinBin), 1200);
      }
    } catch (err) {
      if (err instanceof Error && err.message === "DUPLICATE_IIN") {
        setError(V.DUPLICATE_IIN || "This IIN/BIN is already registered to another account");
      } else {
        setError(err instanceof Error ? err.message : "Verification failed");
      }
      setStep("form");
    }
  };

  const handleRetry = () => {
    setStep("form");
    setResult(null);
    setError(null);
  };

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={compact ? "" : "w-full max-w-md mx-auto"}
    >
      {!compact && (
        <h1 className="font-mono text-3xl text-center mb-8">
          {V.TITLE}
        </h1>
      )}

      {step === "verifying" && (
        <div className="flex flex-col items-center py-12 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground tracking-wide">
            {V.VERIFYING}
          </p>
        </div>
      )}

      {step === "result" && result && (
        <ResultView
          result={result}
          onRetry={handleRetry}
          onContinue={() => onVerified(iinBin)}
        />
      )}

      {step === "form" && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2 block">
              {V.BUSINESS_TYPE}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSellerType("individual_entrepreneur")}
                className={`p-4 border text-sm rounded-sm transition-colors ${
                  sellerType === "individual_entrepreneur"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <div className="font-mono text-xs tracking-wide">{V.IP}</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {V.IP_DESC}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSellerType("legal_entity")}
                className={`p-4 border text-sm rounded-sm transition-colors ${
                  sellerType === "legal_entity"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <div className="font-mono text-xs tracking-wide">{V.TOO}</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {V.TOO_DESC}
                </div>
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="iinBin"
              className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block"
            >
              {V.IIN_BIN}
            </label>
            <input
              id="iinBin"
              value={iinBin}
              onChange={handleIinBinChange}
              placeholder="000 000 000 000"
              maxLength={12}
              className="w-full border border-border bg-transparent px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono tracking-widest"
              required
            />
          </div>

          <div>
            <label
              htmlFor="legalName"
              className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block"
            >
              {V.LEGAL_NAME}
            </label>
            <input
              id="legalName"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              maxLength={200}
              className="w-full border border-border bg-transparent px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
            <p className="text-[10px] text-muted-foreground/70 mt-1.5">
              {sellerType === "individual_entrepreneur" ? V.IP_LEGAL_HINT : V.TOO_LEGAL_HINT}
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground py-3 text-sm tracking-wide uppercase rounded-sm hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            {V.VERIFY_BTN}
          </button>
        </form>
      )}
    </motion.div>
  );

  if (compact) return content;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {content}
    </div>
  );
};

const ResultView = ({
  result,
  onRetry,
  onContinue,
}: {
  result: VerifySellerResult;
  onRetry: () => void;
  onContinue: () => void;
}) => {
  const V = useLabels().VERIFICATION;

  const config = {
    verified: {
      icon: CheckCircle,
      color: "text-green-500",
      title: V.STATUS_VERIFIED,
      message: V.SUCCESS_MESSAGE,
      action: (
        <button
          onClick={onContinue}
          className="w-full bg-primary text-primary-foreground py-3 text-sm tracking-wide uppercase rounded-sm hover:opacity-90"
        >
          {V.CONTINUE}
        </button>
      ),
    },
    mismatch: {
      icon: XCircle,
      color: "text-red-500",
      title: V.STATUS_MISMATCH,
      message: V.ERROR_MISMATCH,
      action: (
        <button
          onClick={onRetry}
          className="w-full border border-primary text-primary py-3 text-sm tracking-wide uppercase rounded-sm hover:bg-primary/5"
        >
          {V.TRY_AGAIN}
        </button>
      ),
    },
    suspended: {
      icon: AlertTriangle,
      color: "text-yellow-500",
      title: V.STATUS_SUSPENDED,
      message: V.ERROR_SUSPENDED,
      action: (
        <p className="text-xs text-muted-foreground text-center">
          {V.CONTACT_SUPPORT}
        </p>
      ),
    },
    manual_review: {
      icon: Clock,
      color: "text-yellow-500",
      title: V.STATUS_MANUAL_REVIEW,
      message: V.ERROR_MANUAL,
      action: (
        <p className="text-xs text-muted-foreground text-center">
          {V.CONTACT_SUPPORT}
        </p>
      ),
    },
    unverified: {
      icon: Shield,
      color: "text-muted-foreground",
      title: V.STATUS_UNVERIFIED,
      message: "",
      action: (
        <button
          onClick={onRetry}
          className="w-full border border-primary text-primary py-3 text-sm tracking-wide uppercase rounded-sm hover:bg-primary/5"
        >
          {V.TRY_AGAIN}
        </button>
      ),
    },
  };

  const { icon: Icon, color, title, message, action } = config[result.status];

  return (
    <div className="flex flex-col items-center py-8 space-y-4">
      <Icon className={`w-12 h-12 ${color}`} />
      <h2 className={`font-mono text-lg ${color}`}>{title}</h2>
      {message && (
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          {message}
        </p>
      )}
      {result.officialName && (
        <p className="text-[10px] text-muted-foreground">
          {V.REGISTRY_NAME}: {result.officialName}
        </p>
      )}
      <div className="w-full pt-4">{action}</div>
    </div>
  );
};

export default VerificationOnboarding;
