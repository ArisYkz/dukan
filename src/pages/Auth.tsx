import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useLabels } from "@/hooks/useLabels";
import { validatePassword, isPasswordValid, PasswordRulesChecklist, type PasswordRules } from "@/lib/passwordValidation";
import dukenLogo from "@/assets/duken-logo.webp";

const Auth = () => {
  const { AUTH } = useLabels();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerRules, setRegisterRules] = useState<PasswordRules>({ minLength: false, hasUppercase: false, hasDigit: false });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        supabase
          .from("profiles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            const tabParam = searchParams.get("tab");
            const basePath = profile?.role === "admin" ? "/admin" : "/dashboard";
            navigate(tabParam ? `${basePath}?tab=${tabParam}` : basePath, { replace: true });
          });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

  useEffect(() => {
    // If already logged in on mount, redirect away
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        supabase
          .from("profiles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            const tabParam = searchParams.get("tab");
            const basePath = profile?.role === "admin" ? "/admin" : "/dashboard";
            navigate(tabParam ? `${basePath}?tab=${tabParam}` : basePath, { replace: true });
          });
      }
    });
  }, [navigate, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword, options: { shouldCreateSession: rememberMe } });
      if (error) throw error;

      const userId = data.session?.user?.id;
      if (!userId) {
        toast.error("Login succeeded but no session was created. Try refreshing.");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      const tabParam = searchParams.get("tab");
      const basePath = profile?.role === "admin" ? "/admin" : "/dashboard";
      navigate(tabParam ? `${basePath}?tab=${tabParam}` : basePath);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const rules = validatePassword(registerPassword);
    if (!isPasswordValid(rules)) {
      toast.error(AUTH.PASSWORD_MIN_LENGTH);
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      toast.error(AUTH.PASSWORDS_DO_NOT_MATCH);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;

      toast.success(AUTH.REGISTER_SUCCESS);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : AUTH.UNKNOWN_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      toast.success(AUTH.RECOVERY_LINK_SENT);
      setRecoveryEmail("");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : AUTH.RECOVERY_LINK_FAILED);
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center mb-4"
          >
            <img
              src={dukenLogo}
              alt="Duken"
              className="h-12 max-w-[120px] object-contain dark:invert"
            />
          </motion.div>
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
            {AUTH.TAGLINE}
          </p>
        </div>

        <div className="bg-background border border-border rounded-sm overflow-hidden">
          <div className="grid grid-cols-2 border-b border-border">
            <button
              onClick={() => { setIsLogin(true); setIsRecovery(false); }}
              className={`py-4 text-sm font-mono tracking-wide uppercase transition-colors relative ${
                isLogin ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {AUTH.LOGIN}
              {isLogin && (
                <motion.div layoutId="authTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" initial={false} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
              )}
            </button>
            <button
              onClick={() => { setIsLogin(false); setIsRecovery(false); }}
              className={`py-4 text-sm font-mono tracking-wide uppercase transition-colors relative ${
                !isLogin ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {AUTH.REGISTER}
              {!isLogin && (
                <motion.div layoutId="authTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" initial={false} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
              )}
            </button>
          </div>

          <div className="p-8 min-h-[420px]">
            <AnimatePresence mode="wait">
              {isRecovery ? (
                <motion.form key="recovery" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} onSubmit={handleRecovery} className="space-y-6">
                  <h2 className="font-mono text-xl text-center mb-6">{AUTH.RECOVER_PASSWORD}</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">{AUTH.EMAIL}</label>
                      <input type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} className="w-full border border-border bg-transparent px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors" required />
                    </div>
                  </div>
                  <button type="submit" disabled={recoveryLoading} className="w-full bg-primary text-primary-foreground py-3 text-sm tracking-wide uppercase rounded-sm hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md">
                    {recoveryLoading ? "..." : AUTH.SEND_RESET_LINK}
                  </button>
                  <div className="text-center mt-4">
                    <button type="button" onClick={() => setIsRecovery(false)} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 font-mono tracking-wide">
                      {AUTH.BACK_TO_LOGIN}
                    </button>
                  </div>
                </motion.form>
              ) : isLogin ? (
                <motion.form key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} onSubmit={handleLogin} className="space-y-6">
                  <h2 className="font-mono text-xl text-center mb-6">{AUTH.LOGIN}</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">{AUTH.EMAIL}</label>
                      <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full border border-border bg-transparent px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors" required />
                    </div>
                    <div>
                      <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">{AUTH.PASSWORD}</label>
                      <div className="relative">
                        <input type={showLoginPassword ? "text" : "password"} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full border border-border bg-transparent px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors pr-10" required minLength={6} />
                        <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-sm transition-colors">
                          {showLoginPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="remember" checked={rememberMe} onCheckedChange={(c) => setRememberMe(c === true)} className="rounded-none border-foreground/30" />
                      <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer select-none">{AUTH.REMEMBER_ME}</label>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-3 text-sm tracking-wide uppercase rounded-sm hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md">
                    {loading ? "..." : AUTH.LOGIN}
                  </button>
                  <div className="text-center mt-4">
                    <button type="button" onClick={() => setIsRecovery(true)} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 font-mono tracking-wide">
                      {AUTH.FORGOT_PASSWORD}
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.form key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} onSubmit={handleRegister} className="space-y-6">
                  <h2 className="font-mono text-xl text-center mb-6">{AUTH.REGISTER}</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">{AUTH.EMAIL}</label>
                      <input type="email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} className="w-full border border-border bg-transparent px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors" required />
                    </div>
                    <div>
                      <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">{AUTH.PASSWORD}</label>
                      <div className="relative">
                        <input type={showRegisterPassword ? "text" : "password"} value={registerPassword} onChange={(e) => { setRegisterPassword(e.target.value); setRegisterRules(validatePassword(e.target.value)); }} className="w-full border border-border bg-transparent px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors pr-10" required minLength={8} />
                        <button type="button" onClick={() => setShowRegisterPassword(!showRegisterPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-sm transition-colors">
                          {showRegisterPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                        </button>
                      </div>
                      <PasswordRulesChecklist rules={registerRules} labels={{ length: AUTH.PASSWORD_RULE_LENGTH, uppercase: AUTH.PASSWORD_RULE_UPPERCASE, digit: AUTH.PASSWORD_RULE_DIGIT }} />
                    </div>
                    <div>
                      <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">{AUTH.CONFIRM_PASSWORD}</label>
                      <div className="relative">
                        <input type={showRegisterPassword ? "text" : "password"} value={registerConfirmPassword} onChange={(e) => setRegisterConfirmPassword(e.target.value)} className="w-full border border-border bg-transparent px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors" required />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={(c) => setAcceptedTerms(c === true)} className="rounded-none border-foreground/30 mt-0.5 shrink-0" />
                    <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer select-none">
                      {AUTH.TERMS_ACCEPT}
                    </label>
                    <Link to="/terms" target="_blank" className="text-xs text-muted-foreground/40 underline hover:text-foreground transition-colors shrink-0 mt-0.5">
                      {AUTH.TERMS_READ || "Read"}
                    </Link>
                  </div>
                  <button type="submit" disabled={loading || !acceptedTerms || !isPasswordValid(registerRules) || registerPassword !== registerConfirmPassword} className="w-full bg-primary text-primary-foreground py-3 text-sm tracking-wide uppercase rounded-sm hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md">
                    {loading ? "..." : AUTH.REGISTER}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
