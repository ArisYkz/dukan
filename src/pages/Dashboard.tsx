import { useCallback, useEffect, useRef, useState, useMemo, memo } from "react";
import { getThemeStyleVars } from "@/lib/storeThemes";
import { useTheme } from "@/hooks/useTheme";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStoreData } from "@/hooks/useStoreData";
import { useDashboardActions } from "@/hooks/useDashboardActions";
import type { BrandFormState } from "@/types/store";
import {
  formatPrice, ARCHIVED_STATUSES, filterStatuses, filterOrdersBySearch,
  type OrderFilter,
} from "@/lib/format";
import { FREE_CONFIRMED_LIMIT, OrderStatus } from "@/constants/business";
import { ERROR_CODES, useFormatError } from "@/lib/errorCodes";
import { useLabels } from "@/hooks/useLabels";
import { useTranslation } from "react-i18next";
import { isSlugOffensive } from "@/lib/slugFilter";
import { createStore as createStoreService } from "@/services/storeService";
import { deleteProduct as deleteProductService } from "@/services/productService";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardTabs, { type DashboardTab } from "@/components/dashboard/DashboardTabs";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import BrandingTab from "@/components/dashboard/BrandingTab";
import ProductsTab from "@/components/dashboard/ProductsTab";
import OrdersTab from "@/components/dashboard/OrdersTab";
import ArchiveTab from "@/components/dashboard/ArchiveTab";
import BannedScreen from "@/components/dashboard/BannedScreen";
import StoreCreationForm from "@/components/dashboard/StoreCreationForm";
import ConfirmModal from "@/components/dashboard/ConfirmModal";
import ManualOrderForm from "@/components/dashboard/ManualOrderForm";
import UpgradeModal from "@/components/dashboard/UpgradeModal";
import AnalyticsSection from "@/components/AnalyticsSection";
import StoreStatsWidget from "@/components/dashboard/StoreStatsWidget";
import SubscriptionSection from "@/components/SubscriptionSection";
import PromoCodesTab from "@/components/dashboard/PromoCodesTab";
import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ProOnlyGate = ({ onUpgrade }: { onUpgrade: () => void }) => {
  const { UPGRADE, DASHBOARD_BANNERS } = useLabels();
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <Lock className="w-10 h-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground tracking-wide uppercase">{UPGRADE.GENERIC_PRO_ONLY}</p>
      <button onClick={onUpgrade} className="bg-primary text-primary-foreground px-6 py-2.5 text-sm rounded-sm hover:opacity-90 transition-opacity">
        {DASHBOARD_BANNERS.UPGRADE_TO_PRO}
      </button>
    </div>
  );
};

const Dashboard = () => {
  const { MESSAGES, CONFIRM, CSV_HEADERS, AUTH, ACTIONS, PRODUCTS_TAB, ERRORS, DASHBOARD_BANNERS } = useLabels();
  const { t } = useTranslation();
  const formatError = useFormatError();
  const { dark } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    user, stores, store, currentStoreId, setCurrentStoreId,
    products, orders, productImages,
    loading, showStoreForm, setShowStoreForm, isPro, profile, reload,
    updateOrderOptimistic, rollbackOrder,
    productsLoading, ordersLoading,
  } = useStoreData();
  const isMobile = useIsMobile();

  // Track admin status for header link
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle()
      .then(({ data: p }) => setIsAdmin(p?.role === "admin"));
  }, [user?.id]);

  // Bridge themed --surface-warm to :root so portaled sidebar Sheet inherits it
  const dashRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = dashRef.current;
    if (!el) return;
    const root = document.documentElement;
    const val = getComputedStyle(el).getPropertyValue("--surface-warm").trim();
    root.style.setProperty("--sidebar-surface", val);
    return () => { root.style.removeProperty("--sidebar-surface"); };
  }, [store?.theme_preset, dark]);

  const [tab, setTab] = useState<DashboardTab>(() => {
    // Support ?tab=billing from landing page redirect
    const t = searchParams.get("tab");
    if (t === "billing" || t === "products" || t === "orders" || t === "archive" || t === "branding" || t === "promo" || t === "stats") return t as DashboardTab;
    return "products";
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCreateStore, setShowCreateStore] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<{ orderId: string; newStatus: string } | null>(null);
  const [showManualOrder, setShowManualOrder] = useState(false);
  const [isSlugTaken, setIsSlugTaken] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");

  const [storeForm, setStoreForm] = useState({ name: "", slug: "", instagram: "" });

  const [brandForm, setBrandForm] = useState<BrandFormState>({
    name: "", slug: "", instagram: "", tiktok_handle: "", telegram_chat_id: "",
    hero_image_url: null, hero_title: "", hero_subtitle: "",
    payment_qr_image: null,
    payment_phone: "", payment_name: "",
    whatsapp_phone: "",
    social_platform: "whatsapp",
    show_instagram: true, show_tiktok: false, show_telegram: false,
    show_banner: true,
    default_language: "en",
    tax_enabled: false,
    tax_percent: "0",
    theme_preset: "classic",
  });
  const [savingBrand, setSavingBrand] = useState(false);

  useEffect(() => {
    if (!store) return;
    setBrandForm({
      name: store.name || "",
      slug: store.slug || "",
      instagram: store.instagram || "",
      tiktok_handle: store.tiktok_handle || "",
      telegram_chat_id: store.telegram_chat_id || "",
      hero_image_url: store.hero_image_url || null,
      hero_title: store.hero_title || "",
      hero_subtitle: store.hero_subtitle || "",
      payment_qr_image: store.payment_qr_image || null,
      payment_phone: store.payment_phone || "",
      payment_name: store.payment_name || "",
      whatsapp_phone: store.whatsapp_phone || "",
      social_platform: store.social_platform || "whatsapp",
      show_instagram: store.show_instagram ?? true,
      show_tiktok: store.show_tiktok ?? false,
      show_telegram: store.show_telegram ?? false,
      show_banner: store.show_banner ?? true,
      default_language: store.default_language || "en",
      tax_enabled: store.tax_enabled ?? false,
      tax_percent: String(store.tax_percent ?? 0),
      theme_preset: store.theme_preset || "classic",
    });
  }, [store]);

  const filteredOrders = useMemo(() => {
    const byStatus = orders.filter((order) => filterStatuses[orderFilter].includes(order.status));
    return filterOrdersBySearch(byStatus, orderSearch);
  }, [orders, orderFilter, orderSearch]);

  const archivedOrders = useMemo(() => {
    const archived = orders.filter((order) => ARCHIVED_STATUSES.includes(order.status));
    return filterOrdersBySearch(archived, archiveSearch);
  }, [orders, archiveSearch]);

  const totalConfirmed = useMemo(() => {
    const confirmedStatuses: string[] = [OrderStatus.PAID_CONFIRMED, OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED];
    return orders.filter(o => confirmedStatuses.includes(o.status)).reduce((sum, o) => sum + o.total_price, 0);
  }, [orders]);

  // Use centralized dashboard actions hook
  const { updateOrderStatus, exportCSV, saveBranding: saveBrandingAction, createStore: createStoreAction } = useDashboardActions({
    isPro,
    orders,
    totalConfirmed,
    updateOrderOptimistic,
    rollbackOrder,
    reload,
    MESSAGES,
    ERRORS,
  });

  useEffect(() => {
    if (!user) return;
    const action = searchParams.get("paymentAction");
    const orderId = searchParams.get("orderId");
    if (!action || !orderId) return;
    const status = action === "confirm" ? OrderStatus.PAID_CONFIRMED : action === "reject" ? OrderStatus.PAYMENT_REJECTED : null;
    if (!status) return;
    updateOrderStatus(orderId, status, true).then(() => {
      toast.success(status === OrderStatus.PAID_CONFIRMED ? MESSAGES.PAYMENT_CONFIRMED : MESSAGES.PAYMENT_REJECTED);
      setSearchParams({}, { replace: true });
      setTab("orders");
    });
  }, [searchParams, setSearchParams, updateOrderStatus, user]);

  const storeTaxPercent = store?.tax_enabled ? store.tax_percent : 0;

  const createStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createStoreAction(user!.id, storeForm.name, createStoreService);
    if (success) {
      setStoreForm({ name: "", slug: "", instagram: "" });
      setShowCreateStore(false);
    }
  };

  const saveBranding = async () => {
    if (!store) return;

    // Check if slug is taken before saving
    if (isSlugTaken) {
      toast.error(MESSAGES.SLUG_TAKEN);
      return;
    }

    const success = await saveBrandingAction(store, brandForm);
    if (success) {
      setSavingBrand(false);
    }
  };

  const deleteProduct = async (id: string) => {
    const { error, isConstraintError, message } = await deleteProductService(id);
    if (error) {
      // Show specific error for constraint violations
      if (isConstraintError) {
        toast.error(message || PRODUCTS_TAB.DELETE_CONSTRAINT_ERROR);
      } else {
        toast.error(formatError(ERROR_CODES.PRD_003));
      }
      return;
    }
    toast.success(MESSAGES.PRODUCT_DELETED);
    reload();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(AUTH.LOGGED_OUT);
    window.location.href = "/";
  };

  const activeOrderCount = useMemo(() => orders.filter((order) => !ARCHIVED_STATUSES.includes(order.status)).length, [orders]);
  const archivedOrderCount = useMemo(() => orders.filter((order) => ARCHIVED_STATUSES.includes(order.status)).length, [orders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-9 w-24" />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (profile?.subscription_status === "banned") {
    return <BannedScreen onLogout={handleLogout} />;
  }

  if (showStoreForm && !store) {
    return <StoreCreationForm storeForm={storeForm} setStoreForm={setStoreForm} onSubmit={createStore} />;
  }

  if (!store || !user) return null;

  return (
    <div ref={dashRef} className="min-h-screen bg-background" style={getThemeStyleVars(store.theme_preset || "classic", dark)}>
      <SidebarProvider defaultOpen={false}>
        {isMobile && (
          <DashboardSidebar
            tab={tab} setTab={setTab}
            productCount={products.length}
            activeOrderCount={activeOrderCount}
            archivedOrderCount={archivedOrderCount}
            isPro={isPro}
            onLogout={handleLogout}
          />
        )}

        <div className="flex flex-1 flex-col min-w-0">
          <DashboardHeader store={store} stores={stores} currentStoreId={currentStoreId ?? ""} onStoreChange={setCurrentStoreId} onCreateStore={() => setShowCreateStore(true)} isPro={isPro} isAdmin={isAdmin} onLogout={handleLogout} />

          {/* Limit reached banner */}
          {!isPro && store.is_paused && (
            <div className="border-b border-border">
              <div className="container py-8 space-y-4">
                <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  {DASHBOARD_BANNERS.ACTION_REQUIRED}
                </p>
                <p className="font-mono text-sm text-foreground max-w-lg leading-relaxed">
                  {t("DASHBOARD_BANNERS.LIMIT_REACHED_DESC", { earned: formatPrice(store.total_earned || 0), limit: formatPrice(FREE_CONFIRMED_LIMIT) })}
                </p>
                <button
                  onClick={() => setTab("billing")}
                  className="font-mono text-[10px] tracking-[0.15em] uppercase px-6 py-2.5 bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
                >
                  {DASHBOARD_BANNERS.UPGRADE_TO_PRO}
                </button>
              </div>
            </div>
          )}

          {/* Under review banner */}
          {(store.report_count ?? 0) >= 5 && !store.is_verified && (
            <div className="border-b border-border">
              <div className="container py-8 space-y-4">
                <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                  {DASHBOARD_BANNERS.SECURITY_CHECK}
                </p>
                <p className="font-mono text-sm text-foreground max-w-lg leading-relaxed">
                  {DASHBOARD_BANNERS.REVIEW_DESC}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground max-w-lg leading-relaxed">
                  {DASHBOARD_BANNERS.REVIEW_PRO_NOTE}
                </p>
                <button
                  onClick={() => setTab("billing")}
                  className="font-mono text-[10px] tracking-[0.15em] uppercase px-6 py-2.5 bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
                >
                  {DASHBOARD_BANNERS.GET_VERIFIED}
                </button>
              </div>
            </div>
          )}

          {(() => {
            const tabContent = (
              <>
                {tab === "branding" && (
                  <BrandingTab store={store} userId={user.id} brandForm={brandForm} setBrandForm={setBrandForm} savingBrand={savingBrand} onSave={saveBranding} isSlugTaken={isSlugTaken} isCheckingSlug={isCheckingSlug} setIsSlugTaken={setIsSlugTaken} setIsCheckingSlug={setIsCheckingSlug} isPro={isPro} onShowUpgrade={() => { setTab("billing"); }} />
                )}

                {tab === "products" && (
                  productsLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-8 w-48" />
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                        {[1, 2, 3, 4].map((i) => (
                          <Skeleton key={i} className="h-64 w-full" />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <ProductsTab products={products} productImages={productImages} storeId={store.id} userId={user.id} isPro={isPro} isPaused={!isPro && store.is_paused} isVerificationBlocked={false} verificationStatus={null} onShowUpgrade={() => setShowUpgradeModal(true)} onReload={reload} onDeleteConfirm={setDeleteConfirmId} />
                  )
                )}

                {tab === "orders" && (
                  <>
                    {showManualOrder && (
                      <ManualOrderForm
                        products={products}
                        storeId={store.id}
                        onClose={() => setShowManualOrder(false)}
                        onCreated={reload}
                      />
                    )}
                    {ordersLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-8 w-48" />
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : (
                      <OrdersTab orders={orders} filteredOrders={filteredOrders} orderFilter={orderFilter} setOrderFilter={setOrderFilter} orderSearch={orderSearch} setOrderSearch={setOrderSearch} onStatusChange={(orderId, status) => updateOrderStatus(orderId, status)} onCancelConfirm={(orderId, newStatus) => setCancelConfirm({ orderId, newStatus })} onArchive={(orderId) => updateOrderStatus(orderId, "archived")} onExportCSV={() => exportCSV(filteredOrders, storeTaxPercent, CSV_HEADERS, store?.name)} onCreateOrder={() => setShowManualOrder(true)} revenueLimitReached={!isPro && totalConfirmed >= FREE_CONFIRMED_LIMIT} isPro={isPro} />
                    )}
                  </>
                )}

                {tab === "archive" && (
                  <ArchiveTab archivedOrders={archivedOrders} archiveSearch={archiveSearch} setArchiveSearch={setArchiveSearch} />
                )}

                {tab === "promo" && (
                  isPro ? <PromoCodesTab storeId={store.id} /> : <ProOnlyGate onUpgrade={() => { setTab("billing"); }} />
                )}

                {tab === "stats" && (
                  <AnalyticsSection storeId={store?.id} isPro={isPro} onUpgradeClick={() => { setTab("billing"); }} orders={orders} />
                )}

                {tab === "billing" && (
                  <SubscriptionSection userId={user.id} profile={{ plan_type: profile?.plan_type || "free", subscription_status: profile?.subscription_status || "none", subscription_screenshot_url: profile?.subscription_screenshot_url || null, subscription_expiry: profile?.subscription_expiry || null }} isPro={isPro} onDataChange={reload} />
                )}

              </>
            );

            return (
              <div>
                {isMobile ? (
                  <div className="container py-4">
                    <StoreStatsWidget store={store} orders={orders} />
                    {tabContent}
                  </div>
                ) : (
                  <div className="container py-8">
                    <StoreStatsWidget store={store} orders={orders} />
                    <DashboardTabs tab={tab} setTab={setTab} productCount={products.length} activeOrderCount={activeOrderCount} archivedOrderCount={archivedOrderCount} isPro={isPro} />
                    {tabContent}
                  </div>
                )}
              </div>
            );
          })()}

          <footer style={{ backgroundColor: "hsl(var(--footer-bg))", color: "hsl(var(--footer-fg))" }} className="py-3 md:py-6 mt-auto">
            <div className="container text-center space-y-2">
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: "hsl(var(--footer-fg) / 0.6)" }}>
                Dokan — 2026
              </p>
              <p className="font-mono text-[10px] tracking-wide" style={{ color: "hsl(var(--footer-fg) / 0.3)" }}>
                For local entrepreneurs
              </p>
            </div>
          </footer>
        </div>

        <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} onUpgrade={() => { setTab("billing"); setShowUpgradeModal(false); }} />

        <Dialog open={showCreateStore} onOpenChange={setShowCreateStore}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-mono tracking-wide">Create new store</DialogTitle>
            </DialogHeader>
            <form onSubmit={createStore} className="space-y-4 mt-2">
              <div>
                <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">Store name</label>
                <input value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} className="w-full border border-border bg-transparent px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
              </div>
              <div>
                <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">Instagram (optional)</label>
                <input value={storeForm.instagram} onChange={(e) => setStoreForm({ ...storeForm, instagram: e.target.value })} placeholder="@username" className="w-full border border-border bg-transparent px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <button type="submit" className="w-full bg-primary text-primary-foreground py-3 text-sm tracking-wide uppercase rounded-sm hover:opacity-90 transition-opacity">
                Create store
              </button>
            </form>
          </DialogContent>
        </Dialog>

        {deleteConfirmId && (
          <ConfirmModal
            title={CONFIRM.DELETE_PRODUCT_TITLE}
            message={CONFIRM.DELETE_PRODUCT_MSG}
            confirmLabel={ACTIONS.DELETE}
            onConfirm={() => { deleteProduct(deleteConfirmId); setDeleteConfirmId(null); }}
            onCancel={() => setDeleteConfirmId(null)}
          />
        )}

        {cancelConfirm && (
          <ConfirmModal
            title={cancelConfirm.newStatus === "cancelled" ? CONFIRM.CANCEL_ORDER_TITLE : CONFIRM.PAYMENT_NOT_RECEIVED_TITLE}
            message={CONFIRM.RETURN_STOCK_MSG}
            confirmLabel={CONFIRM.YES_RETURN}
            onConfirm={() => { updateOrderStatus(cancelConfirm.orderId, cancelConfirm.newStatus); setCancelConfirm(null); }}
            onCancel={() => setCancelConfirm(null)}
            variant="danger"
          />
        )}
      </SidebarProvider>
    </div>
  );
};

export default Dashboard;
