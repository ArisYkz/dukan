import { describe, it, expect, beforeEach, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";

// The module under test
import {
  fetchStoreBySlug,
  fetchUserStores,
  createStore,
  updateStoreBranding,
  checkSlugAvailability,
  incrementStoreViews,
  checkStorePaused,
  fetchUserProfile,
  updateUserProfile,
} from "@/services/storeService";

// ─── Supabase mock ───────────────────────────────────────────────
// Shared mutable container so each test controls what the chain resolves to.
const mockResponse = vi.hoisted(() => ({ data: null, error: null }));

vi.mock("@/integrations/supabase/client", () => {
  // Build a thenable that reads the current mockResponse.
  const thenable = () => ({
    then: (onfulfilled: any) =>
      Promise.resolve(mockResponse).then(onfulfilled),
  });

  // A full query-builder chain.
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
    // Make the chain itself thenable (used for direct await patterns)
    c.then = thenable().then.bind(thenable());
    // Mutating methods
    c.insert = vi.fn(() => thenable());
    c.update = vi.fn(() => ({
      eq: vi.fn(() => thenable()),
    }));
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

// ─── Tests ───────────────────────────────────────────────────────
describe("storeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse.data = null;
    mockResponse.error = null;
  });

  // ── fetchStoreBySlug ───────────────────────────────────────────
  describe("fetchStoreBySlug", () => {
    it("returns store data for an existing slug", async () => {
      const fakeStore = { id: "s1", name: "My Store", slug: "my-store" };
      mockResponse.data = fakeStore;

      const result = await fetchStoreBySlug("my-store");

      expect(result).toEqual(fakeStore);
      expect(supabase.from).toHaveBeenCalledWith("stores");
    });

    it("returns null for a non-existent slug", async () => {
      mockResponse.data = null;

      const result = await fetchStoreBySlug("non-existent");

      expect(result).toBeNull();
    });

    it("throws when Supabase returns an error", async () => {
      mockResponse.error = new Error("DB error");

      await expect(fetchStoreBySlug("broken")).rejects.toThrow("DB error");
    });
  });

  // ── fetchUserStores ────────────────────────────────────────────
  describe("fetchUserStores", () => {
    it("returns a list of stores for a user with memberships", async () => {
      const fakeMemberships = [
        { store_id: "s1", stores: { id: "s1", name: "Store A" } },
        { store_id: "s2", stores: { id: "s2", name: "Store B" } },
      ];
      mockResponse.data = fakeMemberships;

      const result = await fetchUserStores("user-1");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: "s1", name: "Store A" });
      expect(supabase.from).toHaveBeenCalledWith("store_members");
    });

    it("returns an empty array for a user with no stores", async () => {
      mockResponse.data = [];

      const result = await fetchUserStores("user-empty");

      expect(result).toEqual([]);
    });

    it("returns an empty array when memberships data is null", async () => {
      mockResponse.data = null;

      const result = await fetchUserStores("user-null");

      expect(result).toEqual([]);
    });

    it("throws when Supabase returns an error", async () => {
      mockResponse.error = new Error("DB error");

      await expect(fetchUserStores("user-err")).rejects.toThrow("DB error");
    });
  });

  // ── createStore ────────────────────────────────────────────────
  describe("createStore", () => {
    it("creates a store and returns no error", async () => {
      mockResponse.error = null;

      const result = await createStore("user-1", "New Store", "new-store");

      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith("stores");
    });

    it("returns an error on duplicate slug", async () => {
      const dupError = new Error('duplicate key value violates unique constraint "stores_slug_key"');
      mockResponse.error = dupError;

      const result = await createStore("user-1", "New Store", "taken-slug");

      expect(result.error).toBe(dupError);
    });
  });

  // ── updateStoreBranding ────────────────────────────────────────
  describe("updateStoreBranding", () => {
    it("updates branding fields", async () => {
      mockResponse.error = null;

      const result = await updateStoreBranding("s1", {
        name: "Updated",
        description: "New description",
      });

      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith("stores");
    });

    it("returns an error when the update fails", async () => {
      mockResponse.error = new Error("Update failed");

      const result = await updateStoreBranding("s1", { name: "Fail" });

      expect(result.error).toBeInstanceOf(Error);
    });
  });

  // ── checkSlugAvailability ──────────────────────────────────────
  describe("checkSlugAvailability", () => {
    it("returns true when slug is taken (data found)", async () => {
      mockResponse.data = { id: "other-store" };

      const result = await checkSlugAvailability("taken", "my-store");

      expect(result).toBe(true);
    });

    it("returns false when slug is available (no data)", async () => {
      mockResponse.data = null;

      const result = await checkSlugAvailability("free", "my-store");

      expect(result).toBe(false);
    });
  });

  // ── incrementStoreViews ────────────────────────────────────────
  describe("incrementStoreViews", () => {
    it("calls the RPC and does not throw on success", async () => {
      (supabase.rpc as any).mockResolvedValue(undefined);

      await expect(
        incrementStoreViews("s1"),
      ).resolves.toBeUndefined();

      expect(supabase.rpc).toHaveBeenCalledWith("increment_store_views", {
        _store_id: "s1",
      });
    });

    it("does NOT throw when RPC fails (fire-and-forget)", async () => {
      (supabase.rpc as any).mockRejectedValue(new Error("Network error"));

      await expect(
        incrementStoreViews("s1"),
      ).resolves.toBeUndefined();
    });
  });

  // ── checkStorePaused ───────────────────────────────────────────
  describe("checkStorePaused", () => {
    it("returns true when store is paused", async () => {
      mockResponse.data = { is_paused: true };

      const result = await checkStorePaused("s1");

      expect(result).toBe(true);
    });

    it("returns false when store is not paused", async () => {
      mockResponse.data = { is_paused: false };

      const result = await checkStorePaused("s1");

      expect(result).toBe(false);
    });

    it("returns false when data is null", async () => {
      mockResponse.data = null;

      const result = await checkStorePaused("s1");

      expect(result).toBe(false);
    });
  });

  // ── fetchUserProfile ───────────────────────────────────────────
  describe("fetchUserProfile", () => {
    it("returns profile data for an existing user", async () => {
      mockResponse.data = { display_name: "John" };

      const result = await fetchUserProfile("user-1");

      expect(result).toEqual({ display_name: "John" });
      expect(supabase.from).toHaveBeenCalledWith("profiles");
    });

    it("returns null for a user without a profile", async () => {
      mockResponse.data = null;

      const result = await fetchUserProfile("user-new");

      expect(result).toBeNull();
    });

    it("throws when Supabase returns an error", async () => {
      mockResponse.error = new Error("DB error");

      await expect(fetchUserProfile("user-err")).rejects.toThrow("DB error");
    });
  });

  // ── updateUserProfile ──────────────────────────────────────────
  describe("updateUserProfile", () => {
    it("updates the display name", async () => {
      mockResponse.error = null;

      const result = await updateUserProfile("user-1", "John Updated");

      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith("profiles");
    });

    it("returns an error when the update fails", async () => {
      mockResponse.error = new Error("Update failed");

      const result = await updateUserProfile("user-1", "Fail");

      expect(result.error).toBeInstanceOf(Error);
    });
  });
});
