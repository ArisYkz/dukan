import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, X, Image as ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import ImageUpload from "@/components/ImageUpload";
import VariantManager, { type VariantItem } from "@/components/VariantManager";
import ConfirmModal from "@/components/dashboard/ConfirmModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetOverlay } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ProductRow, ProductFormState } from "@/types/store";
import { FREE_PRODUCT_LIMIT, FREE_IMAGE_LIMIT, PRO_IMAGE_LIMIT, FREE_CATEGORY_LIMIT } from "@/lib/format";
import { useLabels } from "@/hooks/useLabels";
import {
  createProduct,
  updateProduct,
  replaceProductImages,
  insertProductImages,
  fetchProductVariants,
  replaceProductVariants,
  deleteProduct,
} from "@/services/productService";
import { saveCategories, deleteCategory } from "@/services/categoryService";

interface ProductEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProduct: ProductRow | null;
  storeId: string;
  userId: string;
  isPro: boolean;
  categories: string[];
  productCount?: number; // current number of products (for free plan limit)
  onCategoryAdded: (category: string) => void;
  onCategoryDeleted: (category: string) => void;
  onShowUpgrade: () => void;
  onSave: () => void;
  productImages?: Record<string, string[]>; // optional mapping of product id to image URLs
}

const ProductEditModal = ({
  open,
  onOpenChange,
  editingProduct,
  storeId,
  userId,
  isPro,
  categories,
  productCount = 0,
  onCategoryAdded,
  onCategoryDeleted,
  onShowUpgrade,
  onSave,
  productImages = {},
}: ProductEditModalProps) => {
  const { ACTIONS, MESSAGES, PRODUCT, PRODUCTS_TAB, ERRORS, CONFIRM } = useLabels();
  const [productForm, setProductForm] = useState<ProductFormState>({
    name: "",
    price: "",
    description: "",
    stock: "",
    image_url: "",
    category: "",
    categoryInput: "",
    barcode_gtin: "",
    ntin: "",
    country_of_origin: "",
    low_stock_threshold: "3",
  });
  const [tempProductImages, setTempProductImages] = useState<string[]>([]);
  const [tempVariants, setTempVariants] = useState<VariantItem[]>([]);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [categoryInlineOpen, setCategoryInlineOpen] = useState(false);
  const [categoryInput, setCategoryInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAdvancedInfo, setShowAdvancedInfo] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleImageDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleImageDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIdx = parseInt(e.dataTransfer.getData("text/plain"));
    if (isNaN(dragIdx) || dragIdx === dropIndex) {
      setDragIndex(null);
      return;
    }
    setTempProductImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  };

  const handleImageDragEnd = () => {
    setDragIndex(null);
  };

  const imageLimit = isPro ? PRO_IMAGE_LIMIT : FREE_IMAGE_LIMIT;

  // Reset form when editingProduct changes
  useEffect(() => {
    if (editingProduct) {
      const imgs = productImages[editingProduct.id] || [];
      setProductForm({
        name: editingProduct.name,
        price: editingProduct.price.toString(),
        description: editingProduct.description || "",
        stock: editingProduct.stock.toString(),
        image_url: editingProduct.image_url || "",
        category: editingProduct.category || "",
        categoryInput: "",
        barcode_gtin: editingProduct.barcode_gtin || "",
        ntin: editingProduct.ntin || "",
        country_of_origin: editingProduct.country_of_origin || "",
        low_stock_threshold: editingProduct.low_stock_threshold?.toString() || "3",
      });
      // Auto-expand advanced info if any fields are filled
      setShowAdvancedInfo(!!(editingProduct.barcode_gtin || editingProduct.ntin || editingProduct.country_of_origin));
      // Ensure main image is included
      const mainImage = editingProduct.image_url;
      const allImages = mainImage && !imgs.includes(mainImage) ? [mainImage, ...imgs] : imgs;
      setTempProductImages(allImages);
      // Fetch variants
      fetchProductVariants(editingProduct.id)
        .then((vars) => {
          setTempVariants(vars.map((v) => ({
            variant_type: v.variant_type,
            variant_value: v.variant_value,
            price_adjustment: v.price_adjustment,
          })));
        })
        .catch((error) => {
          console.error("Failed to fetch product variants:", error);
          setTempVariants([]);
        });
    } else {
      // New product
      setProductForm({
        name: "",
        price: "",
        description: "",
        stock: "",
        image_url: "",
        category: "",
        categoryInput: "",
        barcode_gtin: "",
        ntin: "",
        country_of_origin: "",
        low_stock_threshold: "3",
      });
      setTempProductImages([]);
      setTempVariants([]);
      setShowAdvancedInfo(false);
    }
  }, [editingProduct, productImages]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Free plan product limit check
    if (!editingProduct && !isPro && productCount >= FREE_PRODUCT_LIMIT) {
      onShowUpgrade();
      return;
    }
    // Category limit check
    const finalCategory = productForm.category?.trim() || "";
    if (!isPro && finalCategory && !categories.includes(finalCategory) && categories.length >= FREE_CATEGORY_LIMIT) {
      toast.error(PRODUCTS_TAB.PRO_ONLY_CATEGORIES);
      return;
    }

    const mainImage = tempProductImages[0] || productForm.image_url || null;
    const productData = {
      store_id: storeId,
      name: productForm.name,
      price: parseInt(productForm.price) || 0,
      description: productForm.description || null,
      stock: parseInt(productForm.stock) || 0,
      image_url: mainImage,
      category: finalCategory || null,
      barcode_gtin: productForm.barcode_gtin || null,
      ntin: productForm.ntin || null,
      country_of_origin: productForm.country_of_origin || null,
      low_stock_threshold: parseInt(productForm.low_stock_threshold) || 3,
    };

    setLoading(true);
    try {
      let productId: string;
      if (editingProduct) {
        const { error } = await updateProduct(editingProduct.id, productData);
        if (error) {
          toast.error(ERRORS?.SAVE_FAILED || ERRORS?.GENERIC_ERROR || error.message);
          setLoading(false);
          return;
        }
        productId = editingProduct.id;
        toast.success(MESSAGES.PRODUCT_UPDATED);
      } else {
        const { id, error } = await createProduct(productData);
        if (error || !id) {
          toast.error(ERRORS?.SAVE_FAILED || ERRORS?.GENERIC_ERROR || "Error");
          setLoading(false);
          return;
        }
        productId = id;
        toast.success(MESSAGES.PRODUCT_ADDED);
      }

      // Save product images
      if (tempProductImages.length > 0) {
        if (editingProduct) {
          await replaceProductImages(productId, tempProductImages);
        } else {
          await insertProductImages(productId, tempProductImages);
        }
      }

      // Save variants
      await replaceProductVariants(
        productId,
        tempVariants.map((v) => ({
          variant_type: v.variant_type,
          variant_value: v.variant_value,
          price_adjustment: v.price_adjustment || 0,
        })),
      );

      setLoading(false);
      onOpenChange(false);
      onSave();
    } catch (error) {
      setLoading(false);
      toast.error(ERRORS?.GENERIC_ERROR || "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!editingProduct) return;
    setDeleting(true);
    try {
      const { error } = await deleteProduct(editingProduct.id);
      if (error) {
        toast.error(ERRORS?.DELETE_FAILED || ERRORS?.GENERIC_ERROR || "Failed to delete product");
        setDeleting(false);
        return;
      }
      toast.success(MESSAGES.PRODUCT_DELETED);
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onSave();
    } catch (error) {
      toast.error(ERRORS?.GENERIC_ERROR || "Something went wrong");
      setDeleting(false);
    }
  };

  const handleAddCategory = async () => {
    const trimmed = categoryInput.trim();
    if (!trimmed) return;
    if (!isPro && !categories.includes(trimmed) && categories.length >= FREE_CATEGORY_LIMIT) {
      toast.error(PRODUCTS_TAB.PRO_ONLY_CATEGORIES);
      return;
    }
    const { categories: refreshed, error } = await saveCategories(storeId, [trimmed]);
    if (error) {
      toast.error("Could not save category.");
      return;
    }
    onCategoryAdded(trimmed);
    setProductForm((prev) => ({ ...prev, category: trimmed }));
    setCategoryInput("");
    setCategoryInlineOpen(false);
    setCategoryMenuOpen(false);
  };

  const handleDeleteCategory = async (cat: string) => {
    const { error } = await deleteCategory(storeId, cat);
    if (error) {
      toast.error("Could not delete category.");
      return;
    }
    onCategoryDeleted(cat);
    if (productForm.category === cat) {
      setProductForm((prev) => ({ ...prev, category: "" }));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md lg:max-w-lg border-[hsl(var(--border)/0.3)] bg-[hsl(var(--background)/0.95)] backdrop-blur shadow-2xl max-h-screen overflow-hidden flex flex-col"
      >
        <SheetHeader>
          <SheetTitle className="text-[16px] font-semibold tracking-[0.2em] uppercase text-foreground opacity-90">
            {editingProduct ? PRODUCTS_TAB.EDIT_PRODUCT : PRODUCTS_TAB.ADD_PRODUCT}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {editingProduct ? PRODUCTS_TAB.EDIT_DESCRIPTION : PRODUCTS_TAB.ADD_DESCRIPTION}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 overflow-auto py-6 pr-4">
          <form onSubmit={handleSave} className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">
                {PRODUCTS_TAB.NAME}
              </label>
              <input
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="w-full border border-[hsl(var(--border)/0.3)] border-[1.5px] bg-[hsl(var(--card))] px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            {/* Price and Stock in two columns */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">
                  {PRODUCTS_TAB.PRICE}
                </label>
                <input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  className="w-full border border-[hsl(var(--border)/0.3)] border-[1.5px] bg-[hsl(var(--card))] px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">
                  {PRODUCTS_TAB.STOCK}
                </label>
                <input
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  className="w-full border border-[hsl(var(--border)/0.3)] border-[1.5px] bg-[hsl(var(--card))] px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  min="0"
                />
                <label className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground/70 mt-1.5 mb-1 block">
                  {PRODUCTS_TAB.ALERT_THRESHOLD || "Alert Threshold"}
                </label>
                <input
                  type="number"
                  value={productForm.low_stock_threshold}
                  onChange={(e) => setProductForm({ ...productForm, low_stock_threshold: e.target.value })}
                  className="w-full border border-[hsl(var(--border)/0.3)] border-[1.5px] bg-[hsl(var(--card))] px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  min="1"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">
                {PRODUCTS_TAB.DESCRIPTION}
              </label>
              <textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                className="w-full border border-[hsl(var(--border)/0.3)] border-[1.5px] bg-[hsl(var(--card))] px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={2}
              />
            </div>

            {/* Optional Advanced Business Information */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvancedInfo((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 hover:text-foreground transition-colors"
              >
                <span>{PRODUCTS_TAB.ADVANCED_INFO || "Optional Advanced Business Information"}</span>
                {showAdvancedInfo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showAdvancedInfo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3 pt-2"
                >
                  <div>
                    <label className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground/70 mb-1 block">
                      {PRODUCTS_TAB.BARCODE_GTIN || "Barcode / GTIN"}
                    </label>
                    <input
                      value={productForm.barcode_gtin}
                      onChange={(e) => setProductForm({ ...productForm, barcode_gtin: e.target.value })}
                      className="w-full border border-[hsl(var(--border)/0.3)] border-[1.5px] bg-[hsl(var(--card))] px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground/70 mb-1 block">
                      {PRODUCTS_TAB.NTIN || "NTIN"}
                    </label>
                    <input
                      value={productForm.ntin}
                      onChange={(e) => setProductForm({ ...productForm, ntin: e.target.value })}
                      className="w-full border border-[hsl(var(--border)/0.3)] border-[1.5px] bg-[hsl(var(--card))] px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground/70 mb-1 block">
                      {PRODUCTS_TAB.COUNTRY_OF_ORIGIN || "Country of Origin"}
                    </label>
                    <input
                      value={productForm.country_of_origin}
                      onChange={(e) => setProductForm({ ...productForm, country_of_origin: e.target.value })}
                      className="w-full border border-[hsl(var(--border)/0.3)] border-[1.5px] bg-[hsl(var(--card))] px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">
                {PRODUCTS_TAB.CATEGORY}
              </label>
              <Select
                open={categoryMenuOpen}
                onOpenChange={(open) => {
                  setCategoryMenuOpen(open);
                  if (!open) setCategoryInlineOpen(false);
                }}
                value={productForm.category}
                onValueChange={(value) => {
                  if (value === "none") {
                    setProductForm({ ...productForm, category: "" });
                    return;
                  }
                  setProductForm({ ...productForm, category: value });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={PRODUCTS_TAB.SELECT_CATEGORY} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{PRODUCTS_TAB.NONE}</SelectItem>
                  {categories.filter((cat) => cat && cat.trim()).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      <span className="flex items-center justify-between w-full">
                        <span>{cat}</span>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteCategory(cat);
                          }}
                          className="ml-2 p-0.5 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                          aria-label={`Delete category ${cat}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    </SelectItem>
                  ))}
                  <div className="border-t border-[hsl(var(--border)/0.15)] px-3 py-2">
                    {categoryInlineOpen ? (
                      <div className="flex gap-2">
                        <input
                          value={categoryInput}
                          onChange={(e) => setCategoryInput(e.target.value)}
                          className="w-full border border-[hsl(var(--border)/0.3)] bg-[hsl(var(--card))] px-2 py-1 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder={PRODUCTS_TAB.ENTER_NEW_CATEGORY}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={handleAddCategory}
                          className="inline-flex items-center justify-center rounded-sm border border-[hsl(var(--border)/0.3)] bg-[hsl(var(--card))] px-3 py-1 text-sm hover:border-[hsl(var(--highlight))] transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setCategoryInlineOpen(true)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-[hsl(var(--border)/0.3)] bg-[hsl(var(--card))] px-3 py-2 text-sm text-foreground hover:border-[hsl(var(--highlight))] transition-colors"
                      >
                        <Plus className="w-4 h-4" /> {PRODUCTS_TAB.NEW_CATEGORY}
                      </button>
                    )}
                  </div>
                </SelectContent>
              </Select>
              {!isPro && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {categories.length}/{FREE_CATEGORY_LIMIT} categories used (Free plan)
                </p>
              )}
            </div>

            {/* Product images */}
            <div>
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">
                <ImageIcon className="w-3.5 h-3.5 inline mr-1" />
                {PRODUCT.PRODUCT_IMAGES}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                {tempProductImages.map((url, i) => (
                  <div
                    key={`${url}-${i}`}
                    draggable
                    onDragStart={(e) => handleImageDragStart(e, i)}
                    onDragOver={handleImageDragOver}
                    onDrop={(e) => handleImageDrop(e, i)}
                    onDragEnd={handleImageDragEnd}
                    className={`relative group aspect-square cursor-grab active:cursor-grabbing transition-opacity ${dragIndex === i ? 'opacity-40' : ''}`}
                    onClick={() => { if (dragIndex === null) setLightboxImage(url); }}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover rounded-sm pointer-events-none" />
                    {i === 0 && (
                      <span className="absolute top-1 left-1 text-[9px] tracking-wider uppercase bg-accent text-accent-foreground px-1.5 py-0.5 rounded-sm">
                        {PRODUCT.MAIN_IMAGE}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setTempProductImages((prev) => prev.filter((_, idx) => idx !== i)); }}
                      className="absolute top-1 right-1 p-1 bg-background/80 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {tempProductImages.length < imageLimit && (
                  <ImageUpload
                    bucket="product-images"
                    folder={userId}
                    onUpload={(url) => setTempProductImages((prev) => [...prev, url])}
                    label={PRODUCTS_TAB.ADD_IMAGE}
                    className="aspect-square flex items-center justify-center border-2 border-dashed border-[hsl(var(--border)/0.3)] hover:border-[hsl(var(--highlight))] transition-colors"
                    previewClass="hidden"
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {PRODUCT.FIRST_IMAGE_IS_MAIN} · {tempProductImages.length}/{imageLimit} images
                {!isPro && <span className="text-muted-foreground/60"> (Pro: up to {PRO_IMAGE_LIMIT})</span>}
              </p>
            </div>

            {/* Variants */}
            <VariantManager variants={tempVariants} onChange={setTempVariants} isPro={isPro} />

            {/* Buttons */}
            <div className="flex justify-between items-center pt-4">
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-primary-foreground px-6 py-2.5 text-sm rounded-sm hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? "Saving..." : editingProduct ? ACTIONS.UPDATE : ACTIONS.SAVE}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="px-6 py-2.5 text-sm border border-border rounded-sm hover:bg-muted transition-colors"
                >
                  {ACTIONS.CANCEL}
                </button>
              </div>
              {editingProduct && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm border border-destructive/30 text-destructive hover:bg-destructive/5 rounded-sm transition-colors disabled:opacity-50"
                  aria-label={ACTIONS.DELETE}
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? "Deleting..." : ACTIONS.DELETE}
                </button>
              )}
            </div>
          </form>
        </ScrollArea>
      </SheetContent>
      {showDeleteConfirm && (
        <ConfirmModal
          title={CONFIRM.DELETE_PRODUCT_TITLE}
          message={CONFIRM.DELETE_PRODUCT_MSG}
          confirmLabel={ACTIONS.DELETE}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          variant="danger"
        />
      )}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage}
            alt=""
            className="max-w-[95vw] max-h-[95vh] object-contain"
          />
        </div>
      )}
    </Sheet>
  );
};

export default ProductEditModal;