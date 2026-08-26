import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag, CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useLabels } from "@/hooks/useLabels";

type PromoCode = Database["public"]["Tables"]["store_promo_codes"]["Row"];

interface PromoCodesTabProps {
  storeId: string;
}

const PromoCodesTab = ({ storeId }: PromoCodesTabProps) => {
  const { PROMO_TAB: L, ERRORS } = useLabels();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    code: "",
    discount_type: "percent" as "percent" | "amount",
    discount_value: "",
    min_cart_amount: "",
    min_quantity: "",
    start_date: new Date(),
    end_date: null as Date | null,
    max_uses: "",
  });

  const loadCodes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("store_promo_codes")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (error) toast.error(ERRORS?.GENERIC_ERROR || error.message);
    else setCodes((data || []) as PromoCode[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  const createCode = async () => {
    if (!form.code.trim()) { toast.error(L.CODE_REQUIRED); return; }
    if (!form.discount_value || Number(form.discount_value) <= 0) { toast.error(L.VALUE_REQUIRED); return; }

    const { error } = await supabase.from("store_promo_codes").insert({
      store_id: storeId,
      code: form.code.toUpperCase().trim(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_cart_amount: Number(form.min_cart_amount) || 0,
      min_quantity: Number(form.min_quantity) || 0,
      start_date: form.start_date.toISOString(),
      end_date: form.end_date?.toISOString() || null,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
    });

    if (error) {
      if (error.code === "23505") toast.error(L.CODE_EXISTS);
      else toast.error(ERRORS?.GENERIC_ERROR || error.message);
      return;
    }

    toast.success(L.CREATED);
    setShowForm(false);
    setForm({ code: "", discount_type: "percent", discount_value: "", min_cart_amount: "", min_quantity: "", start_date: new Date(), end_date: null, max_uses: "" });
    loadCodes();
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("store_promo_codes").update({ is_active: !current }).eq("id", id);
    if (error) toast.error(ERRORS?.GENERIC_ERROR || error.message);
    else loadCodes();
  };

  const deleteCode = async (id: string) => {
    const { error } = await supabase.from("store_promo_codes").delete().eq("id", id);
    if (error) toast.error(ERRORS?.GENERIC_ERROR || error.message);
    else { toast.success(L.DELETED); loadCodes(); }
  };

  const DatePicker = ({ label, value, onChange }: { label: string; value: Date | null; onChange: (d: Date | null) => void }) => (
    <div className="space-y-1.5">
      <Label className="font-mono text-xs uppercase tracking-wider">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button className={cn("w-full flex items-center gap-2 px-3 py-2.5 text-sm font-mono rounded-none border border-border/50 text-left transition-colors hover:bg-muted", !value && "text-muted-foreground")}>
            <CalendarIcon className="w-4 h-4 shrink-0" />
            {value ? format(value, "PPP") : L.PICK_DATE}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value || undefined} onSelect={(d) => onChange(d || null)} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs md:text-xl font-semibold tracking-[0.2em] uppercase text-foreground opacity-90">{L.TITLE}</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-mono tracking-wide rounded-none border transition-colors flex items-center gap-1.5 ${
            showForm
              ? "border-border/50 hover:bg-muted text-foreground/60"
              : "bg-foreground text-background border-foreground hover:opacity-90"
          }`}
        >
          <Plus className="w-4 h-4" />
          {showForm ? L.CANCEL : L.NEW_CODE}
        </button>
      </div>

      {showForm && (
        <div className="border border-border p-5 space-y-4 bg-card">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-mono text-xs uppercase tracking-wider">{L.CODE}</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. SUMMER25" className="uppercase" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-mono text-xs uppercase tracking-wider">{L.DISCOUNT_TYPE}</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setForm({ ...form, discount_type: "percent" })}
                  className={`flex-1 px-4 py-2.5 text-sm font-mono tracking-wide rounded-none border transition-colors ${
                    form.discount_type === "percent"
                      ? "bg-foreground text-background border-foreground"
                      : "border-border/50 hover:bg-muted text-foreground/60"
                  }`}
                >
                  {L.PERCENT}
                </button>
                <button
                  onClick={() => setForm({ ...form, discount_type: "amount" })}
                  className={`flex-1 px-4 py-2.5 text-sm font-mono tracking-wide rounded-none border transition-colors ${
                    form.discount_type === "amount"
                      ? "bg-foreground text-background border-foreground"
                      : "border-border/50 hover:bg-muted text-foreground/60"
                  }`}
                >
                  {L.AMOUNT}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="font-mono text-xs uppercase tracking-wider">
                {form.discount_type === "percent" ? L.DISCOUNT_PERCENT : L.DISCOUNT_AMOUNT}
              </Label>
              <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} placeholder="0" min="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-mono text-xs uppercase tracking-wider">{L.MIN_CART}</Label>
              <Input type="number" value={form.min_cart_amount} onChange={(e) => setForm({ ...form, min_cart_amount: e.target.value })} placeholder="0" min="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-mono text-xs uppercase tracking-wider">{L.MIN_QUANTITY}</Label>
              <Input type="number" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: e.target.value })} placeholder="0" min="0" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <DatePicker label={L.START_DATE} value={form.start_date} onChange={(d) => setForm({ ...form, start_date: d || new Date() })} />
            <DatePicker label={L.END_DATE} value={form.end_date} onChange={(d) => setForm({ ...form, end_date: d })} />
            <div className="space-y-1.5">
              <Label className="font-mono text-xs uppercase tracking-wider">{L.MAX_USES}</Label>
              <Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder={L.UNLIMITED} min="1" />
            </div>
          </div>

          <button onClick={createCode} className="px-4 py-2.5 text-sm font-mono tracking-wide uppercase rounded-none border bg-foreground text-background border-foreground hover:opacity-90 transition-colors w-full sm:w-auto">
            {L.CREATE}
          </button>
        </div>
      )}

      {codes.length === 0 && !showForm && (
        <div className="text-center py-12 text-muted-foreground font-mono text-sm">
          <Tag className="w-8 h-8 mx-auto mb-3 opacity-40" />
          {L.EMPTY}
        </div>
      )}

      {codes.length > 0 && (
        <div className="space-y-3">
          {codes.map((pc) => {
            const isExpired = pc.end_date && new Date(pc.end_date) < new Date();
            const isMaxed = pc.max_uses !== null && pc.used_count >= pc.max_uses;
            return (
              <div key={pc.id} className={cn("border border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card", (!pc.is_active || isExpired || isMaxed) && "opacity-60")}>
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="font-mono font-bold text-sm tracking-wider">{pc.code}</span>
                    <span className="text-xs font-mono px-2 py-0.5 border border-border bg-muted">
                      {pc.discount_type === "percent" ? `${pc.discount_value}%` : `${pc.discount_value} ₸`}
                    </span>
                    {!pc.is_active && <span className="text-xs font-mono text-destructive">{L.INACTIVE}</span>}
                    {isExpired && <span className="text-xs font-mono text-destructive">{L.EXPIRED}</span>}
                    {isMaxed && <span className="text-xs font-mono text-destructive">{L.MAX_REACHED}</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-muted-foreground justify-center sm:justify-start">
                    <span>{L.USED}: {pc.used_count}{pc.max_uses ? `/${pc.max_uses}` : ""}</span>
                    {pc.min_cart_amount != null && pc.min_cart_amount > 0 && <span>{L.MIN_CART_LABEL}: {pc.min_cart_amount} ₸</span>}
                    {pc.min_quantity != null && pc.min_quantity > 0 && <span>{L.MIN_QTY_LABEL}: {pc.min_quantity}</span>}
                    <span>{format(new Date(pc.start_date), "MMM d")} → {pc.end_date ? format(new Date(pc.end_date), "MMM d, yyyy") : L.NO_END}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleActive(pc.id, pc.is_active)} title={pc.is_active ? L.INACTIVE : L.INACTIVE} className="p-2 rounded-none hover:bg-muted transition-colors">
                    {pc.is_active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button onClick={() => deleteCode(pc.id)} className="p-2 rounded-none hover:bg-muted transition-colors text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PromoCodesTab;
