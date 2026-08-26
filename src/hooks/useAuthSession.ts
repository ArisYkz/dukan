import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * Custom hook for authentication session management.
 *
 * Features:
 * - Listens to auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
 * - Ignores INITIAL_SESSION — relies on getSession() for initial load
 * - Redirects to /auth if no session
 * - Returns current user or null
 *
 * @param requireAuth - If true, redirects to login when no session (default: true)
 */
export const useAuthSession = (requireAuth: boolean = true) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Track mounted state to avoid state updates after unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Subscribe to auth state changes
    // INITIAL_SESSION is ignored — getSession() handles the initial load below
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;
      // Skip INITIAL_SESSION — it fires synchronously with potentially stale state.
      // Use getSession() for the authoritative initial session.
      if (event === "INITIAL_SESSION") return;

      if (!session && requireAuth) {
        navigate("/auth");
      } else {
        setUser(session?.user ?? null);
      }
    });

    // Authoritative initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mountedRef.current) return;
      if (!session && requireAuth) {
        navigate("/auth");
      } else {
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [navigate, requireAuth]);

  return { user, loading };
};
