import { describe, it, expect } from "vitest";
import { isSlugOffensive, isSlugReserved } from "@/lib/slugFilter";

describe("isSlugOffensive", () => {
  it("passes clean slugs", () => {
    expect(isSlugOffensive("my-awesome-store")).toBe(false);
  });

  it("passes Kazakh store names", () => {
    expect(isSlugOffensive("dastarkhan")).toBe(false);
  });

  it("blocks offensive English words", () => {
    expect(isSlugOffensive("fuckstore")).toBe(true);
  });

  it("blocks offensive Russian transliterated words", () => {
    expect(isSlugOffensive("blyad-store")).toBe(true);
  });

  it("blocks offensive Kazakh transliterated words", () => {
    expect(isSlugOffensive("kotaq-shop")).toBe(true);
  });

  it("blocks protected brand words", () => {
    expect(isSlugOffensive("my-dokan-store")).toBe(true);
    expect(isSlugOffensive("login-page")).toBe(true);
    expect(isSlugOffensive("admin-panel")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(isSlugOffensive("FuckStore")).toBe(true);
  });
});

describe("isSlugReserved", () => {
  it("blocks exact app-route slugs", () => {
    expect(isSlugReserved("dashboard")).toBe(true);
    expect(isSlugReserved("success")).toBe(true);
  });

  it("allows slugs that merely contain a reserved word", () => {
    expect(isSlugReserved("my-dashboard")).toBe(false);
    expect(isSlugReserved("success-shop")).toBe(false);
  });

  it("is case insensitive", () => {
    expect(isSlugReserved("Success")).toBe(true);
  });
});
