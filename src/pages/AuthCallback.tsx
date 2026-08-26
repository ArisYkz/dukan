import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      // Check if auto-exchanged during client init
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();
        navigate(profile?.role === "admin" ? "/admin" : "/dashboard", { replace: true });
        return;
      }

      // Manual PKCE exchange as fallback
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          const { data: { session: s } } = await supabase.auth.getSession();
          if (s?.user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("role")
              .eq("user_id", s.user.id)
              .maybeSingle();
            navigate(profile?.role === "admin" ? "/admin" : "/dashboard", { replace: true });
            return;
          }
        }
      }

      navigate("/auth", { replace: true });
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

export default AuthCallback;
