import { z } from "zod";

export function manilaToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function preferredDeliverySchema(today = manilaToday()) {
  return z.string().refine(value => {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= today;
  }, "Choose a valid delivery date today or later");
}

export function formatDeliveryDate(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-PH", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
}