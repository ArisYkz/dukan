import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useLabels } from "@/hooks/useLabels";

interface ReportStoreDrawerProps {
  storeId: string;
  open: boolean;
  onClose: () => void;
}

const REASONS = [
  { value: "scam", labelKey: "REASON_SCAM" },
  { value: "inappropriate", labelKey: "REASON_INAPPROPRIATE" },
  { value: "counterfeit", labelKey: "REASON_COUNTERFEIT" },
] as const;

const ReportStoreDrawer = ({ storeId, open, onClose }: ReportStoreDrawerProps) => {
  const { REPORT } = useLabels();
  const [reason, setReason] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason || !phone.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("reports")
        .insert({
          store_id: storeId,
          buyer_phone: phone.trim(),
          reason,
          details: details.trim() || null,
        } as Database["public"]["Tables"]["reports"]["Insert"]);
      if (error) throw error;
      toast.success(REPORT.SUBMITTED);
      setReason("");
      setPhone("");
      setDetails("");
      onClose();
    } catch {
      toast.error(REPORT.ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/30"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-xl border-t border-border bg-card max-h-[85vh] overflow-y-auto"
          >
            <div className="p-6 space-y-6 max-w-lg mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                  {REPORT.TITLE}
                </p>
                <button onClick={onClose} className="p-1 opacity-50 hover:opacity-100 transition-opacity">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
                  {REPORT.REASON}
                </p>
                <div className="space-y-1.5">
                  {REASONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setReason(r.value)}
                      className={`w-full text-left px-4 py-2.5 font-mono text-xs border transition-colors ${
                        reason === r.value
                          ? "border-foreground bg-foreground/5"
                          : "border-border hover:border-foreground/30"
                      }`}
                    >
                      {REPORT[r.labelKey]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
                  {REPORT.YOUR_PHONE}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 1XXX-XXXXXX"
                  className="w-full px-4 py-2.5 font-mono text-xs border border-border bg-transparent focus:border-foreground outline-none transition-colors"
                />
              </div>

              {/* Details */}
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
                  {REPORT.DETAILS}
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 font-mono text-xs border border-border bg-transparent focus:border-foreground outline-none transition-colors resize-none"
                  placeholder={REPORT.DETAILS_PLACEHOLDER}
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!reason || !phone.trim() || submitting}
                className="w-full py-3 font-mono text-[10px] tracking-[0.2em] uppercase bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {submitting ? REPORT.SUBMITTING : REPORT.SUBMIT}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ReportStoreDrawer;
