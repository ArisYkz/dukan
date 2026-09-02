import { describe, it, expect } from "vitest";
import { applyPercentDiscount, isPaidPlan } from "@/lib/billing";

describe("applyPercentDiscount", () => {
  it("applies a percent discount to the Standard price", () => {
    expect(applyPercentDiscount(2000, 0)).toBe(2000);
    expect(applyPercentDiscount(2000, 10)).toBe(1800);
    expect(applyPercentDiscount(2000, 100)).toBe(0);
  });
});

describe("isPaidPlan", () => {
  it("treats standard and legacy pro values as paid", () => {
    expect(isPaidPlan("standard", "active")).toBe(true);
    expect(isPaidPlan("pro_month", "active")).toBe(true);
    expect(isPaidPlan("pro_year", "active")).toBe(true);
    expect(isPaidPlan("pro", "active")).toBe(true);
    expect(isPaidPlan("free", "active")).toBe(false);
  });
  it("pre_authorized counts as paid; banned never does", () => {
    expect(isPaidPlan("free", "pre_authorized")).toBe(true);
    expect(isPaidPlan("standard", "banned")).toBe(false);
  });
});
