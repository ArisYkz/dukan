import { supabase } from "@/integrations/supabase/client";

export const checkIsAdmin = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  return profile?.role === "admin";
};

const PAGE_SIZE = 20;

// -- Query functions ----------------------------------------------------------

export const fetchAllStores = async (search: string, page: number) => {
  let q = supabase.from("stores").select("*", { count: "exact" });
  if (search) q = q.ilike("name", `%${search}%`);
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, error, count } = await q.order("created_at", { ascending: false }).range(from, to);
  if (error) throw error;
  return { stores: data ?? [], count: count ?? 0 };
};

export const fetchAllProducts = async (search: string, page: number) => {
  let q = supabase.from("products").select("*, stores(name, slug)", { count: "exact" });
  if (search) q = q.ilike("name", `%${search}%`);
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, error, count } = await q.order("created_at", { ascending: false }).range(from, to);
  if (error) throw error;
  return { products: data ?? [], count: count ?? 0 };
};

export const fetchStoreProducts = async (storeId: string) => {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, stock, is_active, image_url, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const fetchStoreOrders = async (storeId: string) => {
  const { data, error } = await supabase
    .from("orders")
    .select("id, public_order_id, status, total_price, customer_name, customer_phone, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const fetchAllOrders = async (search: string, status: string, page: number) => {
  let q = supabase.from("orders").select("*, stores(name, slug)", { count: "exact" });
  if (search) q = q.or(`public_order_id.ilike.%${search}%,customer_phone.ilike.%${search}%`);
  if (status && status !== "all") q = q.eq("status", status);
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, error, count } = await q.order("created_at", { ascending: false }).range(from, to);
  if (error) throw error;
  return { orders: data ?? [], count: count ?? 0 };
};

export const fetchAllProfiles = async (search: string, page: number) => {
  let q = supabase.from("profiles").select("*", { count: "exact" });
  if (search) q = q.or(`display_name.ilike.%${search}%,user_id.ilike.%${search}%`);
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, error, count } = await q.order("created_at", { ascending: false }).range(from, to);
  if (error) throw error;
  return { profiles: data ?? [], count: count ?? 0 };
};

export const fetchUsersWithStores = async (search: string, page: number) => {
  let q = supabase.from("profiles").select("user_id, display_name, email, role, plan_type, subscription_status, subscription_expiry, subscription_active, created_at", { count: "exact" });
  if (search) q = q.or(`display_name.ilike.%${search}%,email.ilike.%${search}%,user_id.ilike.%${search}%`);
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: profiles, error, count } = await q.order("created_at", { ascending: false }).range(from, to);
  if (error) throw error;

  const userIds = (profiles ?? []).map((p: any) => p.user_id);
  if (userIds.length === 0) return { users: [], count: 0 };

  const { data: stores, error: storesErr } = await supabase
    .from("stores")
    .select("id, name, slug, user_id")
    .in("user_id", userIds);
  if (storesErr) throw storesErr;

  const storeMap = new Map((stores ?? []).map((s: any) => [s.user_id, s]));

  const users = (profiles ?? []).map((profile: any) => {
    const store = storeMap.get(profile.user_id) ?? null;
    if (store) {
      const { user_id, ...storeData } = store;
      return { ...profile, store: storeData };
    }
    return { ...profile, store: null };
  });

  return { users, count: count ?? 0 };
};

export const fetchAdminStats = async () => {
  const [{ count: storeCount }, { count: orderCount }, { count: productCount }, { count: userCount }] = await Promise.all([
    supabase.from("stores").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
  ]);
  return {
    totalStores: storeCount ?? 0,
    totalOrders: orderCount ?? 0,
    totalProducts: productCount ?? 0,
    totalUsers: userCount ?? 0,
  };
};

// -- Mutation functions --------------------------------------------------------

/** Find the store owner and ban their profile-level subscription */
export const banStore = async (storeId: string) => {
  const { data: owner } = await supabase
    .from("store_members")
    .select("user_id")
    .eq("store_id", storeId)
    .eq("role", "owner")
    .maybeSingle();

  if (!owner) throw new Error("Store owner not found");

  // Update both profiles (source of truth) and stores (legacy column, still read by UI)
  const [{ error: profileErr }, { error: storeErr }] = await Promise.all([
    supabase.from("profiles").update({ subscription_status: "banned" }).eq("user_id", owner.user_id),
    supabase.from("stores").update({ subscription_status: "banned" }).eq("id", storeId),
  ]);
  if (profileErr) throw profileErr;
  if (storeErr) throw storeErr;
};

/** Find the store owner and unban their profile-level subscription */
export const unbanStore = async (storeId: string) => {
  const { data: owner } = await supabase
    .from("store_members")
    .select("user_id")
    .eq("store_id", storeId)
    .eq("role", "owner")
    .maybeSingle();

  if (!owner) throw new Error("Store owner not found");

  const [{ error: profileErr }, { error: storeErr }] = await Promise.all([
    supabase.from("profiles").update({ subscription_status: "active" }).eq("user_id", owner.user_id),
    supabase.from("stores").update({ subscription_status: "active" }).eq("id", storeId),
  ]);
  if (profileErr) throw profileErr;
  if (storeErr) throw storeErr;
};

export const toggleStorePause = async (storeId: string, isPaused: boolean) => {
  const { error } = await supabase.from("stores").update({ is_paused: isPaused }).eq("id", storeId);
  if (error) throw error;
};

export const adminUpdateSubscription = async (userId: string, data: {
  plan_type?: string;
  subscription_status?: string;
  subscription_expiry?: string | null;
  role?: string;
  subscription_screenshot_url?: string | null;
}) => {
  const { error } = await supabase.from("profiles").update(data).eq("user_id", userId);
  if (error) throw error;
};

export const fetchPendingSubscriptions = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("subscription_status", "pre_authorized")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const fetchActiveSubscriptions = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("subscription_status", "active")
    .neq("plan_type", "free")
    .order("subscription_expiry", { ascending: true });
  if (error) throw error;
  return data ?? [];
};

export const adminRejectSubscription = async (userId: string) => {
  const { error } = await supabase
    .from("profiles")
    .update({
      plan_type: "free",
      subscription_status: "none",
      subscription_screenshot_url: null,
      subscription_expiry: null,
    })
    .eq("user_id", userId);
  if (error) throw error;
};
