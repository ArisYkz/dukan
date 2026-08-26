import { describe, it, expect } from "vitest";
import { cartItemKey } from "@/lib/cartUtils";

describe("cartItemKey", () => {
  it("returns product ID when no variants", () => {
    expect(cartItemKey("prod-1")).toBe("prod-1");
  });

  it("returns product ID for empty variants", () => {
    expect(cartItemKey("prod-1", {})).toBe("prod-1");
  });

  it("includes variants sorted alphabetically", () => {
    const key = cartItemKey("prod-1", { color: "red", size: "XL" });
    expect(key).toContain("prod-1");
    expect(key).toContain("color=red");
    expect(key).toContain("size=XL");
  });

  it("produces a deterministic key regardless of variant order", () => {
    const a = cartItemKey("prod-1", { size: "XL", color: "red" });
    const b = cartItemKey("prod-1", { color: "red", size: "XL" });
    expect(a).toBe(b);
  });

  it("differentiates same product with different variants", () => {
    const a = cartItemKey("prod-1", { size: "M" });
    const b = cartItemKey("prod-1", { size: "L" });
    expect(a).not.toBe(b);
  });
});
