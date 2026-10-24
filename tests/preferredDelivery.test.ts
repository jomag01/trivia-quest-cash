import { describe, it, expect } from "bun:test";
import { estimatedDeliveryRange, manilaToday, minDeliveryDate, preferredDeliverySchema } from "../src/lib/preferredDelivery";

describe("preferred Shop delivery date", () => {
  const schema = preferredDeliverySchema("2026-11-06");
  it("allows a date exactly 2 weeks ahead", () => expect(schema.safeParse("2026-11-06").success).toBe(true));
  it("allows a later date", () => expect(schema.safeParse("2026-12-01").success).toBe(true));
  it("keeps the delivery date optional", () => expect(schema.safeParse("").success).toBe(true));
  it("rejects dates less than 2 weeks ahead", () => expect(schema.safeParse("2026-11-05").success).toBe(false));
  it("rejects past dates", () => expect(schema.safeParse("2026-10-22").success).toBe(false));
  it("rejects nonexistent calendar dates", () => expect(schema.safeParse("2027-02-30").success).toBe(false));
  it("uses the Philippines calendar day", () => expect(manilaToday(new Date("2026-10-23T17:00:00Z"))).toBe("2026-10-24"));
  it("sets the minimum pickable date 14 days after the Manila day", () => expect(minDeliveryDate(new Date("2026-10-23T17:00:00Z"))).toBe("2026-11-07"));
  it("estimates delivery from the picked date through 3 days later", () => {
    expect(estimatedDeliveryRange("2026-11-06", new Date("2026-10-23T00:00:00Z"))).toEqual({ earliest: "2026-11-06", latest: "2026-11-09" });
  });
  it("estimates the earliest allowed window when no date is picked", () => {
    expect(estimatedDeliveryRange("", new Date("2026-10-23T00:00:00Z"))).toEqual({ earliest: "2026-11-06", latest: "2026-11-09" });
  });
});
