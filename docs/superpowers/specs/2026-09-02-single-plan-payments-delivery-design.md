# Store Features: Single Plan, Payment Options, Delivery & Fixes — Design

**Date:** 2026-09-02
**Status:** Approved (pending spec review)
**Scope:** dokan storefront SaaS — billing simplification, customer payment options, delivery carrier config, product image crop, address limit, toast/content bugs.

---

## Context

The app is a Bangladesh-localized storefront SaaS (React + Vite + Tailwind + Supabase, i18n en/bn via `useLabels`). Today:

- Billing has three plans (basic 0৳ / pro_month 15,000৳ / pro_year 150,000৳) with manual receipt upload → Telegram admin approval. Unpaid stores hit trial limits (5 products, 2 categories, 1 image/product, revenue pause; Promo tab & Analytics paid-only).
- Checkout has exactly one payment method: a generic QR + phone (`stores.payment_qr_image/payment_phone/payment_name`) with a reference code + "I have paid" → `claim-payment` flow. No COD, no e-wallets, no method selection.
- No delivery carrier configuration exists. The checkout country row renders blank because `CheckoutSheet.tsx` references the dead key `CHECKOUT.KAZAKHSTAN` (translations define `CHECKOUT.BANGLADESH`).
- Address input has no max length client-side; the `create-order` edge function allows 300.
- Saving branding shows a toast with empty content.
- Product image upload has no crop (banner 16:9 and payment QR 1:1 already crop via `ImageCropUpload`).

Direction: manual, seller-configured payment/delivery now; real gateway/courier integrations later as on-demand rollouts. The chosen data model must leave room for that.

## Decisions (from client Q&A)

| Question | Decision |
|---|---|
| Plans | Remove tiers. One **Standard** plan, monthly with expiry. Keep receipt → Telegram approval flow. |
| Unpaid stores | Keep today's trial limits (no free plan advertised, trial behavior unchanged). |
| Billing promo code | Keep platform promo codes (percent off the Standard price). |
| E-wallets | bKash, Nagad, Rocket, Upay. Seller uploads number and/or QR per wallet. |
| Old generic QR | Kept as an extra toggleable method ("bank QR"). |
| COD / "Contact us" | Toggleable options; order created without a payment step. |
| Checkout after wallet selection | Same as current QR flow (reference code → "I have paid"). |
| Carriers | Toggle from known list + custom names. Informational only — no fee math. |
| Plan price | 15,000৳/month (today's Pro monthly price). |
| Product crop | Include, fixed **5:7 vertical** ratio, no ratio choice exposed. |
| Store logo | **Deferred** — out of scope this round. |
| Address | 250 characters max, client and server. |

## 1. Data model (one migration)

```sql
ALTER TABLE stores ADD COLUMN payment_methods   jsonb NOT NULL DEFAULT '{}';
ALTER TABLE stores ADD COLUMN delivery_carriers jsonb NOT NULL DEFAULT '[]';
ALTER TABLE orders ADD COLUMN payment_method    text;  -- 'bkash'|'nagad'|'rocket'|'upay'|'bank'|'cod'|'contact_us'
```

The same migration also remaps paid plan values: `UPDATE profiles SET plan_type='standard' WHERE plan_type IN ('pro_month','pro_year');` (legacy `stores` duplicates included if still written).

`payment_methods` shape:

```json
{
  "wallets": {
    "bkash":  { "enabled": false, "phone": "", "qr_url": null },
    "nagad":  { "enabled": false, "phone": "", "qr_url": null },
    "rocket": { "enabled": false, "phone": "", "qr_url": null },
    "upay":   { "enabled": false, "phone": "", "qr_url": null }
  },
  "cod":        { "enabled": false },
  "contact_us": { "enabled": false },
  "bank":       { "enabled": false }
}
```

Rules:

- `bank` reuses the existing `stores.payment_qr_image / payment_phone / payment_name` columns — no duplication.
- A wallet may only be saved as `enabled` with a phone and/or QR present.
- `delivery_carriers` = `[ { "name": "Pathao" }, { "name": "My Local Van", "custom": true } ]`. Known list constant in `src/constants/`: **Pathao, Steadfast, RedX, Sundarban, SA Paribahan** (extensible later).
- **Backward compat:** a store whose `payment_methods` is `'{}'` keeps today's behavior — legacy QR fields shown at checkout if present. This also covers stores not yet migrated in the UI.
- Extension point: future gateway entries and per-carrier integrations slot into these jsonb shapes; no code for that now.

Type updates: `src/types/store.ts`, `src/integrations/supabase/types.ts` gain the new columns.

## 2. Seller config — BrandingTab

- The "Payment Methods" card expands:
  - Per wallet (bKash/Nagad/Rocket/Upay): enable toggle, phone input, QR upload via `ImageCropUpload` (1:1, `qr-codes` bucket, `imageType` product path like today's QR).
  - COD toggle; "Contact us" toggle; Bank QR section as today behind its own toggle.
- New "Delivery" card: checkboxes for the known carrier list + "add custom" text input (removable chips). Saved with the existing `saveBranding` flow (single save button — same as the rest of BrandingTab).
- All labels go in `src/constants/translations.ts` **en + bn** under new section(s) (e.g. `PAYMENT_METHODS`, `DELIVERY_CONFIG`), registered in `useLabels.ts` `SECTIONS`.

## 3. Customer checkout — CheckoutSheet / PaymentView

- Fix the country row to render **Bangladesh** (`CHECKOUT.BANGLADESH`).
- Informational line "Delivery via: Pathao, Steadfast…" rendered when `delivery_carriers` is non-empty. No fee math; cost settles with the seller / via COD.
- Payment method chooser after the address form — one card per enabled method (wallet logo + name, COD, Contact us, Bank QR):
  - **Wallet / Bank** → unchanged flow: `PaymentView` shows that method's number/QR (gains a `method` prop), reference code, 30-min window, "I have paid" → `claim-payment`. `claim-payment` untouched.
  - **COD** → order created with `payment_method='cod'`; **no payment step and no 30-min expiry window** — the order is immediately with the seller as pay-on-delivery. (Implementation must ensure the expire-stale-orders path doesn't kill these orders — e.g. they never enter the payment-pending state.)
  - **Contact us** → order created with `payment_method='contact_us'`; no payment step; confirmation copy: seller will contact you to arrange payment; additional charges may apply.
- Wallet logos ship as bundled image assets (client provides final files; bKash/Nagad/Rocket/Upay names confirmed).
- `create-order` edge function: accepts `paymentMethod`, **validates it is enabled on that store**, persists it on the order, returns the matching number/QR for wallet/bank methods. No other validation changes.
- Address input: `maxLength={250}` + live character counter; `create-order` zod `customerAddress` max tightened 300 → **250**.

## 4. Billing — single Standard plan

- `SubscriptionSection`: one **Standard** card — all functions included, 15,000৳/month, promo-code field kept (existing `promo_codes` percent-off applies to this price, reported to admin via Telegram as today). Receipt upload → `pre_authorized` → Telegram admin approve → `active` with +31-day expiry. Flow and edge functions unchanged; only the tier selection disappears.
- `PricingSection` (landing) and `UpgradeModal`: collapse to the single plan.
- `plan_type` values: migration maps `'pro_month'` and `'pro_year'` → `'standard'`; expiry preserved. `isPro` (`useStoreData.ts`) and the `downgrade-expired` cron treat `'standard'` as the paid value (downgrade on expiry → trial, as today).
- Unpaid stores: trial limits unchanged (5 products, 2 categories, 1 image/product, revenue pause, Promo tab + Analytics paid-only via `ProOnlyGate`).

## 5. Product image crop

- `ProductEditModal` routes every product image (first and additional) through `ImageCropUpload` with a **fixed `aspectRatio: 5/7`** and product `imageType` sizing; upload pipeline (`optimizeImage`) unchanged. Drag-reorder and the image-count limit stay as-is. No ratio picker.

## 6. Empty-toast bug

- Reproduce the branding-save toast; find the root cause (likely a missing/renamed label key resolving to empty) and fix it.
- Audit all `toast.*` calls (~132 across ~23 files) for the same class of bug (empty content from label lookups); fix the affected ones. No toast-library change.

## 7. Out of scope / future

- Store logo upload/display (explicitly deferred).
- Real payment-gateway or courier API integrations — jsonb shapes reserve room; rolled out later on demand.
- Any promo/coupon changes beyond wiring the existing percent-off to the single plan.

## Verification

- Offline gates (repo convention, no live DB): `npm run build`, `npx tsc --noEmit`, `npm run lint`, `npm test`.
- `grep -rn "KAZAKHSTAN" src` → 0.
- Unit tests: address max-length validation; `create-order` method-enabled validation logic; billing promo percent application to the Standard price; `isPro` treating `'standard'` as paid.
- Manual QA checklist: seller configures methods/carriers → storefront checkout honors toggles; COD order skips payment; wallet order shows correct number/QR; toast content non-empty on branding save (en + bn); 251st character blocked in address.
- Playwright e2e stays deferred (requires live backend), per repo convention.
