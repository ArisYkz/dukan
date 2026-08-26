import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { useLabels } from "@/hooks/useLabels";
import { validatePassword, isPasswordValid, PasswordRulesChecklist, type PasswordRules } from "@/lib/passwordValidation";

export default function UpdatePassword() {
  const { AUTH, ACTIONS } = useLabels();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rules, setRules] = useState<PasswordRules>({ minLength: false, hasUppercase: false, hasDigit: false });
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    // Listen for auth events that set up the recovery session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;
      if (event === "INITIAL_SESSION") return;

      if ((event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") && session?.user) {
        clearTimeout(timeoutId);
        setSessionReady(true);
      }
    });

    // Check for PKCE code in URL — means we're mid-exchange, wait for it
    const hasCode = searchParams.get("code");

    // Also check if session already exists (e.g. auto-exchanged before mount)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mountedRef.current) return;
      if (session?.user) {
        clearTimeout(timeoutId);
        setSessionReady(true);
      } else if (!hasCode) {
        // No code in URL + no session = not a recovery flow, send away
        navigate("/auth", { replace: true });
      }
      // If hasCode is true, we wait for onAuthStateChange to fire
    });

    // Safety timeout — if the exchange takes too long, give up
    timeoutId = setTimeout(() => {
      if (!mountedRef.current) return;
      if (!sessionReady) {
        navigate("/auth", { replace: true });
      }
    }, 15000);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid(rules)) {
      toast.error(AUTH.PASSWORD_MIN_LENGTH);
      return;
    }
    if (password !== confirmPassword) {
      toast.error(AUTH.PASSWORDS_DO_NOT_MATCH);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(AUTH.PASSWORD_UPDATED);
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Wallet className="w-6 h-6 text-foreground opacity-80" strokeWidth={1.5} />
            <h1 className="font-display text-3xl font-bold tracking-tight">Duken</h1>
          </div>
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground">
            {AUTH.TAGLINE}
          </p>
        </div>

        {!sessionReady ? (
          <div className="border border-border rounded-none p-8 bg-background flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="border border-border rounded-none p-8 bg-background">
            <h2 className="font-mono text-xl mb-6 text-center">{AUTH.NEW_PASSWORD}</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">
                  {AUTH.NEW_PASSWORD}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setRules(validatePassword(e.target.value)); }}
                  className="w-full border border-border bg-transparent px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                  minLength={8}
                />
                <PasswordRulesChecklist rules={rules} labels={{ length: AUTH.PASSWORD_RULE_LENGTH, uppercase: AUTH.PASSWORD_RULE_UPPERCASE, digit: AUTH.PASSWORD_RULE_DIGIT }} />
              </div>
              <div>
                <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">
                  {AUTH.CONFIRM_PASSWORD}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-border bg-transparent px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || !isPasswordValid(rules) || password !== confirmPassword}
                className="w-full bg-primary text-primary-foreground py-3 text-sm tracking-wide uppercase rounded-sm hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? ACTIONS.LOADING : ACTIONS.UPDATE}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}
