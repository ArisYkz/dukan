import { useState, useRef } from "react";
import Papa from "papaparse";
import { Upload, Download, Lock, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLabels } from "@/hooks/useLabels";
import { motion, AnimatePresence } from "framer-motion";

interface CsvImportProps {
  storeId: string;
  isPro: boolean;
  onShowUpgrade: () => void;
  onReload: () => void;
}

interface CsvRow {
  name?: string;
  price?: string;
  category?: string;
  description?: string;
  stock?: string;
}

const SAMPLE_CSV = `name,price,category,description,stock
Linen Shirt,15000,Clothing,Handmade premium linen,10
Minimalist Vase,8000,Home,Ceramic matte finish,5`;

const CsvImport = ({ storeId, isPro, onShowUpgrade, onReload }: CsvImportProps) => {
  const { PRODUCTS_TAB, ACTIONS } = useLabels();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClick = () => {
    if (!isPro) {
      onShowUpgrade();
      return;
    }
    fileRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        const valid: Array<{
          store_id: string;
          name: string;
          price: number;
          category: string | null;
          description: string | null;
          stock: number;
          image_url: null;
        }> = [];
        let skipped = 0;

        for (const row of rows) {
          const name = row.name?.trim();
          const priceNum = parseInt(row.price || "", 10);

          if (!name || isNaN(priceNum) || priceNum < 0) {
            skipped++;
            continue;
          }

          valid.push({
            store_id: storeId,
            name,
            price: priceNum,
            category: row.category?.trim() || null,
            description: row.description?.trim() || null,
            stock: parseInt(row.stock || "0", 10) || 0,
            image_url: null,
          });
        }

        if (valid.length === 0) {
          toast.error(PRODUCTS_TAB.CSV_EMPTY);
          setImporting(false);
          if (fileRef.current) fileRef.current.value = "";
          return;
        }

        const { error } = await supabase.from("products").insert(valid);

        if (error) {
          toast.error(PRODUCTS_TAB.CSV_ERROR);
          console.error(error);
        } else {
          setResult({ imported: valid.length, skipped });
          onReload();
        }

        setImporting(false);
        if (fileRef.current) fileRef.current.value = "";
      },
      error: () => {
        toast.error(PRODUCTS_TAB.CSV_ERROR);
        setImporting(false);
        if (fileRef.current) fileRef.current.value = "";
      },
    });
  };

  return (
    <div className="inline-flex items-center gap-2">
      <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />

      <button
        onClick={handleClick}
        disabled={importing}
        className="relative flex items-center gap-2 border border-border px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm rounded-sm hover:bg-muted/50 transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed font-mono"
      >
        {!isPro && <Lock className="w-3 h-3 text-muted-foreground" />}
        <Upload className="w-3.5 h-3.5" />
        <span className="text-xs tracking-wider uppercase">{PRODUCTS_TAB.IMPORT_CSV}</span>
        {!isPro && (
          <span className="ml-1 text-[9px] tracking-wider uppercase bg-accent text-accent-foreground px-1.5 py-0.5 rounded-sm font-bold">
            PRO
          </span>
        )}
      </button>

      <button
        onClick={downloadSample}
        className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors"
        title={PRODUCTS_TAB.DOWNLOAD_SAMPLE}
      >
        <Download className="w-3 h-3" />
        <span className="hidden sm:inline">{PRODUCTS_TAB.DOWNLOAD_SAMPLE}</span>
      </button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60"
            onClick={() => setResult(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-background border border-border p-8 max-w-sm mx-4 text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <FileText className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="font-mono text-sm tracking-wide">
                <span className="text-lg font-bold text-foreground">{result.imported}</span>{" "}
                {PRODUCTS_TAB.CSV_SUCCESS}
              </p>
              {result.skipped > 0 && (
                <p className="font-mono text-[10px] text-muted-foreground">
                  {result.skipped} {PRODUCTS_TAB.CSV_SKIPPED}
                </p>
              )}
              <p className="font-mono text-[10px] text-muted-foreground border-t border-border pt-3">
                {PRODUCTS_TAB.CSV_NOTE}
              </p>
              <button
                onClick={() => setResult(null)}
                className="w-full bg-foreground text-background py-2.5 text-xs tracking-[0.15em] uppercase font-mono hover:opacity-90 transition-opacity"
              >
                {ACTIONS.CLOSE}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CsvImport;
