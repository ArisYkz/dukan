/** Payment method configuration stored in stores.payment_methods (jsonb). */

export type WalletKey = "bkash" | "nagad" | "rocket" | "upay";

export const WALLET_KEYS: WalletKey[] = ["bkash", "nagad", "rocket", "upay"];

// Type aliases (not interfaces) — type aliases get implicit index signatures,
// so the config value stays assignable to `Record<string, unknown>` in the
// generated Supabase Update types used by saveBranding.
export type WalletConfig = {
  enabled: boolean;
  phone: string;
  qr_url: string | null;
};

export type PaymentMethodsConfig = {
  wallets: Partial<Record<WalletKey, WalletConfig>>;
  cod?: { enabled: boolean };
  contact_us?: { enabled: boolean };
  bank?: { enabled: boolean };
};

export type PaymentMethodKey = WalletKey | "bank" | "cod" | "contact_us";

/** Brand names are proper nouns — not translated. */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethodKey, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  upay: "Upay",
  bank: "Bank QR",
  cod: "Cash on Delivery",
  contact_us: "Contact Us",
};

export const EMPTY_PAYMENT_METHODS: PaymentMethodsConfig = { wallets: {} };

export function normalizePaymentMethods(raw: unknown): PaymentMethodsConfig {
  const out: PaymentMethodsConfig = { wallets: {} };
  if (!raw || typeof raw !== "object") return out;
  const obj = raw as Record<string, any>;
  if (obj.wallets && typeof obj.wallets === "object") {
    for (const key of WALLET_KEYS) {
      const w = obj.wallets[key];
      if (!w || typeof w !== "object") continue;
      out.wallets[key] = {
        enabled: Boolean(w.enabled),
        phone: typeof w.phone === "string" ? w.phone : "",
        qr_url: typeof w.qr_url === "string" ? w.qr_url : null,
      };
    }
  }
  for (const flag of ["cod", "contact_us", "bank"] as const) {
    const f = obj[flag];
    if (f && typeof f === "object" && "enabled" in f) out[flag] = { enabled: Boolean(f.enabled) };
  }
  return out;
}

/** A wallet counts as enabled only if it has something to pay with. */
export function walletIsUsable(w: WalletConfig | undefined): w is WalletConfig {
  return !!w && w.enabled && (w.phone.trim() !== "" || !!w.qr_url);
}

export function getEnabledMethods(cfg: PaymentMethodsConfig): PaymentMethodKey[] {
  const out: PaymentMethodKey[] = [];
  for (const key of WALLET_KEYS) {
    if (walletIsUsable(cfg.wallets[key])) out.push(key);
  }
  if (cfg.cod?.enabled) out.push("cod");
  if (cfg.contact_us?.enabled) out.push("contact_us");
  // bank requires the legacy store columns (payment_qr_image / payment_phone) — checked by caller
  if (cfg.bank?.enabled) out.push("bank");
  return out;
}

export function isMethodEnabled(cfg: PaymentMethodsConfig, key: PaymentMethodKey): boolean {
  if (WALLET_KEYS.includes(key as WalletKey)) return walletIsUsable(cfg.wallets[key as WalletKey]);
  return Boolean(cfg[key as "cod" | "contact_us" | "bank"]?.enabled);
}

export function getWallet(cfg: PaymentMethodsConfig, key: WalletKey): WalletConfig | undefined {
  return cfg.wallets[key];
}

export function methodNeedsPayment(key: PaymentMethodKey): boolean {
  return key !== "cod" && key !== "contact_us";
}
