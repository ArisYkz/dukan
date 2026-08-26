import { describe, it, expect } from "vitest";
import { normalizeKazakh, normalizeCyrillic } from "@/lib/normalizeKazakh";

describe("normalizeKazakh", () => {
  it("handles empty string", () => {
    expect(normalizeKazakh("")).toBe("");
  });

  it("converts Kazakh-specific Cyrillic to Latin", () => {
    expect(normalizeKazakh("ә")).toBe("a"); // ә
    expect(normalizeKazakh("қ")).toBe("q"); // қ
    expect(normalizeKazakh("ң")).toBe("n"); // ң
    expect(normalizeKazakh("ө")).toBe("o"); // ө
    expect(normalizeKazakh("ұ")).toBe("u"); // ұ
    expect(normalizeKazakh("ү")).toBe("u"); // ү
    expect(normalizeKazakh("і")).toBe("i"); // і
  });

  it("handles uppercase Kazakh letters to lowercase", () => {
    expect(normalizeKazakh("Қ")).toBe("q"); // Қ
    expect(normalizeKazakh("Ә")).toBe("a"); // Ә
    expect(normalizeKazakh("Ұ")).toBe("u"); // Ұ
  });

  it("leaves Latin text unchanged", () => {
    expect(normalizeKazakh("hello")).toBe("hello");
  });

  it("lowercases the result", () => {
    expect(normalizeKazakh("ABC")).toBe("abc");
  });
});

describe("normalizeCyrillic", () => {
  it("converts common Russian Cyrillic to Latin", () => {
    expect(normalizeCyrillic("привет")).toBe("privet");
  });

  it("handles yo mapping", () => {
    expect(normalizeCyrillic("ё")).toBe("yo"); // ё
  });

  it("handles shcha mapping", () => {
    expect(normalizeCyrillic("щ")).toBe("shch"); // щ
  });

  it("handles hard and soft signs as empty", () => {
    expect(normalizeCyrillic("ъ")).toBe(""); // ъ
    expect(normalizeCyrillic("ь")).toBe(""); // ь
  });

  it("handles ya and yu", () => {
    expect(normalizeCyrillic("я")).toBe("ya"); // я
    expect(normalizeCyrillic("ю")).toBe("yu"); // ю
  });

  it("lowercases the result", () => {
    expect(normalizeCyrillic("ПРИВЕТ")).toBe("privet");
  });
});
