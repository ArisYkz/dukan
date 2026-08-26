import { describe, it, expect, beforeEach, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";

// Module under test
import {
  fetchStoreProducts,
  fetchActiveProducts,
  countActiveProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUpdateCategory,
  bulkUpdatePrice,
  bulkUpdateStock,
  bulkDeleteProducts,
} from "@/services/productService";

// ─── Mocks ───────────────────────────────────────────────────────
// Shared mutable response container for the supabase chain.
const mockResponse = vi.hoisted(() => ({ data: null, error: null, count: null }));

vi.mock("@/integrations/supabase/client", () => {
  const thenable = () => ({
    then: (onfulfilled: any) =>
      Promise.resolve(mockResponse).then(onfulfilled),
  });

  const chain = () => {
    const c: any = {};
    c.select = vi.fn(() => c);
    c.eq = vi.fn(() => c);
    c.not = vi.fn(() => c);
    c.order = vi.fn(() => c);
    c.range = vi.fn(() => c);
    c.in = vi.fn(() => c);
    c.or = vi.fn(() => c);
    c.maybeSingle = vi.fn(() => thenable());
    c.single = vi.fn(() => thenable());
    c.then = thenable().then.bind(thenable());
    // insert needs to support .select("id") chaining
    c.insert = vi.fn(() => ({
      select: vi.fn(() => thenable()),
      then: thenable().then.bind(thenable()),
    }));
    c.update = vi.fn(() => {
      const sc: any = {};
      sc.eq = vi.fn(() => sc);
      sc.in = vi.fn(() => thenable());
      sc.then = thenable().then.bind(thenable());
      return sc;
    });
    c.delete = vi.fn(() => ({
      eq: vi.fn(() => thenable()),
      in: vi.fn(() => thenable()),
    }));
    c.upsert = vi.fn(() => thenable());
    return c;
  };

  return {
    supabase: {
      from: vi.fn(() => chain()),
      rpc: vi.fn(),
      auth: { getSession: vi.fn() },
      storage: { from: vi.fn(() => ({ remove: vi.fn() })) },
    },
  };
});

// Mock storageCleanup so deleteProduct doesn't actually try to remove files.
vi.mock("@/lib/storageCleanup", () => ({
  deleteStorageFile: vi.fn().mockResolvedValue(undefined),
  deleteStorageFiles: vi.fn().mockResolvedValue(undefined),
  extractBucketAndPath: vi.fn(() => ({ bucket: "product-images", path: "test.jpg" })),
}));

// ─── Fixtures ────────────────────────────────────────────────────
const fakeProduct = {
  id: "p1",
  store_id: "store-1",
  name: "Test Product",
  price: 1500,
  description: "A test product",
  stock: 10,
  image_url: "https://example.com/img.jpg",
  category: "Electronics",
  sort_order: 0,
  tags: null,
  barcode_gtin: null,
  ntin: null,
  country_of_origin: null,
  low_stock_threshold: 0,
  created_at: "2025-01-01T00:00:00Z",
};

// ─── Tests ───────────────────────────────────────────────────────
describe("productService", () => {
  beforeEach(() => {
    mockResponse.data = null;
    mockResponse.error = null;
    mockResponse.count = null;
  });

  // ── fetchStoreProducts ─────────────────────────────────────────
  describe("fetchStoreProducts", () => {
    it("returns products for a store", async () => {
      mockResponse.data = [fakeProduct];

      const result = await fetchStoreProducts("store-1");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Test Product");
      expect(supabase.from).toHaveBeenCalledWith("products");
    });

    it("returns an empty array when there are no products", async () => {
      mockResponse.data = [];

      const result = await fetchStoreProducts("store-empty");

      expect(result).toEqual([]);
    });

    it("returns an empty array when data is null", async () => {
      mockResponse.data = null;

      const result = await fetchStoreProducts("store-null");

      expect(result).toEqual([]);
    });

    it("filters by search term when provided", async () => {
      mockResponse.data = [fakeProduct];

      await fetchStoreProducts("store-1", "test");

      expect(supabase.from).toHaveBeenCalledWith("products");
    });

    it("throws when Supabase returns an error", async () => {
      mockResponse.error = new Error("DB error");

      await expect(fetchStoreProducts("store-err")).rejects.toThrow("DB error");
    });
  });

  // ── fetchActiveProducts ────────────────────────────────────────
  describe("fetchActiveProducts", () => {
    it("returns paginated products sorted by created_at desc", async () => {
      mockResponse.data = [fakeProduct];

      const result = await fetchActiveProducts("store-1", 0, 19);

      expect(result).toHaveLength(1);
      expect(supabase.from).toHaveBeenCalledWith("products");
    });

    it("returns an empty array for a store with no active products", async () => {
      mockResponse.data = [];

      const result = await fetchActiveProducts("store-1", 0, 19);

      expect(result).toEqual([]);
    });

    it("accepts a search term and sort options", async () => {
      mockResponse.data = [fakeProduct];

      const result = await fetchActiveProducts(
        "store-1",
        0,
        19,
        "test",
        "price",
        "asc",
      );

      expect(result).toHaveLength(1);
    });

    it("throws when Supabase returns an error", async () => {
      mockResponse.error = new Error("DB error");

      await expect(
        fetchActiveProducts("store-1", 0, 19),
      ).rejects.toThrow("DB error");
    });
  });

  // ── countActiveProducts ────────────────────────────────────────
  describe("countActiveProducts", () => {
    it("returns the count of active products", async () => {
      mockResponse.count = 5;

      const result = await countActiveProducts("store-1");

      expect(result).toBe(5);
      expect(supabase.from).toHaveBeenCalledWith("products");
    });

    it("returns 0 when count is null", async () => {
      mockResponse.count = null;

      const result = await countActiveProducts("store-1");

      expect(result).toBe(0);
    });

    it("accepts a search term", async () => {
      mockResponse.count = 2;

      const result = await countActiveProducts("store-1", "phone");

      expect(result).toBe(2);
    });

    it("throws when Supabase returns an error", async () => {
      mockResponse.error = new Error("DB error");

      await expect(countActiveProducts("store-1")).rejects.toThrow("DB error");
    });
  });

  // ── createProduct ──────────────────────────────────────────────
  describe("createProduct", () => {
    it("creates a product and returns its id", async () => {
      // First call: upsertCategories via dynamic import (supabase.from("categories").upsert)
      // Second call: insert the product
      // Both resolve through mockResponse.
      mockResponse.data = [{ id: "new-id" }];
      mockResponse.error = null;

      const result = await createProduct({
        store_id: "store-1",
        name: "New Product",
        price: 2000,
        description: "desc",
        stock: 5,
        image_url: null,
        category: "Electronics",
      });

      expect(result.id).toBe("new-id");
      expect(result.error).toBeNull();
    });

    it("creates a product without a category", async () => {
      mockResponse.data = [{ id: "new-id-2" }];

      const result = await createProduct({
        store_id: "store-1",
        name: "No Cat",
        price: 500,
        description: null,
        stock: 1,
        image_url: null,
        category: null,
      });

      expect(result.id).toBe("new-id-2");
    });

    it("returns an error when required fields are missing (insert fails)", async () => {
      mockResponse.error = new Error('null value in column "name" violates not-null constraint');
      mockResponse.data = null;

      const result = await createProduct({
        store_id: "store-1",
        name: "",
        price: 0,
        description: null,
        stock: 0,
        image_url: null,
        category: null,
      });

      expect(result.id).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it("returns an error when inserted data is empty", async () => {
      mockResponse.data = [];
      mockResponse.error = null;

      const result = await createProduct({
        store_id: "store-1",
        name: "Empty insert",
        price: 100,
        description: null,
        stock: 1,
        image_url: null,
        category: null,
      });

      expect(result.id).toBeNull();
    });
  });

  // ── updateProduct ──────────────────────────────────────────────
  describe("updateProduct", () => {
    it("updates product fields", async () => {
      // First call: fetch existing product image_url
      mockResponse.data = { image_url: "https://example.com/old.jpg" };
      // Second call: update
      mockResponse.error = null;

      const result = await updateProduct("p1", {
        store_id: "store-1",
        name: "Updated",
        price: 2500,
        description: "updated desc",
        stock: 8,
        image_url: "https://example.com/new.jpg",
        category: "Electronics",
      });

      expect(result.error).toBeNull();
    });

    it("does not fetch old image when image_url is unchanged", async () => {
      mockResponse.error = null;

      const result = await updateProduct("p1", {
        store_id: "store-1",
        name: "Updated",
        price: 2000,
        description: null,
        stock: 5,
        image_url: undefined as any,
        category: null,
      });

      expect(result.error).toBeNull();
    });

    it("returns an error when update fails", async () => {
      mockResponse.data = { image_url: null };
      mockResponse.error = new Error("Update failed");

      const result = await updateProduct("p1", {
        store_id: "store-1",
        name: "Fail",
        price: 0,
        description: null,
        stock: 0,
        image_url: null,
        category: null,
      });

      expect(result.error).toBeTruthy();
    });
  });

  // ── deleteProduct ──────────────────────────────────────────────
  describe("deleteProduct", () => {
    let origImpl: any;

    beforeEach(() => {
      origImpl = (supabase.from as any).getMockImplementation();
      (supabase.from as any).mockClear();
    });

    afterEach(() => {
      (supabase.from as any).mockImplementation(origImpl);
    });

    it("successfully deletes a product with cascade cleanup", async () => {
      // deleteProduct makes 4 sequential supabase calls:
      // 1. select product (single)
      // 2. select product_images
      // 3. delete product_images
      // 4. delete product
      const chainResults: any[] = [
        { data: { id: "p1", image_url: "https://img.jpg", store_id: "s1" }, error: null },
        { data: [{ image_url: "https://gallery.jpg" }], error: null },
        { data: null, error: null },
        { data: null, error: null },
      ];
      let callIndex = 0;
      (supabase.from as any).mockImplementation(() => {
        const idx = callIndex++;
        const chain: any = {};
        chain.select = vi.fn(() => chain);
        chain.eq = vi.fn(() => chain);
        chain.single = vi.fn(() => ({
          then: (onfulfilled: any) =>
            Promise.resolve(chainResults[idx]).then(onfulfilled),
        }));
        chain.then = (onfulfilled: any) =>
          Promise.resolve(chainResults[idx]).then(onfulfilled);
        chain.delete = vi.fn(() => ({
          eq: vi.fn(() => ({
            then: (onfulfilled: any) =>
              Promise.resolve(chainResults[idx]).then(onfulfilled),
          })),
        }));
        return chain;
      });

      const result = await deleteProduct("p1");

      expect(result.success).toBe(true);
      expect(supabase.from).toHaveBeenCalledTimes(4);
    });

    it("returns error when product is not found", async () => {
      // Simulate supabase returning { data: null, error: null } (record missing)
      (supabase.from as any).mockImplementation(() => {
        const chain: any = {};
        chain.select = vi.fn(() => chain);
        chain.eq = vi.fn(() => chain);
        chain.single = vi.fn(() => ({
          then: (onfulfilled: any) =>
            Promise.resolve({ data: null, error: null }).then(onfulfilled),
        }));
        chain.then = (onfulfilled: any) =>
          Promise.resolve({ data: null, error: null }).then(onfulfilled);
        chain.delete = vi.fn(() => ({
          eq: vi.fn(() => ({
            then: (onfulfilled: any) =>
              Promise.resolve({ data: null, error: null }).then(onfulfilled),
          })),
        }));
        return chain;
      });

      const result = await deleteProduct("nonexistent");

      expect(result.success).toBe(false);
      expect(result.message).toContain("Product not found");
    });

    it("handles foreign key constraint error code 23503", async () => {
      let callIndex = 0;
      (supabase.from as any).mockImplementation(() => {
        const idx = callIndex++;
        const chain: any = {};
        chain.select = vi.fn(() => chain);
        chain.eq = vi.fn(() => chain);
        chain.single = vi.fn(() =>
          idx === 0
            ? {
                then: (onfulfilled: any) =>
                  Promise.resolve({
                    data: { id: "p1", image_url: null, store_id: "s1" },
                    error: null,
                  }).then(onfulfilled),
              }
            : { then: (onfulfilled: any) => Promise.resolve({ data: null, error: null }).then(onfulfilled) },
        );
        chain.then = (onfulfilled: any) =>
          Promise.resolve({ data: null, error: null }).then(onfulfilled);
        chain.delete = vi.fn(() => ({
          eq: vi.fn(() => ({
            then: (onfulfilled: any) =>
              Promise.resolve({
                data: null,
                error: { code: "23503", message: "foreign key violation" },
              }).then(onfulfilled),
          })),
        }));
        return chain;
      });

      const result = await deleteProduct("p1");

      expect(result.success).toBe(false);
      expect(result.isConstraintError).toBe(true);
      expect(result.message).toContain("existing order records");
    });
  });

  // ── bulkUpdateCategory ─────────────────────────────────────────
  describe("bulkUpdateCategory", () => {
    it("updates category for multiple products", async () => {
      mockResponse.error = null;

      const result = await bulkUpdateCategory(["p1", "p2"], "Electronics");

      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith("products");
    });

    it("sets category to null when null is passed", async () => {
      mockResponse.error = null;

      const result = await bulkUpdateCategory(["p1", "p2"], null);

      expect(result.error).toBeNull();
    });
  });

  // ── bulkUpdatePrice ────────────────────────────────────────────
  describe("bulkUpdatePrice", () => {
    it("updates price for multiple products", async () => {
      mockResponse.error = null;

      const result = await bulkUpdatePrice(["p1", "p2"], 2500);

      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith("products");
    });
  });

  // ── bulkUpdateStock ────────────────────────────────────────────
  describe("bulkUpdateStock", () => {
    it("updates stock for multiple products", async () => {
      mockResponse.error = null;

      const result = await bulkUpdateStock(["p1", "p2"], 15);

      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith("products");
    });
  });

  // ── bulkDeleteProducts ─────────────────────────────────────────
  describe("bulkDeleteProducts", () => {
    it("deletes multiple products", async () => {
      mockResponse.error = null;

      const result = await bulkDeleteProducts(["p1", "p2"]);

      expect(result.error).toBeNull();
      expect(result.isConstraintError).toBe(false);
      expect(supabase.from).toHaveBeenCalledWith("products");
    });

    it("returns constraint error code 23503", async () => {
      mockResponse.error = { code: "23503", message: "foreign key violation" };

      const result = await bulkDeleteProducts(["p1"]);

      expect(result.isConstraintError).toBe(true);
      expect(result.message).toContain("existing order records");
    });

    it("returns non-constraint errors", async () => {
      mockResponse.error = new Error("Generic DB error");

      const result = await bulkDeleteProducts(["p1"]);

      expect(result.error).toBeTruthy();
      expect(result.isConstraintError).toBe(false);
    });
  });
});
