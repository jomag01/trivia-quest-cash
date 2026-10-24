import { z } from "zod";

export const MIN_DELIVERY_ADVANCE_DAYS = 14;

export function manilaToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function addCalendarDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function minDeliveryDate(now = new Date()): string {
  return addCalendarDays(manilaToday(now), MIN_DELIVERY_ADVANCE_DAYS);
}

export function preferredDeliverySchema(minDate = minDeliveryDate()) {
  return z.string().refine(value => {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= minDate;
  }, `Choose a delivery date at least ${MIN_DELIVERY_ADVANCE_DAYS} days (2 weeks) in advance`);
}

/** Estimated arrival window: the picked date through 3 days after it. Without a pick, the earliest allowed window. */
export function estimatedDeliveryRange(pickedDate: string, now = new Date()): { earliest: string; latest: string } {
  const earliest = pickedDate || minDeliveryDate(now);
  return { earliest, latest: addCalendarDays(earliest, 3) };
}

export function formatDeliveryDate(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-PH", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
}
