import { useState, useMemo, useEffect, useRef, lazy, Suspense } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Facebook, Instagram, MessageCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getThemeStyleVars } from "@/lib/storeThemes";
import { useTheme } from "@/hooks/useTheme";
import { useProductSorting, type SortConfig } from "@/hooks/useProductSorting";
import { useProductSearch } from "@/hooks/useProductSearch";
import { useCart, type CartProduct } from "@/hooks/useCart";
import dokanLogo from "@/assets/dokan-logo.webp";
import OGMetaTags from "@/components/OGMetaTags";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import LanguageDropdown from "@/components/LanguageDropdown";
import { useLanguage } from "@/contexts/LanguageContext";
import ActionBar from "@/components/ActionBar";
import { useLabels } from "@/hooks/useLabels";
import { Skeleton } from "@/components/ui/skeleton";
import CategoryFilter from "@/components/dashboard/CategoryFilter";
import StoreHero from "@/components/StoreHero";
import StoreFooter from "@/components/StoreFooter";
import ProductGridSection from "@/components/ProductGridSection";
import type { StoreRow, Product, CartItem } from "@/types/store";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { FREE_CONFIRMED_LIMIT } from "@/constants/business";
import { incrementStoreViews } from "@/services/storeService";
import { isPaidPlan } from "@/lib/billing";
import { useStorefrontStore, useStorefrontProducts } from "@/hooks/queries/useStorefront";

// Lazy-load heavy components
const ProductDetail = lazy(() => import("@/components/ProductDetail"));
import CheckoutSheet from "@/components/CheckoutSheet";
const ReportStoreDrawer = lazy(() => import("@/components/ReportStoreDrawer"));

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

type ProductWithCategory = Product & {
  category: string | null;
  created_at?: string | null;
};

type ProductRowFromDB = Database["public"]["Tables"]["products"]["Row"];

const mapProducts = (fetchedProducts: ProductRowFromDB[]): ProductWithCategory[] =>
  fetchedProducts.map((p) => ({
    id: p.id, name: p.name, price: p.price,
    image: p.image_url || "/placeholder.svg",
    description: p.description || "", stock: p.stock,
    category: p.category || null,
    sort_order: p.sort_order ?? 0,
    tags: p.tags ?? [],
    created_at: p.created_at ?? null,
  }));

const StoreFront = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { STOREFRONT } = useLabels();
  const { dark } = useTheme();

  // React Query for store
  const { data: store, isLoading: storeLoading, isError: storeError } = useStorefrontStore(slug);

  // Set language when store loads (branding default is for customers)
  const langSet = useRef(false);
  const { setLanguage } = useLanguage();
  useEffect(() => {
    if (!store || langSet.current) return;
    const lang = store.default_language;
    if (lang === "en" || lang === "bn") setLanguage(lang, false);
    langSet.current = true;
  }, [store, setLanguage]);

  // Session-deduplicated view increment
  const viewTracked = useRef(false);
  useEffect(() => {
    if (!store?.id || viewTracked.current) return;
    const key = `viewed_${store.id}`;
    if (!sessionStorage.getItem(key)) {
      incrementStoreViews(store.id);
      sessionStorage.setItem(key, "1");
    }
    viewTracked.current = true;
  }, [store?.id]);

  // React Query for initial products
  const { data: prodData, isLoading: productsLoading } = useStorefrontProducts(store?.id);

  // Fetch owner profile for subscription status (Pro/banned is per-user, not per-store)
  const { data: ownerProfile } = useQuery({
    queryKey: ["store-owner-profile", store?.user_id],
    queryFn: async () => {
      if (!store?.user_id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("plan_type, subscription_status, subscription_expiry")
        .eq("user_id", store.user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!store?.user_id,
    staleTime: 60_000,
  });

  const [sortMode, setSortMode] = useState<'default' | 'price-asc' | 'price-desc' | 'date-asc' | 'date-desc'>('default');
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showReport, setShowReport] = useState(false);

  // Map fetched products
  const products = useMemo(() => {
    if (!prodData) return [];
    return mapProducts(prodData.products);
  }, [prodData]);

  // Search hook with debounce
  const { searchQuery, setSearchQuery, filteredProducts: searchedProducts } = useProductSearch<ProductWithCategory>(products);

  // Sort config mapping
  const sortConfig: SortConfig = useMemo(() => {
    if (sortMode === 'default') return { type: 'default' };
    if (sortMode.startsWith('price')) return { type: 'price', direction: sortMode.includes('asc') ? 'asc' : 'desc' };
    if (sortMode.startsWith('date')) return { type: 'date', direction: sortMode.includes('asc') ? 'asc' : 'desc' };
    return { type: 'default' };
  }, [sortMode]);

  // Sorting hook
  const sortedProducts = useProductSorting(searchedProducts, sortConfig);

  // Category filtering
  const categoryFilteredProducts = useMemo(() => {
    if (activeCategory === "all") return sortedProducts;
    return sortedProducts.filter(p => p.category === activeCategory);
  }, [sortedProducts, activeCategory]);

  // Cart hook with localStorage persistence
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart, cartCount } = useCart();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  const productImagesMap = prodData?.images ?? {};
  const productVariantsMap = prodData?.variants ?? {};


  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => { if (p.category) cats.add(p.category); });
    return Array.from(cats).sort();
  }, [products]);

  const loading = storeLoading || productsLoading;
  const notFound = storeError || (!storeLoading && !store);

  const instagramLink = `https://instagram.com/${(store?.instagram || "").replace("@", "")}`;
  const tiktokLink = `https://tiktok.com/@${(store?.tiktok_handle || store?.instagram || "").replace("@", "")}`;
  const telegramLink = `https://t.me/${(store?.telegram_chat_id || "").replace("@", "")}`;
  const facebookLink = `https://m.me/${(store?.facebook || "").replace("@", "")}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border/20 h-14 flex items-center px-4">
          <Skeleton className="h-5 w-20" />
          <div className="flex-1" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
        <Skeleton className="w-full h-64 md:h-[420px] rounded-none" />
        <div className="container py-12">
          <Skeleton className="h-3 w-24 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="border border-border overflow-hidden">
                <Skeleton className="aspect-square w-full rounded-none" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-mono text-3xl mb-2">{STOREFRONT.STORE_NOT_FOUND}</h1>
          <p className="text-muted-foreground">{STOREFRONT.INVALID_LINK}</p>
        </div>
      </div>
    );
  }

  if (!store) return null;

  // Banned store check (subscription_status is on profiles, not stores)
  if (ownerProfile?.subscription_status === "banned") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="border border-border rounded-none p-12 max-w-md text-center space-y-4">
          <h1 className="font-mono text-2xl font-bold">{STOREFRONT.STORE_UNAVAILABLE}</h1>
          <p className="font-mono text-sm text-muted-foreground">{STOREFRONT.CONTACT_SUPPORT}</p>
          <a href="/" className="inline-block font-mono text-xs tracking-wide uppercase border border-border px-4 py-2 hover:bg-muted transition-colors">
            {STOREFRONT.RETURN_TO_DOKAN}
          </a>
        </div>
      </div>
    );
  }

  const totalEarned = Number(store.total_earned ?? 0);
  const reportCount = Number(store.report_count ?? 0);
  const subExpiry = ownerProfile?.subscription_expiry ? new Date(ownerProfile.subscription_expiry) : null;
  const isPro = isPaidPlan(ownerProfile?.plan_type, ownerProfile?.subscription_status) &&
    (!subExpiry || subExpiry > new Date());
  const isOverLimit = !isPro && Number.isFinite(totalEarned) && totalEarned >= FREE_CONFIRMED_LIMIT;
  const isUnderReview = !store.is_verified && reportCount >= 5;
  const storePaused = !!(store.is_paused) || isOverLimit || isUnderReview;

  const ogImage = store.hero_image_url || (products.length > 0 ? products[0].image : undefined);
  const themeStyle = getThemeStyleVars(store.theme_preset || "classic", dark);

  const handleSortChange = (type: 'default' | 'price' | 'date') => {
    if (type === 'default') {
      setSortMode('default');
    } else if (type === 'price') {
      // Toggle direction if already on price, else default to asc
      if (sortMode.startsWith('price')) {
        setSortMode(sortMode === 'price-asc' ? 'price-desc' : 'price-asc');
      } else {
        setSortMode('price-asc');
      }
    } else if (type === 'date') {
      if (sortMode.startsWith('date')) {
        setSortMode(sortMode === 'date-asc' ? 'date-desc' : 'date-asc');
      } else {
        setSortMode('date-desc');
      }
    }
  };

  return (
    <div className={`min-h-screen relative bg-[hsl(var(--background))]${storePaused ? ' pt-8' : ''}`} style={themeStyle}>
      {storePaused && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-foreground text-background font-mono text-[10px] tracking-[0.3em] uppercase text-center py-2">
          {isUnderReview ? STOREFRONT.UNDER_REVIEW_BANNER : STOREFRONT.PAUSED_BANNER}
        </div>
      )}
      <OGMetaTags
        title={`${store.name} on Dokan`}
        description={store.hero_subtitle || `${store.name} — Dokan store`}
        image={ogImage || undefined}
      />
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/20 backdrop-blur-md" style={{ backgroundColor: "hsl(var(--nav-bg) / 0.8)", color: "hsl(var(--nav-fg))" }}>
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3 shrink-0 min-w-0">
            <Link to="/" className="shrink-0">
              <img src={dokanLogo} alt="Dokan" className="h-5 sm:h-6 dark:invert" />
            </Link>
            <span className="font-mono text-sm font-medium truncate max-w-[140px] sm:max-w-[200px]">{store.name}</span>
            {store.is_verified && (
              <span className="text-xs tracking-[0.15em] uppercase px-2 py-1 rounded-sm" style={{ backgroundColor: "hsl(var(--nav-fg) / 0.12)", color: "hsl(var(--nav-fg) / 0.8)" }}>✓</span>
            )}
            <div className="flex items-center gap-3">
              {store.show_instagram && store.instagram && (
                <a href={instagramLink} target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
                  <Instagram className="w-4 h-4" strokeWidth={1} />
                </a>
              )}
              {store.show_tiktok && store.tiktok_handle && (
                <a href={tiktokLink} target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
                  <TikTokIcon className="w-4 h-4" />
                </a>
              )}
              {store.show_telegram && store.telegram_chat_id && (
                <a href={telegramLink} target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
                  <MessageCircle className="w-4 h-4" strokeWidth={1} />
                </a>
              )}
              {store.show_facebook && store.facebook && (
                <a href={facebookLink} target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
                  <Facebook className="w-4 h-4" strokeWidth={1} />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <div className="hidden sm:block"><LanguageToggle /></div>
            <div className="sm:hidden"><LanguageDropdown /></div>
            <ThemeToggle />
            <button onClick={() => !storePaused && cart.length > 0 && setShowCheckout(true)} disabled={storePaused} className="relative p-2 rounded-sm transition-opacity opacity-70 hover:opacity-100 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 text-xs font-medium rounded-full flex items-center justify-center min-w-[18px] h-[18px]"
                  style={{
                    backgroundColor: 'hsl(var(--highlight))',
                    color: 'hsl(var(--background))',
                  }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <StoreHero store={store} />

      {/* Products */}
      <section className="py-6 md:py-8">
        <div className="container">
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="font-mono text-[11px] tracking-[0.25em] uppercase text-muted-foreground mb-6">
            {STOREFRONT.COLLECTION}
          </motion.p>

          <div className="mb-6">
            <ActionBar
              sortConfig={sortConfig}
              onSortChange={handleSortChange}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>

          {categories.length > 0 && (
            <CategoryFilter
              categories={categories}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              labelAll={STOREFRONT.ALL}
            />
          )}
        </div>

        <ProductGridSection
          products={categoryFilteredProducts}
          productVariantsMap={productVariantsMap}
          activeCategory={activeCategory}
          onSelect={setSelectedProduct}
          onQuickAdd={addToCart}
          isPaused={storePaused}
          STOREFRONT={STOREFRONT}
        />
      </section>

      {/* Footer */}
      <StoreFooter storeName={store.name} STOREFRONT={STOREFRONT} onReportClick={() => setShowReport(true)} />

      {store && (
        <Suspense fallback={null}>
          <ReportStoreDrawer storeId={store.id} open={showReport} onClose={() => setShowReport(false)} />
        </Suspense>
      )}

      <AnimatePresence>
        {selectedProduct && (
          <Suspense fallback={
            <div className="fixed inset-0 bg-black/50 z-30 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-foreground" />
            </div>
          }>
            <ProductDetail
              product={selectedProduct}
              onClose={() => setSelectedProduct(null)}
              onAddToCart={addToCart}
              galleryImages={productImagesMap[selectedProduct.id] ?? []}
              variants={productVariantsMap[selectedProduct.id] ?? []}
              isPaused={storePaused}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheckout && cart.length > 0 && store && (
          <CheckoutSheet
            cart={cart}
            onClose={() => setShowCheckout(false)}
            onUpdateQuantity={updateQuantity}
            onRemove={removeFromCart}
            clearCart={clearCart}
            onOrderComplete={(orderId) => {
              setShowCheckout(false);
              navigate(`/success?store=${slug}&orderId=${orderId}`);
            }}
            storeId={store.id}
            storeName={store.name}
            taxEnabled={store.tax_enabled}
            taxPercent={store.tax_percent}
            paymentMethods={store.payment_methods}
            deliveryCarriers={store.delivery_carriers}
            paymentQrImage={store.payment_qr_image}
            paymentPhone={store.payment_phone}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoreFront;
