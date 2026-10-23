import { describe, it, expect } from "bun:test";
import { manilaToday, preferredDeliverySchema } from "../src/lib/preferredDelivery";

describe("preferred Shop delivery date", () => {
  const schema = preferredDeliverySchema("2026-10-23");
  it("allows a customer's selected future date", () => expect(schema.safeParse("2026-11-02").success).toBe(true));
  it("keeps the delivery date optional", () => expect(schema.safeParse("").success).toBe(true));
  it("rejects past dates", () => expect(schema.safeParse("2026-10-22").success).toBe(false));
  it("rejects nonexistent calendar dates", () => expect(schema.safeParse("2027-02-30").success).toBe(false));
  it("uses the Philippines calendar day", () => expect(manilaToday(new Date("2026-10-23T17:00:00Z"))).toBe("2026-10-24"));
});