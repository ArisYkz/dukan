import { useMemo, useCallback, useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useStoreQuery } from "@/hooks/queries/useStoreQuery";
import { useProductsQuery } from "@/hooks/queries/useProductsQuery";
import { useOrdersQuery } from "@/hooks/queries/useOrdersQuery";
import { supabase } from "@/integrations/supabase/client";

const STORE_ID_KEY = "dokan_current_store_id";

/**
 * Custom hook for dashboard data (stores, products, orders).
 * Supports multi-store architecture via store_members.
 * Pro subscription is per-user (profiles table), not per-store.
 */
export const useStoreData = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthSession(true);

  const storeQuery = useStoreQuery(user?.id);
  const stores = storeQuery.data ?? [];

  // Fetch user profile for subscription data (Pro is per-user)
  const profileQuery = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("plan_type, subscription_status, subscription_active, subscription_screenshot_url, subscription_expiry, display_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const profile = profileQuery.data;

  // Live-sync profile: admin plan/status changes (e.g. upgrade) reflect
  // without waiting for the next refetch — same pattern as SubscriptionSection.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("user-profile-sync")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Restore persisted selection, defaulting to first store
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(() => {
    const stored = localStorage.getItem(STORE_ID_KEY);
    return stored || null;
  });

  // When stores load, pick first if nothing selected or current is invalid
  useEffect(() => {
    if (stores.length === 0) {
      if (currentStoreId !== null) setCurrentStoreId(null);
      return;
    }
    if (!currentStoreId || !stores.some((s) => s.id === currentStoreId)) {
      const id = stores[0].id;
      setCurrentStoreId(id);
      localStorage.setItem(STORE_ID_KEY, id);
    }
  }, [stores, currentStoreId]);

  const store = stores.find((s) => s.id === currentStoreId) ?? null;

  const productsQuery = useProductsQuery(store?.id);
  const products = productsQuery.data?.products ?? [];
  const productImages = productsQuery.data?.images ?? {};

  const ordersQuery = useOrdersQuery(store?.id);
  const orders = ordersQuery.data ?? [];

  const loading = storeQuery.isLoading || (!store && stores.length > 0 && !!user);
  const showStoreForm = !storeQuery.isLoading && stores.length === 0 && !!user;

  const reload = useCallback(() => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ["dashboard-store", user.id] });
      queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] });
    }
    if (store?.id) {
      queryClient.invalidateQueries({ queryKey: ["dashboard-products", store.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-orders", store.id] });
      queryClient.invalidateQueries({ queryKey: ["analytics", store.id] });
    }
  }, [user?.id, store?.id, queryClient]);

  const reloadProducts = useCallback(() => {
    if (store?.id) queryClient.invalidateQueries({ queryKey: ["dashboard-products", store.id] });
  }, [store?.id, queryClient]);

  const reloadStore = useCallback(() => {
    if (user?.id) queryClient.invalidateQueries({ queryKey: ["dashboard-store", user.id] });
  }, [user?.id, queryClient]);

  const changeStore = useCallback((storeId: string) => {
    setCurrentStoreId(storeId);
    localStorage.setItem(STORE_ID_KEY, storeId);
  }, []);

  // Pro is per-user, not per-store
  const isPro = useMemo(() => {
    if (!profile) return false;
    // Check subscription expiry first — expired subscriptions revert to free
    if (profile.subscription_expiry) {
      const expiry = new Date(profile.subscription_expiry);
      if (expiry <= new Date()) return false;
    }
    const plan = (profile.plan_type || "").toLowerCase();
    return (
      (plan.includes("pro") || profile.subscription_status === "pre_authorized") &&
      profile.subscription_status !== "banned"
    );
  }, [profile]);

  return {
    user,
    stores,
    store,
    currentStoreId,
    setCurrentStoreId: changeStore,
    products,
    orders,
    productImages,
    loading,
    productsLoading: productsQuery.isLoading,
    ordersLoading: ordersQuery.isLoading,
    showStoreForm,
    setShowStoreForm: () => {},
    isPro,
    profile,
    reload,
    reloadProducts,
    reloadStore,
    updateOrderOptimistic: ordersQuery.updateOrderOptimistic,
    rollbackOrder: ordersQuery.rollbackOrder,
  };
};
