import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Minus, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import { ERROR_CODES, useFormatError } from "@/lib/errorCodes";
import { useLabels } from "@/hooks/useLabels";
import type { ProductRow } from "@/types/store";

interface ManualOrderFormProps {
  products: ProductRow[];
  storeId: string;
  onClose: () => void;
  onCreated: () => void;
}

interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

const ManualOrderForm = ({ products, storeId, onClose, onCreated }: ManualOrderFormProps) => {
  const { MANUAL_ORDER, ACTIONS } = useLabels();
  const formatError = useFormatError();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [saving, setSaving] = useState(false);

  const addItem = (product: ProductRow) => {
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      setItems(items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { productId: product.id, productName: product.name, price: product.price, quantity: 1 }]);
    }
  };

  const updateQty = (productId: string, delta: number) => {
    setItems(prev => prev.map(i => {
      if (i.productId !== productId) return i;
      const newQty = i.quantity + delta;
      return newQty <= 0 ? i : { ...i, quantity: newQty };
    }));
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim() || items.length === 0) {
      toast.error(formatError(ERROR_CODES.ORD_001));
      return;
    }

    setSaving(true);
    try {
      // Create order directly via service (store owner creates it)
      const refCode = String(Math.floor(1000 + Math.random() * 9000));
      const phoneDigits = customerPhone.replace(/\D/g, "");
      // Simple hash for manual orders
      const phoneHash = `manual_${phoneDigits}_${Date.now()}`;
      
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          store_id: storeId,
          customer_phone: customerPhone.trim(),
          customer_phone_hash: phoneHash,
          total_price: total,
          status: "paid_confirmed",
          reference_code: refCode,
        } as Database["public"]["Tables"]["orders"]["Insert"])
        .select("id, public_order_id")
        .single();

      if (orderError) throw orderError;

      // Insert order items
      const orderItems = items.map(i => ({
        order_id: order.id,
        product_id: i.productId,
        product_name: i.productName,
        product_price: i.price,
        quantity: i.quantity,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      const { error: contactError } = await supabase.from("order_contacts").insert({
        order_id: order.id,
        store_id: storeId,
        customer_phone: customerPhone.trim(),
      } as Database["public"]["Tables"]["order_contacts"]["Insert"]);

      // Forward order PII to Hoster.kz bridge (data-localization compliance, non-blocking)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) return;
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-pii`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            storeId,
            orderPii: {
              orderId: order.id,
              customerName: customerName.trim(),
              customerPhone: customerPhone.trim(),
              customerAddress: customerAddress.trim(),
            }
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const body = await res.text().catch(() => "");
            console.warn(`[manual-order] store-pii failed: ${res.status} ${body}`);
          }
        }).catch((err) => {
          console.warn("[manual-order] store-pii network error:", err);
        });
      });
      // Contact insert may fail silently (RLS), that's ok for manual orders

      toast.success(`${MANUAL_ORDER.SUCCESS} ${order.public_order_id}`);
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(formatError(ERROR_CODES.ORD_004, err.message));
    } finally {
      setSaving(false);
    }
  };

  const activeProducts = products.filter(p => p.is_active && p.stock > 0);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="border border-border rounded-sm p-6 mb-6 space-y-4"
    >
      <h3 className="text-xs md:text-sm font-semibold tracking-[0.15em] uppercase text-foreground flex items-center gap-2">
        <Package className="w-4 h-4" />
        {MANUAL_ORDER.TITLE}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">{MANUAL_ORDER.CUSTOMER_NAME}</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full border border-border bg-transparent px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
          </div>
          <div>
            <label className="text-sm tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">{MANUAL_ORDER.CUSTOMER_PHONE}</label>
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+7 777 123 4567" className="w-full border border-border bg-transparent px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
          </div>
          <div>
            <label className="text-sm tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">{MANUAL_ORDER.CUSTOMER_ADDRESS}</label>
            <input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="w-full border border-border bg-transparent px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
          </div>
        </div>

        {/* Product selection */}
        <div>
          <label className="text-sm tracking-[0.15em] uppercase text-muted-foreground mb-2 block">{MANUAL_ORDER.SELECT_PRODUCTS}</label>
          {activeProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{MANUAL_ORDER.NO_PRODUCTS}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-border rounded-sm p-2">
              {activeProducts.map(product => {
                const inCart = items.find(i => i.productId === product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addItem(product)}
                    className={`text-left p-2 text-xs border rounded-sm transition-colors ${
                      inCart ? "border-primary bg-primary/5" : "border-border hover:border-foreground"
                    }`}
                  >
                    <p className="font-medium truncate">{product.name}</p>
                    <p className="text-muted-foreground">{formatPrice(product.price)}</p>
                    <p className="text-[10px] text-muted-foreground/60">{MANUAL_ORDER.STOCK}: {product.stock}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected items */}
        {items.length > 0 && (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.productId} className="flex items-center justify-between border border-border rounded-sm px-3 py-2">
                <div className="flex-1">
                  <span className="text-sm">{item.productName}</span>
                  <span className="text-xs text-muted-foreground ml-2">{formatPrice(item.price)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateQty(item.productId, -1)} className="p-1 border border-border rounded-sm hover:bg-muted"><Minus className="w-3 h-3" /></button>
                  <span className="text-sm font-mono w-6 text-center">{item.quantity}</span>
                  <button type="button" onClick={() => updateQty(item.productId, 1)} className="p-1 border border-border rounded-sm hover:bg-muted"><Plus className="w-3 h-3" /></button>
                  <button type="button" onClick={() => removeItem(item.productId)} className="p-1 text-destructive/70 hover:text-destructive transition-colors text-xs ml-1">✕</button>
                </div>
              </div>
            ))}
            <div className="text-right text-sm font-medium">Total: {formatPrice(total)}</div>
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={saving || items.length === 0} className="bg-primary text-primary-foreground px-6 py-2.5 text-sm rounded-sm hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50">
            {saving ? ACTIONS.SAVING : ACTIONS.CREATE}
          </button>
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm border border-border rounded-sm hover:bg-muted transition-colors">
            {ACTIONS.CANCEL}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default ManualOrderForm;
