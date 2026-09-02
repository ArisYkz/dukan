import { describe, it, expect } from "vitest";
import { MAX_ADDRESS_LENGTH, buildFullAddress, isAddressTooLong } from "@/lib/address";

describe("buildFullAddress", () => {
  it("builds the full address from the form parts", () => {
    expect(buildFullAddress({ city: "Dhaka", zip: "1213", street: "Road 5", house: "House 10" }))
      .toBe("Dhaka, ZIP 1213, Road 5, House 10");
    expect(buildFullAddress({ city: "Dhaka", zip: "", street: "Road 5", house: "" }))
      .toBe("Dhaka, Road 5");
  });
});

describe("address length rule", () => {
  it("enforces the 250-character limit", () => {
    expect(MAX_ADDRESS_LENGTH).toBe(250);
    expect(isAddressTooLong("a".repeat(250))).toBe(false);
    expect(isAddressTooLong("a".repeat(251))).toBe(true);
  });
});
