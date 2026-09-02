import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const createOrderSchema = z.object({
  storeId: z.string().uuid(),
  customerName: z.string().trim().min(1).max(100),
  customerPhone: z.string().trim().min(6).max(20),
  customerAddress: z.string().trim().min(3).max(250),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(50),
  })).min(1).max(100),
  promoCode: z.string().optional(),
  discountAmount: z.number().int().min(0).optional(),
  paymentMethod: z.enum(["bkash", "nagad", "rocket", "upay", "bank", "cod", "contact_us"]).optional(),
});

const normalizePhone = (p: string) => p.replace(/\D/g, "");
const sha256Hex = async (v: string) => {
  const d = new TextEncoder().encode(v);
  const b = await crypto.subtle.digest("SHA-256", d);
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    console.log('create-order request body:', rawBody);
    const body = rawBody ? JSON.parse(rawBody) : {};
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Validation failed", details: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const input = parsed.data;

    // Fetch and lock products for stock safety
    const productIds = input.items.map(i => i.productId);
    const { data: products, error: pErr } = await supabase
      .from("products")
      .select("id, price, name, stock")
      .in("id", productIds);

    if (pErr || !products) {
      console.error("Product fetch error:", pErr?.message);
      return new Response(JSON.stringify({ error: "Could not process order. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalPrice = 0;
    const orderItemsPayload: { product_id: string; product_name: string; product_price: number; quantity: number }[] = [];

    for (const item of input.items) {
      const product = products.find((p: any) => p.id === item.productId);
      if (!product) {
        return new Response(JSON.stringify({ error: "One or more products are no longer available." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (product.stock < item.quantity) {
        return new Response(JSON.stringify({ error: `Insufficient stock for "${product.name}". Available: ${product.stock}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      totalPrice += product.price * item.quantity;
      orderItemsPayload.push({
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        quantity: item.quantity,
      });
    }

    // Fetch store — check is_paused + tax settings
    const { data: store } = await supabase
      .from("stores")
      .select("id, payment_qr_image, payment_phone, payment_name, payment_methods, is_paused, tax_enabled, tax_percent")
      .eq("id", input.storeId)
      .single();

    if (!store) {
      return new Response(JSON.stringify({ error: "Store not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (store.is_paused === true) {
      return new Response(JSON.stringify({ error: "This store is temporarily not accepting orders" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Validate chosen payment method against store config ────────────────
    let methodInfo: { phone: string | null; qr_url: string | null; name: string | null } = {
      phone: null, qr_url: null, name: null,
    };

    if (input.paymentMethod) {
      const pm = (store.payment_methods && typeof store.payment_methods === "object")
        ? store.payment_methods as Record<string, any>
        : {};
      const method = input.paymentMethod;
      let enabled = false;

      if (["bkash", "nagad", "rocket", "upay"].includes(method)) {
        const w = pm.wallets?.[method];
        enabled = Boolean(w?.enabled && ((w.phone && String(w.phone).trim() !== "") || (typeof w.qr_url === "string" && w.qr_url)));
        if (enabled) {
          methodInfo = { phone: (w.phone && String(w.phone).trim() !== "") ? String(w.phone) : null, qr_url: typeof w.qr_url === "string" && w.qr_url ? w.qr_url : null, name: null };
        }
      } else if (method === "bank") {
        enabled = pm.bank?.enabled === true || (pm.bank === undefined && Object.keys(pm).length === 0 && (!!store.payment_qr_image || !!store.payment_phone));
        if (enabled) {
          methodInfo = { phone: store.payment_phone || null, qr_url: store.payment_qr_image || null, name: store.payment_name || null };
        }
      } else {
        // cod / contact_us
        enabled = pm[method]?.enabled === true;
      }

      if (!enabled) {
        return new Response(JSON.stringify({ error: "This payment method is not available." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Validate promo code & discount ──────────────────────────────────────
    let discount = 0;
    if (input.promoCode) {
      const { data: promo, error: promoErr } = await supabase
        .from("store_promo_codes")
        .select("*")
        .eq("store_id", input.storeId)
        .eq("code", input.promoCode)
        .eq("is_active", true)
        .maybeSingle();

      if (promoErr || !promo) {
        return new Response(JSON.stringify({ error: "Invalid or expired promo code." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check max uses
      if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
        return new Response(JSON.stringify({ error: "Promo code has reached its usage limit." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check date range
      const now = new Date();
      if (promo.start_date && new Date(promo.start_date) > now) {
        return new Response(JSON.stringify({ error: "Promo code is not yet active." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (promo.end_date && new Date(promo.end_date) < now) {
        return new Response(JSON.stringify({ error: "Promo code has expired." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Calculate expected discount server-side
      let expectedDiscount = 0;
      if (promo.discount_type === "percent") {
        expectedDiscount = Math.round(totalPrice * Number(promo.discount_value) / 100);
      } else {
        expectedDiscount = Math.min(Number(promo.discount_value), totalPrice);
      }

      const claimedDiscount = input.discountAmount || 0;
      if (claimedDiscount !== expectedDiscount) {
        return new Response(JSON.stringify({
          error: "Discount amount does not match promo code.",
          details: { expected: expectedDiscount },
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      discount = claimedDiscount;
    } else if ((input.discountAmount || 0) > 0) {
      return new Response(JSON.stringify({ error: "Discount requires a valid promo code." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build order with tax breakdown
    const phoneHash = await sha256Hex(`${normalizePhone(input.customerPhone)}|${input.storeId}|v1`);
    const refCode = String(Math.floor(1000 + Math.random() * 9000));
    const subtotalAfterDiscount = Math.max(0, totalPrice - discount);
    const taxAmount = store.tax_enabled ? Math.round(subtotalAfterDiscount * (store.tax_percent || 0) / 100) : 0;
    const finalPrice = subtotalAfterDiscount + taxAmount;

    const isNoPayMethod = input.paymentMethod === "cod" || input.paymentMethod === "contact_us";

    const { data: order, error: oErr } = await supabase.from("orders").insert({
      store_id: store.id,
      customer_name: input.customerName,
      customer_phone: input.customerPhone.slice(0, 4) + "***" + input.customerPhone.slice(-2),
      customer_phone_hash: phoneHash,
      customer_address: input.customerAddress,
      subtotal: totalPrice,
      tax_amount: taxAmount,
      total_price: finalPrice,
      status: isNoPayMethod ? "confirmed" : "awaiting_verification",
      payment_method: input.paymentMethod || null,
      reference_code: refCode,
      promo_code: input.promoCode || null,
      discount_amount: discount,
    }).select("id, public_order_id").single();

    if (oErr) {
      console.error("Order insert error:", JSON.stringify(oErr));
      return new Response(JSON.stringify({ error: "Could not create order. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert order items
    const { error: itemsErr } = await supabase.from("order_items").insert(
      orderItemsPayload.map(item => ({ order_id: order.id, ...item }))
    );
    if (itemsErr) console.error("Order items insert error:", JSON.stringify(itemsErr));

    // Increment promo usage if applicable
    if (input.promoCode) {
      const { error: rpcErr } = await supabase.rpc("increment_promo_usage", { _store_id: input.storeId, _code: input.promoCode });
      if (rpcErr) console.error("Promo usage increment error:", JSON.stringify(rpcErr));
    }

    // Notify seller via Telegram — completely non-blocking, never fails the order
    try {
      const notifyUrl = `${supabaseUrl}/functions/v1/notify-order`;
      fetch(notifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ order_id: order.id }),
      }).catch(() => {});
    } catch (_) {
      // Swallow — Telegram must never block checkout
    }

    // Return success immediately
    return new Response(JSON.stringify({
      success: true,
      order_id: order.id,
      public_order_id: order.public_order_id,
      reference_code: refCode,
      qr_image_url: input.paymentMethod && input.paymentMethod !== "bank" ? methodInfo.qr_url : store.payment_qr_image,
      payment_phone: methodInfo.phone,
      payment_name: methodInfo.name,
      payment_method: input.paymentMethod || null,
      total_amount: finalPrice,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("create-order error:", error.message, error.stack);
    return new Response(JSON.stringify({ error: "An unexpected error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
