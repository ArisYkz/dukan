import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Mail, Lock, Globe, Shield, CheckCircle, Clock, Loader2 } from "lucide-react";
import { useLabels } from "@/hooks/useLabels";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { validatePassword, isPasswordValid, PasswordRulesChecklist, type PasswordRules } from "@/lib/passwordValidation";
import { getStoreIinBin } from "@/services/bridgeService";
import ThemeToggle from "@/components/ThemeToggle";
import VerificationOnboarding from "@/components/dashboard/VerificationOnboarding";

const LANG_OPTIONS: { value: Language; label: string; name: string }[] = [
  { value: "bn", label: "BN", name: "বাংলা" },
  { value: "en", label: "EN", name: "English" },
];

export default function Settings() {
  const { AUTH, ACTIONS, SETTINGS: S, ERRORS, VERIFICATION } = useLabels();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [sendingEmailChange, setSendingEmailChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordRules, setPasswordRules] = useState<PasswordRules>({ minLength: false, hasUppercase: false, hasDigit: false });
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [store, setStore] = useState<{ id: string; name: string; verification_status: string; is_verified: boolean; verified_at: string | null } | null>(null);
  const [iinBin, setIinBin] = useState<string | null>(null);
  const [iinBinLoading, setIinBinLoading] = useState(false);
  const [storesLoading, setStoresLoading] = useState(true);
  const verificationRef = useRef<HTMLDivElement>(null);

  const inputClass =
    "w-full h-10 bg-transparent border border-border/50 rounded-none px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/20 transition-all duration-150";

  const sectionClass = "rounded-none border border-border/40 bg-card p-5 md:p-6 space-y-4";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate("/auth"); return; }
      setEmail(session.user.email || "");
      setNewEmail(session.user.email || "");

      // Fetch the user's primary store for verification status
      supabase
        .from("stores")
        .select("id, name, verification_status, is_verified, verified_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()
        .then(({ data: storeData }) => {
          setStore(storeData);
          setStoresLoading(false);
          if (storeData?.verification_status === "verified") {
            setIinBinLoading(true);
            getStoreIinBin(storeData.id)
              .then((bin) => {
                if (bin === null) {
                  // Bridge has no PII — downgrade to unverified
                  supabase
                    .from("stores")
                    .update({ verification_status: "unverified", is_verified: false })
                    .eq("id", storeData.id)
                    .then(() => {
                      setStore((prev) =>
                        prev ? { ...prev, verification_status: "unverified", is_verified: false } : prev,
                      );
                      setIinBinLoading(false);
                    });
                } else {
                  setIinBin(bin);
                  setIinBinLoading(false);
                }
              })
              .catch(() => {
                // Bridge unreachable — leave status as-is
                setIinBinLoading(false);
              });
          }
        })
        .catch(() => {
          setStoresLoading(false);
        });

      setLoading(false);
    });
  }, [navigate]);

  // Scroll to verification section when ?tab=verification is set
  useEffect(() => {
    if (searchParams.get("tab") === "verification" && !storesLoading && store) {
      setTimeout(() => {
        verificationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [searchParams, storesLoading, store]);

  const handleRequestPasswordReset = async () => {
    setSendingPasswordReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) toast.error(ERRORS?.GENERIC_ERROR || error.message);
    else toast.success(S?.PASSWORD_RESET_SENT || "Password reset email sent. Check your inbox.");
    setSendingPasswordReset(false);
  };

  const handleUpdatePassword = async () => {
    if (!isPasswordValid(passwordRules)) {
      toast.error(AUTH.PASSWORD_MIN_LENGTH);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(AUTH.PASSWORDS_DO_NOT_MATCH);
      return;
    }
    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(AUTH.PASSWORD_UPDATED);
      setNewPassword("");
      setConfirmPassword("");
      // Clear the recovery param to avoid duplicate toast
      navigate("/settings", { replace: true });
    }
    setUpdatingPassword(false);
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || newEmail === email) return;
    setSendingEmailChange(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) toast.error(ERRORS?.GENERIC_ERROR || error.message);
    else toast.success(S?.EMAIL_CHANGE_SENT || "Confirmation email sent to your new address.");
    setSendingEmailChange(false);
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    toast.success(S?.LANGUAGE_SAVED || "Language updated");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-lg py-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> {ACTIONS.BACK}
          </button>
          <ThemeToggle />
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <h2 className="dashboard-heading">
            {S?.TITLE || "Settings"}
          </h2>

          {/* Language */}
          <div className={sectionClass}>
            <div className="flex items-center gap-2 text-foreground">
              <Globe className="w-4 h-4" />
              <h3 className="text-xs tracking-[0.15em] uppercase font-semibold font-mono">{S?.LANGUAGE || "Language"}</h3>
            </div>
            <p className="text-xs text-muted-foreground/60">{S?.LANGUAGE_DESC || "Choose the default language for the dashboard interface."}</p>
            <div className="flex gap-2">
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleLanguageChange(opt.value)}
                  className={`flex-1 px-3 py-2.5 text-sm font-mono tracking-wide rounded-none border transition-colors ${
                    language === opt.value
                      ? "bg-foreground text-background border-foreground"
                      : "border-border/50 hover:bg-muted text-foreground/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Email */}
          <div className={sectionClass}>
            <div className="flex items-center gap-2 text-foreground">
              <Mail className="w-4 h-4" />
              <h3 className="text-xs tracking-[0.15em] uppercase font-semibold font-mono">{AUTH.EMAIL}</h3>
            </div>
            <p className="text-xs text-muted-foreground/60">{S?.CURRENT_EMAIL || "Current email"}: <span className="text-foreground">{email}</span></p>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className={inputClass}
              placeholder={S?.NEW_EMAIL_PLACEHOLDER || "New email address"}
            />
            <p className="text-[11px] text-muted-foreground/40">{S?.EMAIL_CHANGE_NOTE || "A confirmation will be sent to your new email."}</p>
            <button onClick={handleChangeEmail} disabled={sendingEmailChange || newEmail === email} className="h-10 px-5 bg-foreground text-background text-sm font-medium rounded-none hover:opacity-90 active:scale-[0.98] transition-all duration-150 disabled:opacity-40">
              {sendingEmailChange ? ACTIONS.LOADING : (S?.CHANGE_EMAIL || "Change Email")}
            </button>
          </div>

          {/* Password */}
          <div className={sectionClass}>
            <div className="flex items-center gap-2 text-foreground">
              <Lock className="w-4 h-4" />
              <h3 className="text-xs tracking-[0.15em] uppercase font-semibold font-mono">{AUTH.PASSWORD}</h3>
            </div>
            {isRecovery ? (
              <>
                <p className="text-xs text-muted-foreground/60">{AUTH.SET_NEW_PASSWORD}</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-foreground/60 block mb-1.5">{AUTH.NEW_PASSWORD}</label>
                    <input type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setPasswordRules(validatePassword(e.target.value)); }} className={inputClass} required minLength={8} />
                    <PasswordRulesChecklist rules={passwordRules} labels={{ length: AUTH.PASSWORD_RULE_LENGTH, uppercase: AUTH.PASSWORD_RULE_UPPERCASE, digit: AUTH.PASSWORD_RULE_DIGIT }} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground/60 block mb-1.5">{AUTH.CONFIRM_PASSWORD}</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} required />
                  </div>
                </div>
                <button onClick={handleUpdatePassword} disabled={updatingPassword || !isPasswordValid(passwordRules) || newPassword !== confirmPassword} className="h-10 px-5 bg-foreground text-background text-sm font-medium rounded-none hover:opacity-90 active:scale-[0.98] transition-all duration-150 disabled:opacity-40">
                  {updatingPassword ? ACTIONS.LOADING : AUTH.UPDATE_PASSWORD}
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground/60">{S?.PASSWORD_NOTE || "We'll send a password reset link to your email."}</p>
                <button onClick={handleRequestPasswordReset} disabled={sendingPasswordReset} className="h-10 px-5 border border-border/50 text-sm font-medium rounded-none hover:bg-muted transition-colors disabled:opacity-40">
                  {sendingPasswordReset ? ACTIONS.LOADING : (S?.REQUEST_PASSWORD_RESET || "Send Reset Link")}
                </button>
              </>
            )}
          </div>

          {/* Store Verification */}
          {storesLoading ? (
            <div ref={verificationRef} className={sectionClass}>
              <div className="flex items-center gap-2 text-foreground">
                <Shield className="w-4 h-4" />
                <h3 className="text-xs tracking-[0.15em] uppercase font-semibold font-mono">{VERIFICATION?.TITLE || "Verification"}</h3>
              </div>
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : store ? (
            <div ref={verificationRef} className={sectionClass}>
              <div className="flex items-center gap-2 text-foreground">
                <Shield className="w-4 h-4" />
                <h3 className="text-xs tracking-[0.15em] uppercase font-semibold font-mono">{VERIFICATION?.TITLE || "Verification"}</h3>
                {store.verification_status === "verified" && (
                  <span className="text-[10px] font-medium text-green-600/80 uppercase tracking-wider ml-auto flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> {VERIFICATION?.STATUS_VERIFIED || "Verified"}
                  </span>
                )}
              </div>

              {store.verification_status === "verified" ? (
                <div className="space-y-3">
                  {store.verified_at && (
                    <p className="text-[11px] text-muted-foreground/50 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {VERIFICATION?.VERIFIED_AT || "Verified"}: {new Date(store.verified_at).toLocaleDateString(
                        { bn: "bn-BD", en: "en-US" }[language] || "bn-BD",
                        { day: "numeric", month: "long", year: "numeric" }
                      )}
                    </p>
                  )}
                  {iinBinLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  ) : iinBin ? (
                    <p className="text-[11px] text-muted-foreground/50 flex items-center gap-1.5">
                      <span className="font-mono tracking-wider">{iinBin}</span>
                    </p>
                  ) : null}
                  <p className="text-[10px] text-muted-foreground/40 leading-relaxed border-t border-border/20 pt-3">
                    Персональные данные хранятся на серверах в Республике Казахстан в соответствии с законодательством РЗ.
                  </p>
                </div>
              ) : store.verification_status === "unverified" ? (
                <VerificationOnboarding
                  storeId={store.id}
                  onVerified={(verifiedIinBin) => {
                    supabase
                      .from("stores")
                      .select("id, name, verification_status, is_verified, verified_at")
                      .eq("id", store.id)
                      .single()
                      .then(({ data }) => {
                        if (data) {
                          setStore(data);
                          if (data.verification_status === "verified") {
                            setIinBin(verifiedIinBin ?? null);
                          }
                        }
                      });
                  }}
                  compact
                />
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground/70">
                    Verification status: <span className="font-medium text-foreground/80">
                      {store.verification_status === "mismatch" ? VERIFICATION?.STATUS_MISMATCH
                        : store.verification_status === "suspended" ? VERIFICATION?.STATUS_SUSPENDED
                        : VERIFICATION?.STATUS_MANUAL_REVIEW || "Manual Review"}
                    </span>
                  </p>
                  {store.verification_status === "mismatch" && (
                    <VerificationOnboarding
                      storeId={store.id}
                      onVerified={() => window.location.reload()}
                      compact
                    />
                  )}
                  {store.verification_status !== "mismatch" && (
                    <p className="text-[11px] text-muted-foreground/50">{VERIFICATION?.CONTACT_SUPPORT || "Contact support for assistance."}</p>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}
