import { useState, useRef, useCallback, useEffect, DragEvent, ChangeEvent } from "react";
import { UploadCloud, Loader2, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { optimizeImage } from "@/lib/imageOptimizer";
import { createProductsBulkWithImages } from "@/services/productService";
import { saveCategories } from "@/services/categoryService";
import { FREE_CATEGORY_LIMIT } from "@/lib/format";
import { useLabels } from "@/hooks/useLabels";

interface BulkDraftProduct {
  id: string;
  file: File;
  thumbnail: string;
  imageUrl?: string;
  images: string[];
  name: string;
  description: string;
  price: string;
  stock: string;
  category: string;
  is_active: boolean;
  uploading: boolean;
  error?: string;
}

interface BulkUploadComponentProps {
  storeId: string;
  userId: string;
  existingCategories: string[];
  isPro: boolean;
  onCategoryAdded?: (category: string) => void;
  onCancel: () => void;
  onComplete: () => void;
  onShowUpgrade: () => void;
}

const normalizeName = (fileName: string) => {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  return baseName
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/(^|\s)([a-z])/g, (_, prefix, char) => `${prefix}${char.toUpperCase()}`);
};

const getSafeId = () => typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
  ? crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const uploadBulkImage = async (file: File, folder: string) => {
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Image must be smaller than 15MB");
  }

  const { blob, fileName } = await optimizeImage(file);
  const uniqueName = `${folder}/${getSafeId()}-${fileName}`;
  const { error: uploadError } = await supabase.storage.from("product-images").upload(uniqueName, blob, {
    upsert: true,
    contentType: "image/webp",
  });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("product-images").getPublicUrl(uniqueName);
  return data.publicUrl;
};

const BulkUploadComponent = ({ storeId, userId, existingCategories, isPro, onCategoryAdded, onCancel, onComplete, onShowUpgrade }: BulkUploadComponentProps) => {
  const [draftProducts, setDraftProducts] = useState<BulkDraftProduct[]>([]);
  const { BULK_UPLOAD, ACTIONS, PRODUCTS_TAB } = useLabels();
  const [categories, setCategories] = useState<string[]>(existingCategories);
  const [globalPrice, setGlobalPrice] = useState("");
  const [globalStock, setGlobalStock] = useState("");
  const [globalCategory, setGlobalCategory] = useState(existingCategories[0] || "");
  const [submitting, setSubmitting] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState<Set<string>>(new Set());
  const [expandedCat, setExpandedCat] = useState<Set<string>>(new Set());
  const [duplicateWarning, setDuplicateWarning] = useState<string[] | null>(null);
  const [publishSummary, setPublishSummary] = useState<{ succeeded: number; total: number; errors: { name: string; msg: string }[] } | null>(null);
  const additionalDraftIndexRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const extraFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCategories((prev) => Array.from(new Set([...prev, ...existingCategories])).sort());
    if (!globalCategory && existingCategories[0]) {
      setGlobalCategory(existingCategories[0]);
    }
  }, [existingCategories, globalCategory]);

  useEffect(() => {
    if (publishSummary) {
      const timer = setTimeout(() => setPublishSummary(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [publishSummary]);

  const createDrafts = useCallback((files: File[]) => {
    return files.map((file) => ({
      id: getSafeId(),
      file,
      thumbnail: URL.createObjectURL(file),
      name: normalizeName(file.name),
      description: "",
      price: "",
      stock: "1",
      category: categories[0] || "",
      is_active: true,
      uploading: true,
      images: [],
    }));
  }, [categories]);

  const handleAddImagesToDraft = async (index: number, files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setDraftProducts((prev) => prev.map((item, idx) => idx === index ? { ...item, uploading: true, error: undefined } : item));

    await Promise.all(fileArray.map(async (file) => {
      try {
        const url = await uploadBulkImage(file, userId);
        setDraftProducts((prev) => prev.map((item, idx) => idx === index ? {
          ...item,
          imageUrl: item.imageUrl || url,
          images: [...item.images, url],
          uploading: false,
        } : item));
      } catch (error: any) {
        setDraftProducts((prev) => prev.map((item, idx) => idx === index ? { ...item, uploading: false, error: error?.message || "Upload failed" } : item));
      }
    }));
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    if (!isPro && fileArray.length > 10) {
      toast.error(BULK_UPLOAD.LIMIT_WARNING);
      return;
    }

    const newDrafts = createDrafts(fileArray);
    setDraftProducts((prev) => [...prev, ...newDrafts]);

    await Promise.all(newDrafts.map(async (draft) => {
      try {
        const url = await uploadBulkImage(draft.file, userId);
        setDraftProducts((prev) => prev.map((item) => item.id === draft.id ? {
          ...item,
          imageUrl: url,
          images: [url],
          uploading: false,
        } : item));
      } catch (error: any) {
        setDraftProducts((prev) => prev.map((item) => item.id === draft.id ? { ...item, uploading: false, error: error?.message || "Upload failed" } : item));
      }
    }));
  };

  const handleAdditionalFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const draftIndex = additionalDraftIndexRef.current;
    if (draftIndex === null || draftIndex === undefined || !event.target.files?.length) {
      additionalDraftIndexRef.current = null;
      event.target.value = "";
      return;
    }
    await handleAddImagesToDraft(draftIndex, event.target.files);
    additionalDraftIndexRef.current = null;
    event.target.value = "";
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    await handleFiles(files);
  };

  const applyBulkPrice = () => {
    setDraftProducts((prev) => prev.map((item) => ({ ...item, price: globalPrice })));
  };

  const applyBulkStock = () => {
    setDraftProducts((prev) => prev.map((item) => ({ ...item, stock: globalStock })));
  };

  const applyBulkCategory = async () => {
    const trimmed = globalCategory.trim();
    if (!trimmed) return;
    if (!categories.includes(trimmed)) {
      if (!isPro && categories.length >= FREE_CATEGORY_LIMIT) {
        toast.error(`Free plan allows only ${FREE_CATEGORY_LIMIT} categories.`);
        return;
      }
      const { categories: refreshed, error } = await saveCategories(storeId, [trimmed]);
      if (error) {
        toast.error("Could not add category.");
        return;
      }
      setCategories(refreshed);
      onCategoryAdded?.(trimmed);
    }
    setDraftProducts((prev) => prev.map((item) => ({ ...item, category: trimmed })));
  };

  const updateDraft = (id: string, patch: Partial<BulkDraftProduct>) => {
    setDraftProducts((prev) => prev.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const detectDuplicates = (): string[] => {
    const names = draftProducts.map((item) => item.name.trim().toLowerCase()).filter(Boolean);
    const seen = new Map<string, number[]>();
    names.forEach((name, idx) => {
      if (!seen.has(name)) seen.set(name, []);
      seen.get(name)!.push(idx);
    });
    const duplicates: string[] = [];
    seen.forEach((indices, name) => {
      if (indices.length > 1) {
        duplicates.push(`"${draftProducts[indices[0]].name}" (${indices.length}x)`);
      }
    });
    return duplicates;
  };

  const handlePublish = async () => {
    if (draftProducts.length === 0) {
      toast.error(BULK_UPLOAD.NO_IMAGES);
      return;
    }

    const invalid = draftProducts.find((item) => !item.name.trim() || !item.price.trim() || Number(item.price) < 0 || Number(item.stock) < 0 || !item.imageUrl);
    if (invalid) {
      toast.error(BULK_UPLOAD.FIX_ERRORS);
      return;
    }

    const duplicates = detectDuplicates();
    if (duplicates.length > 0 && !duplicateWarning) {
      setDuplicateWarning(duplicates);
      return;
    }

    setDuplicateWarning(null);
    const payload = draftProducts.map((item) => ({
      store_id: storeId,
      name: item.name.trim(),
      price: Math.round(Number(item.price) || 0),
      description: item.description.trim() || null,
      stock: Number(item.stock) || 0,
      image_url: item.images[0] || null,
      category: item.category.trim() || null,
      is_active: item.is_active,
      images: item.images,
    }));

    setSubmitting(true);
    try {
      const { inserted, error } = await createProductsBulkWithImages(payload);
      if (error || !inserted) {
        setPublishSummary({
          succeeded: 0,
          total: payload.length,
          errors: [{ name: "Batch", msg: error?.message || "Bulk upload failed" }],
        });
        toast.error(BULK_UPLOAD.PUBLISH_FAILED);
        return;
      }

      const summary = {
        succeeded: inserted.length,
        total: payload.length,
        errors: [] as { name: string; msg: string }[],
      };

      if (inserted.length < payload.length) {
        summary.errors.push({
          name: payload[inserted.length]?.name || "Unknown",
          msg: "Product was not created",
        });
      }

      setPublishSummary(summary);
      toast.success(BULK_UPLOAD.PUBLISH_RESULT.replace("{succeeded}", String(inserted.length)).replace("{total}", String(payload.length)));
      setDraftProducts([]);
      setTimeout(() => onComplete(), 1500);
    } catch (err: any) {
      setPublishSummary({
        succeeded: 0,
        total: payload.length,
        errors: [{ name: "Error", msg: err?.message || "Bulk publish failed." }],
      });
      toast.error(err?.message || "Bulk publish failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDesc = (id: string) => {
    setExpandedDesc((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="border border-[hsl(var(--border)/0.3)] rounded-sm bg-[hsl(var(--card))] p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground">{BULK_UPLOAD.TITLE}</h3>
          <p className="text-[11px] text-muted-foreground">{BULK_UPLOAD.DROP_HINT}</p>
        </div>
        <button type="button" onClick={onCancel} className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors">
          {ACTIONS.CANCEL}
        </button>
      </div>

      {publishSummary && (
        <div className={`rounded-sm border px-4 py-3 text-[11px] uppercase tracking-[0.2em] ${publishSummary.errors.length > 0 ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-emerald-500/30 bg-emerald-500/5 text-emerald-600"}`}>
          <span className="font-semibold">
            {publishSummary.succeeded}/{publishSummary.total} {BULK_UPLOAD.PRODUCTS_READY}
          </span>
          {publishSummary.errors.length > 0 && (
            <ul className="mt-2 space-y-1 normal-case tracking-normal">
              {publishSummary.errors.map((e, i) => (
                <li key={i} className="text-[11px] text-destructive/80">{e.name}: {e.msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div
        className="min-h-[220px] rounded-sm border-2 border-dashed border-[hsl(var(--border)/0.3)] bg-[hsl(var(--background))] p-6 text-center text-muted-foreground hover:border-[hsl(var(--highlight))] hover:text-foreground transition-colors"
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud className="mx-auto mb-3 w-8 h-8" />
        <p className="text-sm font-semibold text-foreground">{BULK_UPLOAD.DROP_TITLE}</p>
        <p className="text-[11px] mt-2">{BULK_UPLOAD.DROP_HINT}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => event.target.files && handleFiles(event.target.files)}
        />
        <input
          ref={extraFileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleAdditionalFiles}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {draftProducts.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">{BULK_UPLOAD.BULK_PRICE}</label>
              <input
                value={globalPrice}
                onChange={(e) => setGlobalPrice(e.target.value)}
                className="w-full border border-[hsl(var(--border)/0.3)] bg-[hsl(var(--card))] px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0"
                inputMode="numeric"
              />
              <button type="button" onClick={applyBulkPrice} className="px-3 py-2 text-[11px] uppercase tracking-[0.2em] border border-[hsl(var(--border)/0.3)] rounded-sm hover:border-[hsl(var(--highlight))] transition-colors">
                {ACTIONS.APPLY}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">{BULK_UPLOAD.BULK_STOCK}</label>
              <input
                value={globalStock}
                onChange={(e) => setGlobalStock(e.target.value)}
                className="w-full border border-[hsl(var(--border)/0.3)] bg-[hsl(var(--card))] px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="—"
                inputMode="numeric"
              />
              <button type="button" onClick={applyBulkStock} className="px-3 py-2 text-[11px] uppercase tracking-[0.2em] border border-[hsl(var(--border)/0.3)] rounded-sm hover:border-[hsl(var(--highlight))] transition-colors">
                {ACTIONS.APPLY}
              </button>
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <div className="flex items-center gap-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">{BULK_UPLOAD.CATEGORY}</label>
                <input
                  value={globalCategory}
                  onChange={(e) => setGlobalCategory(e.target.value)}
                  list="bulk-category-list"
                  className="flex-1 border border-[hsl(var(--border)/0.3)] bg-[hsl(var(--card))] px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={BULK_UPLOAD.CATEGORY}
                />
                <datalist id="bulk-category-list">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
                <button type="button" onClick={applyBulkCategory} className="px-3 py-2 text-[11px] uppercase tracking-[0.2em] border border-[hsl(var(--border)/0.3)] rounded-sm hover:border-[hsl(var(--highlight))] transition-colors">
                  {ACTIONS.APPLY}
                </button>
              </div>
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setGlobalCategory(cat)}
                      className={`text-[10px] px-2 py-0.5 rounded-sm border transition-colors ${
                        globalCategory === cat
                          ? "border-[hsl(var(--highlight))] bg-[hsl(var(--highlight)/0.1)] text-foreground"
                          : "border-[hsl(var(--border)/0.3)] text-muted-foreground hover:text-foreground hover:border-[hsl(var(--border))]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {duplicateWarning && duplicateWarning.length > 0 && (
            <div className="rounded-sm border border-amber-500/30 bg-amber-500/5 px-4 py-3 space-y-2">
              <p className="text-[11px] uppercase tracking-[0.2em] text-amber-600 font-semibold">{BULK_UPLOAD.DUPLICATE_TITLE}</p>
              <ul className="space-y-1">
                {duplicateWarning.map((dup, i) => (
                  <li key={i} className="text-[11px] text-amber-600/80">{dup}</li>
                ))}
              </ul>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handlePublish}
                  className="text-[11px] uppercase tracking-[0.2em] text-amber-600 underline hover:no-underline"
                >
                  {BULK_UPLOAD.PUBLISH_ANYWAY}
                </button>
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                >
                  {BULK_UPLOAD.FIX_THEM}
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <div className="min-w-[760px] rounded-sm border border-[hsl(var(--border)/0.3)]">
              <div className="grid grid-cols-[50px_minmax(220px,1fr)_120px_180px] gap-0 bg-[hsl(var(--surface-warm))] border-b border-[hsl(var(--border)/0.3)] px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                <span>{BULK_UPLOAD.PREVIEW}</span>
                <span>{BULK_UPLOAD.PRODUCT}</span>
                <span>{BULK_UPLOAD.PRICE_STOCK}</span>
                <span>{BULK_UPLOAD.CATEGORY}</span>
              </div>
              <div className="space-y-1 p-3">
                {draftProducts.map((draft, index) => (
                  <div key={draft.id} className="rounded-sm border border-[hsl(var(--border)/0.3)] bg-[hsl(var(--card))]">
                    <div className="grid grid-cols-[50px_minmax(220px,1fr)_120px_180px] gap-3 items-center p-2">
                      <div className="relative h-12 w-12 overflow-hidden rounded-sm bg-[hsl(var(--background))]">
                        <img src={draft.thumbnail} alt={draft.name} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const targetIndex = draftProducts.findIndex((item) => item.id === draft.id);
                            if (targetIndex !== -1) {
                              additionalDraftIndexRef.current = targetIndex;
                              extraFileInputRef.current?.click();
                            }
                          }}
                          className="absolute bottom-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-sm border border-[hsl(var(--border)/0.3)] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm hover:border-[hsl(var(--highlight))] transition-colors"
                          aria-label="Add image"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        {draft.images.length > 1 && (
                          <span className="absolute left-1 top-1 rounded-sm bg-[hsl(var(--surface-warm))] px-1 text-[10px] uppercase text-muted-foreground">
                            +{draft.images.length - 1}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <input
                          value={draft.name}
                          onChange={(e) => updateDraft(draft.id, { name: e.target.value })}
                          className="w-full border border-[hsl(var(--border)/0.3)] bg-[hsl(var(--card))] px-2 py-1 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder={PRODUCTS_TAB.NAME}
                        />
                        <div className="flex items-center gap-3">
                          {draft.error ? (
                            <p className="text-[11px] text-destructive">{draft.error}</p>
                          ) : draft.uploading ? (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> {ACTIONS.LOADING}</p>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">{draft.images.length > 0 ? `${draft.images.length} ${BULK_UPLOAD.IMAGES}` : ACTIONS.LOADING}</p>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleDesc(draft.id)}
                            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {expandedDesc.has(draft.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            {BULK_UPLOAD.DESCRIPTION}
                          </button>
                        </div>
                        {expandedDesc.has(draft.id) && (
                          <textarea
                            value={draft.description}
                            onChange={(e) => updateDraft(draft.id, { description: e.target.value })}
                            className="w-full border border-[hsl(var(--border)/0.3)] bg-[hsl(var(--card))] px-2 py-1.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none mt-1"
                            placeholder={BULK_UPLOAD.DESCRIPTION_PLACEHOLDER}
                            rows={2}
                          />
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={draft.price}
                          onChange={(e) => updateDraft(draft.id, { price: e.target.value })}
                          className="border border-[hsl(var(--border)/0.3)] bg-[hsl(var(--card))] px-2 py-1 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder={PRODUCTS_TAB.PRICE}
                          inputMode="numeric"
                        />
                        <input
                          value={draft.stock}
                          onChange={(e) => updateDraft(draft.id, { stock: e.target.value })}
                          className="border border-[hsl(var(--border)/0.3)] bg-[hsl(var(--card))] px-2 py-1 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder={PRODUCTS_TAB.STOCK}
                          inputMode="numeric"
                        />
                      </div>
                      <div className="relative">
                        <div className="flex gap-1">
                          <input
                            value={draft.category}
                            onChange={(e) => updateDraft(draft.id, { category: e.target.value })}
                            onBlur={() => {
                              const trimmed = draft.category.trim();
                              if (!trimmed || categories.includes(trimmed)) return;
                              if (!isPro && categories.length >= FREE_CATEGORY_LIMIT) {
                                toast.error(`Free plan allows only ${FREE_CATEGORY_LIMIT} categories.`);
                                return;
                              }
                              saveCategories(storeId, [trimmed]).then(({ categories: refreshed, error }) => {
                                if (error) return;
                                setCategories(refreshed);
                                onCategoryAdded?.(trimmed);
                              });
                            }}
                            className="flex-1 min-w-0 border border-[hsl(var(--border)/0.3)] bg-[hsl(var(--card))] px-2 py-1 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder={BULK_UPLOAD.CATEGORY}
                          />
                          {categories.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedCat(prev => { const next = new Set(prev); if (next.has(draft.id)) next.delete(draft.id); else next.add(draft.id); return next; })}
                              className="shrink-0 px-1.5 border border-[hsl(var(--border)/0.3)] rounded-sm text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ChevronDown className={`w-3 h-3 transition-transform ${expandedCat.has(draft.id) ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>
                        {expandedCat.has(draft.id) && (
                          <div className="absolute z-20 top-full left-0 right-0 mt-1 p-1.5 border border-[hsl(var(--border)/0.3)] bg-[hsl(var(--card))] rounded-sm shadow-md max-h-36 overflow-y-auto">
                            <div className="flex flex-wrap gap-1">
                              {categories.map((cat) => (
                                <button
                                  key={cat}
                                  type="button"
                                  onMouseDown={(e) => { e.preventDefault(); updateDraft(draft.id, { category: cat }); setExpandedCat(prev => { const next = new Set(prev); next.delete(draft.id); return next; }); }}
                                  className={`text-[10px] px-1.5 py-0.5 rounded-sm border transition-colors ${
                                    draft.category === cat
                                      ? "border-[hsl(var(--highlight))] bg-[hsl(var(--highlight)/0.1)] text-foreground"
                                      : "border-[hsl(var(--border)/0.3)] text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-between">
            <p className="text-[11px] text-muted-foreground">{draftProducts.length} {BULK_UPLOAD.PRODUCTS_READY}</p>
            <div className="flex items-center gap-3">
              {publishSummary && (
                <span className="text-[11px] text-muted-foreground">{BULK_UPLOAD.AUTO_DISMISS}</span>
              )}
              <button
                type="button"
                onClick={handlePublish}
                disabled={submitting}
                className="px-4 py-2 text-[11px] uppercase tracking-[0.2em] bg-[hsl(var(--highlight))] text-[hsl(var(--background))] rounded-sm transition-opacity disabled:opacity-50"
              >
                {submitting ? BULK_UPLOAD.PUBLISHING : BULK_UPLOAD.PUBLISH_ALL}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkUploadComponent;
