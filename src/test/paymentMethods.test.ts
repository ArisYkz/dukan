import { describe, it, expect } from "vitest";
import {
  normalizePaymentMethods, getEnabledMethods, isMethodEnabled,
  getWallet, methodNeedsPayment, PAYMENT_METHOD_LABELS, WALLET_KEYS,
  type PaymentMethodsConfig,
} from "@/constants/paymentMethods";
import { KNOWN_CARRIERS, normalizeCarriers } from "@/constants/delivery";

describe("normalizePaymentMethods", () => {
  it("returns empty config for null/undefined/garbage", () => {
    expect(normalizePaymentMethods(null)).toEqual({ wallets: {} });
    expect(normalizePaymentMethods(undefined)).toEqual({ wallets: {} });
    expect(normalizePaymentMethods("junk")).toEqual({ wallets: {} });
    expect(normalizePaymentMethods({})).toEqual({ wallets: {} });
  });

  it("keeps valid wallet entries and drops invalid ones", () => {
    const cfg = normalizePaymentMethods({
      wallets: {
        bkash: { enabled: true, phone: "017", qr_url: "http://x/y.png" },
        nagad: { enabled: true, phone: 123 }, // phone not string → normalized
        rocket: "nope",
      },
      cod: { enabled: true },
      unknown_key: { enabled: true }, // dropped
    });
    expect(cfg.wallets.bkash).toEqual({ enabled: true, phone: "017", qr_url: "http://x/y.png" });
    expect(cfg.wallets.nagad?.enabled).toBe(true);
    expect(cfg.wallets.rocket).toBeUndefined();
    expect(cfg.cod?.enabled).toBe(true);
    expect((cfg as any).unknown_key).toBeUndefined();
  });
});

describe("getEnabledMethods", () => {
  it("returns [] for empty/legacy config (legacy bank QR handled elsewhere)", () => {
    expect(getEnabledMethods(normalizePaymentMethods({}))).toEqual([]);
  });

  it("includes a wallet only when enabled AND has phone or qr", () => {
    const cfg: PaymentMethodsConfig = {
      wallets: {
        bkash: { enabled: true, phone: "", qr_url: null },        // enabled but empty → excluded
        nagad: { enabled: true, phone: "018", qr_url: null },      // ok
        rocket: { enabled: false, phone: "019", qr_url: "q.png" }, // disabled → excluded
        upay: { enabled: true, phone: "", qr_url: "q.png" },       // qr only → ok
      },
    };
    expect(getEnabledMethods(cfg)).toEqual(["nagad", "upay"]);
  });

  it("includes cod/contact_us/bank only when enabled; bank requires legacy fields via store", () => {
    const cfg: PaymentMethodsConfig = {
      wallets: {},
      cod: { enabled: true },
      contact_us: { enabled: false },
      bank: { enabled: true },
    };
    expect(getEnabledMethods(cfg)).toEqual(["cod", "bank"]);
  });
});

describe("isMethodEnabled / getWallet / methodNeedsPayment", () => {
  const cfg: PaymentMethodsConfig = {
    wallets: { bkash: { enabled: true, phone: "017", qr_url: null } },
    cod: { enabled: true },
  };
  it("isMethodEnabled", () => {
    expect(isMethodEnabled(cfg, "bkash")).toBe(true);
    expect(isMethodEnabled(cfg, "nagad")).toBe(false);
    expect(isMethodEnabled(cfg, "cod")).toBe(true);
    expect(isMethodEnabled(cfg, "bank")).toBe(false);
  });
  it("getWallet returns wallet config or undefined", () => {
    expect(getWallet(cfg, "bkash")?.phone).toBe("017");
    expect(getWallet(cfg, "upay")).toBeUndefined();
  });
  it("methodNeedsPayment is false only for cod/contact_us", () => {
    expect(methodNeedsPayment("cod")).toBe(false);
    expect(methodNeedsPayment("contact_us")).toBe(false);
    expect(methodNeedsPayment("bkash")).toBe(true);
    expect(methodNeedsPayment("bank")).toBe(true);
  });
  it("wallet keys and labels align", () => {
    expect(WALLET_KEYS).toEqual(["bkash", "nagad", "rocket", "upay"]);
    expect(PAYMENT_METHOD_LABELS.bkash).toBe("bKash");
    expect(PAYMENT_METHOD_LABELS.cod).toBeTruthy();
  });
});

describe("normalizeCarriers", () => {
  it("drops empty names, dedupes, keeps custom flag", () => {
    expect(normalizeCarriers(null)).toEqual([]);
    expect(normalizeCarriers([{ name: "Pathao" }, { name: "Pathao" }, { name: "  " }, { name: "My Van", custom: true }]))
      .toEqual([{ name: "Pathao" }, { name: "My Van", custom: true }]);
  });
  it("KNOWN_CARRIERS has the known list", () => {
    expect(KNOWN_CARRIERS).toContain("Pathao");
    expect(KNOWN_CARRIERS).toContain("Steadfast");
  });
});
