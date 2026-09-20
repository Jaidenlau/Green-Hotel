/**
 * All dates in this app are plain calendar dates in the hotel's local timezone
 * (Asia/Tokyo), formatted "YYYY-MM-DD". We deliberately avoid Date arithmetic
 * with timezones: a booking for "2026-01-05" means that calendar day in Tokyo,
 * no matter where the guest's browser is.
 *
 * A stay from check-in A to check-out B occupies the NIGHTS A, A+1, ... B-1.
 * Day B is free for the next guest to check in. This matches iCal's exclusive
 * DTEND, so Airbnb's feed and ours line up without any off-by-one fudging.
 */

export const HOTEL_TIMEZONE = "Asia/Tokyo";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateStr(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  // Reject things like 2026-02-31 that pass the regex.
  return toUTCDate(value) !== null;
}

/** Parse "YYYY-MM-DD" into a Date anchored at UTC midnight, or null if invalid. */
function toUTCDate(value: string): Date | null {
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(date.getTime())) return null;
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date;
}

export function formatDateStr(date: Date): string {
  return [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function addDays(value: string, days: number): string {
  const date = toUTCDate(value);
  if (!date) throw new Error(`Invalid date: ${value}`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateStr(date);
}

/** Whole days from `from` to `to`. Negative if `to` precedes `from`. */
export function diffDays(from: string, to: string): number {
  const a = toUTCDate(from);
  const b = toUTCDate(to);
  if (!a || !b) throw new Error(`Invalid date range: ${from}..${to}`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Today's calendar date in the hotel's timezone. */
export function todayInHotelTz(): string {
  // en-CA renders as YYYY-MM-DD, which is exactly our wire format.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: HOTEL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** The nights occupied by a stay: [checkIn, checkOut) as individual dates. */
export function nightsBetween(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) {
    nights.push(d);
    if (nights.length > 400) break; // guard against a malformed feed
  }
  return nights;
}

export function formatHuman(value: string): string {
  const date = toUTCDate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
