import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, Image as ImageIcon, Lock } from "lucide-react";
import { toast } from "sonner";
import ProductEditModal from "@/components/dashboard/ProductEditModal";
import CategoryFilter from "@/components/dashboard/CategoryFilter";
import ProductGridView from "@/components/dashboard/ProductGridView";
import ProductListView from "@/components/dashboard/ProductListView";
import BulkActionsBar from "@/components/dashboard/BulkActionsBar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Pagination } from "@/components/ui/pagination";
import type { ProductRow, ProductImageRow, ProductFormState } from "@/types/store";
import { formatPrice, FREE_PRODUCT_LIMIT, FREE_IMAGE_LIMIT, PRO_IMAGE_LIMIT, FREE_CATEGORY_LIMIT } from "@/lib/format";
import { normalizeText } from "@/lib/normalize";
import { useLabels } from "@/hooks/useLabels";
import CsvImport from "@/components/dashboard/CsvImport";
import BulkUploadComponent from "@/components/dashboard/BulkUploadComponent";
import ActionBar from "@/components/ActionBar";
import {
  createProduct,
  updateProduct,
  replaceProductImages,
  insertProductImages,
  fetchProductVariants,
  replaceProductVariants,
  bulkUpdateCategory as bulkUpdateCategoryService,
  bulkUpdatePrice as bulkUpdatePriceService,
  bulkUpdateStock as bulkUpdateStockService,
  bulkDeleteProducts as bulkDeleteService,
} from "@/services/productService";
import { saveCategories } from "@/services/categoryService";
import { useDashboardActions } from "@/hooks/useDashboardActions";

interface ProductsTabProps {
  products: ProductRow[];
  productImages: Record<string, ProductImageRow[]>;
  storeId: string;
  userId: string;
  isPro: boolean;
  isPaused?: boolean;
  isVerificationBlocked?: boolean;
  verificationStatus?: string | null;
  onShowUpgrade: () => void;
  onReload: () => void;
  onDeleteConfirm: (id: string) => void;
}

const ProductsTab = ({
  products, productImages, storeId, userId, isPro, isPaused, isVerificationBlocked, verificationStatus, onShowUpgrade, onReload, onDeleteConfirm,
}: ProductsTabProps) => {
  const { ACTIONS, MESSAGES, PRODUCT, PRODUCTS_TAB, ERRORS, VERIFICATION, STOREFRONT } = useLabels();
  const [showProductForm, setShowProductForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<'default' | 'price-asc' | 'price-desc' | 'date-asc' | 'date-desc'>('default');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [optimisticallyDeletedIds, setOptimisticallyDeletedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, activeCategory, sortMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const imageLimit = isPro ? PRO_IMAGE_LIMIT : FREE_IMAGE_LIMIT;

  // Memoized inline save handler to prevent ProductListRow re-renders
  const handleInlineSave = useCallback(async (product: ProductRow, updatedFields: Partial<ProductRow>) => {
    const data = {
      store_id: product.store_id,
      name: updatedFields.name ?? product.name,
      price: updatedFields.price ?? product.price,
      description: updatedFields.description ?? product.description,
      stock: updatedFields.stock ?? product.stock,
      image_url: updatedFields.image_url ?? product.image_url,
      category: updatedFields.category ?? product.category,
    };
    await updateProduct(product.id, data);
    onReload();
  }, [onReload]);

  const existingCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((product) => { if (product.category && product.category.trim()) cats.add(product.category.trim()); });
    return Array.from(cats).sort();
  }, [products]);

  const searchedProducts = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return products;
    const term = normalizeText(debouncedSearchTerm);
    return products.filter(p =>
      normalizeText(p.name).includes(term) ||
      (p.description && normalizeText(p.description).includes(term))
    );
  }, [products, debouncedSearchTerm]);

  const sortedProducts = useMemo(() => {
    // No pinned/unpinned partition
    const toSort = [...searchedProducts];

    if (sortMode === 'price-asc') {
      // Sort by price ascending
      toSort.sort((a, b) => a.price - b.price);
    } else if (sortMode === 'price-desc') {
      // Sort by price descending
      toSort.sort((a, b) => b.price - a.price);
    } else if (sortMode === 'date-asc') {
      // Sort by created_at ascending (oldest first)
      toSort.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortMode === 'date-desc') {
      // Sort by created_at descending (newest first)
      toSort.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      // Default: sort by sort_order (ascending), then by newest first
      toSort.sort((a, b) => {
        const orderA = a.sort_order ?? 999;
        const orderB = b.sort_order ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    return toSort;
  }, [searchedProducts, sortMode]);

  // Category filtering
  const categoryFilteredProducts = useMemo(() => {
    let filtered = activeCategory === 'all' ? sortedProducts : sortedProducts.filter(p => p.category === activeCategory);
    
    // Filter out optimistically deleted products for instant UI feedback
    if (optimisticallyDeletedIds.size > 0) {
      filtered = filtered.filter(p => !optimisticallyDeletedIds.has(p.id));
    }
    
    return filtered;
  }, [sortedProducts, activeCategory, optimisticallyDeletedIds]);

  const ITEMS_PER_PAGE = 20;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return categoryFilteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [categoryFilteredProducts, currentPage]);

  // Bulk operations hook
  const { bulkUpdateCategory, bulkUpdatePrice, bulkUpdateStock, bulkDeleteProducts } = useDashboardActions({
    isPro,
    orders: [],
    totalConfirmed: 0,
    updateOrderOptimistic: () => {},
    rollbackOrder: () => {},
    reload: onReload,
    MESSAGES,
    ERRORS,
    products: categoryFilteredProducts,
    categories,
    updateProductOptimistic: (productId: string, updates: any) => {
      // Handle optimistic deletion
      if (updates._markedForDeletion === true) {
        setOptimisticallyDeletedIds(prev => new Set(prev).add(productId));
      } else if (updates._markedForDeletion === false) {
        // Rollback - remove from deleted set
        setOptimisticallyDeletedIds(prev => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
  });

  useEffect(() => {
    setCategories([...existingCategories].sort());
  }, [existingCategories]);

  const handleAddProduct = () => {
    if (!isPro && products.length >= FREE_PRODUCT_LIMIT) { onShowUpgrade(); return; }
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const handleEditProduct = async (product: ProductRow) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  // Selection handlers
  const toggleSelect = useCallback((productId: string) => {
    setSelectedIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.length === categoryFilteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(categoryFilteredProducts.map(p => p.id));
    }
  }, [categoryFilteredProducts, selectedIds.length]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleBulkMoveToCategory = useCallback(async (categoryId: string | null) => {
    setIsActionLoading(true);
    try {
      const success = await bulkUpdateCategory(selectedIds, categoryId, bulkUpdateCategoryService);
      if (success) {
        setSelectedIds([]);
        onReload();
      }
    } finally {
      setIsActionLoading(false);
    }
  }, [selectedIds, bulkUpdateCategory, onReload]);

  const handleBulkDelete = useCallback(async () => {
    setIsActionLoading(true);
    try {
      const success = await bulkDeleteProducts(selectedIds, bulkDeleteService);
      if (success) {
        // Clear optimistically deleted IDs since reload will fetch fresh data
        setOptimisticallyDeletedIds(new Set());
        setSelectedIds([]);
        onReload();
      }
    } finally {
      setIsActionLoading(false);
    }
  }, [selectedIds, bulkDeleteProducts, onReload]);

  const handleBulkUpdatePrice = useCallback(async (newPrice: number) => {
    setIsActionLoading(true);
    try {
      const success = await bulkUpdatePrice(selectedIds, newPrice, bulkUpdatePriceService);
      if (success) {
        setSelectedIds([]);
        onReload();
      }
    } finally {
      setIsActionLoading(false);
    }
  }, [selectedIds, bulkUpdatePrice, onReload]);

  const handleBulkUpdateStock = useCallback(async (newStock: number) => {
    setIsActionLoading(true);
    try {
      const success = await bulkUpdateStock(selectedIds, newStock, bulkUpdateStockService);
      if (success) {
        setSelectedIds([]);
        onReload();
      }
    } finally {
      setIsActionLoading(false);
    }
  }, [selectedIds, bulkUpdateStock, onReload]);


  // Map sortMode to ActionBar's sortConfig
  const sortConfig = useMemo(() => {
    if (sortMode === 'default') return { type: 'default' as const };
    if (sortMode.startsWith('price')) return { type: 'price' as const, direction: sortMode.includes('asc') ? 'asc' as const : 'desc' as const };
    if (sortMode.startsWith('date')) return { type: 'date' as const, direction: sortMode.includes('asc') ? 'asc' as const : 'desc' as const };
    return { type: 'default' as const };
  }, [sortMode]);

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
    <div>
      {isVerificationBlocked && (
        <div className="mb-4 md:mb-6 border border-yellow-500/30 bg-yellow-500/5 rounded-sm p-3 md:p-4">
          <p className="font-mono text-[10px] md:text-xs text-yellow-600 dark:text-yellow-400 leading-relaxed">
            {verificationStatus === "mismatch"
              ? VERIFICATION.PRODUCTS_BLOCKED_MISMATCH
              : VERIFICATION.PRODUCTS_BLOCKED_SUSPENDED}
          </p>
          <p className="font-mono text-[9px] md:text-[10px] text-muted-foreground mt-1 md:mt-2">
            {VERIFICATION.GO_TO_VERIFICATION}
          </p>
        </div>
      )}
      <div className="flex flex-row flex-wrap items-center justify-between mb-3 md:mb-6 gap-2 md:gap-3">
        <div>
          <h2 className="text-xs md:text-xl font-semibold tracking-[0.2em] uppercase text-foreground opacity-90">{PRODUCTS_TAB.TITLE}</h2>
          {!isPro && (
            <p className="font-mono text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">
              {products.length}/{FREE_PRODUCT_LIMIT} {PRODUCTS_TAB.USED_COUNT}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 relative flex-wrap">
          <CsvImport storeId={storeId} isPro={isPro} onShowUpgrade={onShowUpgrade} onReload={onReload} />
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowActionMenu((prev) => !prev)}
              disabled={!!isPaused || !!isVerificationBlocked}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-sm hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> {ACTIONS.ADD}
            </button>
            {showActionMenu && (
              <div className="absolute right-0 mt-2 w-44 rounded-sm border border-[hsl(var(--border)/0.3)] bg-[hsl(var(--card))] shadow-lg z-20">
                <button
                  type="button"
                  onClick={() => {
                    setShowActionMenu(false);
                    setShowBulkUpload(false);
                    handleAddProduct();
                  }}
                  className="w-full text-left px-4 py-2 text-xs uppercase tracking-[0.2em] text-foreground hover:bg-[hsl(var(--surface-warm))]"
                >
                  Single Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowActionMenu(false);
                    setShowProductForm(false);
                    setShowBulkUpload(true);
                  }}
                  className="w-full text-left px-4 py-2 text-xs uppercase tracking-[0.2em] text-foreground hover:bg-[hsl(var(--surface-warm))]"
                >
                  Bulk Upload
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product edit modal */}
      <ProductEditModal
        open={showProductForm && !showBulkUpload}
        onOpenChange={(open) => {
          if (!open) {
            setShowProductForm(false);
            setEditingProduct(null);
          }
        }}
        editingProduct={editingProduct}
        storeId={storeId}
        userId={userId}
        isPro={isPro}
        categories={categories}
        productCount={products.length}
        onCategoryAdded={(category) => setCategories((prev) => Array.from(new Set([...prev, category])).sort())}
        onCategoryDeleted={(category) => setCategories((prev) => prev.filter((c) => c !== category))}
        onShowUpgrade={onShowUpgrade}
        onSave={onReload}
        productImages={Object.fromEntries(
          Object.entries(productImages).map(([id, images]) => [id, images.map((img) => img.image_url)])
        )}
      />

      {showBulkUpload && (
        <BulkUploadComponent
          storeId={storeId}
          userId={userId}
          existingCategories={categories}
          isPro={isPro}
          onCategoryAdded={(category) => setCategories((prev) => Array.from(new Set([...prev, category])).sort())}
          onCancel={() => setShowBulkUpload(false)}
          onComplete={() => { setShowBulkUpload(false); setShowProductForm(false); onReload(); }}
          onShowUpgrade={onShowUpgrade}
        />
      )}

      {/* Sorting and search row */}
      <ActionBar
        sortConfig={sortConfig}
        onSortChange={handleSortChange}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Category filter */}
      {categories.length > 0 && (
        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          labelAll={PRODUCTS_TAB.CATEGORY_ALL}
        />
      )}

      {/* Product display (grid or list) */}
      {categoryFilteredProducts.length === 0 ? (
        <p className="text-muted-foreground text-center py-8 md:py-12">{STOREFRONT.NO_PRODUCTS}</p>
      ) : (
        <>
          {/* Grid View */}
          {viewMode === 'grid' && (
            <ProductGridView
              products={paginatedProducts}
              productImages={productImages}
              onEdit={handleEditProduct}
              onDelete={onDeleteConfirm}
            />
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <ProductListView
              products={paginatedProducts}
              productImages={productImages}
              selectedIds={selectedIds}
              onSelect={toggleSelect}
              onSelectAll={selectAll}
              onEdit={handleEditProduct}
              onDelete={onDeleteConfirm}
              itemsSelectedLabel={PRODUCTS_TAB.ITEMS_SELECTED?.toLowerCase()}
              selectAllLabel={PRODUCTS_TAB.SELECT_ALL}
              columnLabels={{
                image: PRODUCTS_TAB.IMAGE,
                name: PRODUCTS_TAB.NAME,
                price: PRODUCTS_TAB.PRICE,
                category: PRODUCTS_TAB.CATEGORY,
                actions: PRODUCTS_TAB.ACTIONS,
              }}
            />
          )}

          {categoryFilteredProducts.length > ITEMS_PER_PAGE && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                totalItems={categoryFilteredProducts.length}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </div>
          )}
        </>
      )}

      {/* Bulk Actions Bar (List View Only) */}
      <AnimatePresence>
        {viewMode === 'list' && selectedIds.length > 0 && (
          <BulkActionsBar
            selectedCount={selectedIds.length}
            totalCount={categoryFilteredProducts.length}
            categories={categories}
            onClear={clearSelection}
            onSelectAll={() => setSelectedIds(categoryFilteredProducts.map(p => p.id))}
            onMoveToCategory={handleBulkMoveToCategory}
            onUpdatePrice={handleBulkUpdatePrice}
            onUpdateStock={handleBulkUpdateStock}
            onDelete={handleBulkDelete}
            isLoading={isActionLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductsTab;
