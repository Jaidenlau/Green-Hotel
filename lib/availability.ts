/**
 * Availability = what Airbnb has taken + what we have taken directly.
 *
 * The rule that matters here is FAIL CLOSED. If we cannot read Airbnb's
 * calendar we must not render those nights as free, because the cost of a
 * double booking (a guest arriving to an occupied room) is far higher than the
 * cost of a guest having to send an enquiry instead. So a sync failure
 * disables booking for that room rather than quietly assuming it is empty.
 */

import { forRoom, listDirectBookings, type DirectBooking } from "./bookings";
import { addDays, nightsBetween, todayInHotelTz } from "./dates";
import { parseICal, type DateRange } from "./ical";
import { bookableRooms, getRoom, type Room } from "./rooms";

export type BlockedRange = DateRange & {
  source: "airbnb" | "direct" | "hold";
};

export type Availability = {
  roomSlug: string;
  /** Nights that cannot be booked, "YYYY-MM-DD". */
  blockedNights: string[];
  blockedRanges: BlockedRange[];
  /** First night a guest may book (today in Tokyo). */
  firstBookableNight: string;
  /** Last night a guest may book. */
  lastBookableNight: string;
  /**
   * - "live": every calendar answered, so instant booking is safe.
   * - "enquiry": the room's Airbnb calendar has not been connected yet. A
   *   deliberate setup state, not a fault — the site takes date requests by
   *   message instead of selling nights it cannot verify.
   * - "degraded": a calendar IS connected but could not be read just now.
   */
  mode: "live" | "enquiry" | "degraded";
  /** True only in "live" mode. Instant booking requires it. */
  synced: boolean;
  /** Guest-facing explanation when booking is disabled. */
  syncError?: string;
  /** When the Airbnb calendar was last read, ISO 8601. */
  lastSyncedAt: string;
};

/** How far ahead the calendar is offered. */
export const BOOKING_WINDOW_DAYS = 365;

/**
 * The single message guests see when any calendar source is unreadable. The
 * underlying cause goes to the server log — it is never useful to a guest and
 * can leak how the site is put together.
 */
const SYNC_UNAVAILABLE =
  "We can't confirm live availability at the moment.";

/**
 * Shown before the Airbnb calendar has been connected. Deliberately not an
 * error: at this stage the site is a working enquiry site, and saying
 * "something went wrong" about a step nobody has taken yet would be a lie.
 */
const NOT_CONNECTED_YET =
  "We confirm dates by message. Choose the nights you want and send us a request — we'll reply the same day.";

const ICAL_CACHE_TTL_MS = 5 * 60_000;
const ICAL_FETCH_TIMEOUT_MS = 10_000;

type IcalCacheEntry = { at: number; ranges: DateRange[] };
const icalCache = new Map<string, IcalCacheEntry>();

async function fetchAirbnbCalendar(
  room: Room,
): Promise<{ ranges: DateRange[]; error?: string; unconfigured?: boolean }> {
  const url = process.env[room.airbnbIcalEnvVar];

  if (!url) {
    // Nobody has connected this room's calendar yet. Still no instant booking
    // — we cannot verify a night we cannot see — but this is a setup state,
    // not a failure, and the site says so in those terms.
    return { ranges: [], unconfigured: true };
  }

  const cached = icalCache.get(room.slug);
  if (cached && Date.now() - cached.at < ICAL_CACHE_TTL_MS) {
    return { ranges: cached.ranges };
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(ICAL_FETCH_TIMEOUT_MS),
      headers: { Accept: "text/calendar, text/plain" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Airbnb returned HTTP ${response.status}`);
    }
    const text = await response.text();
    if (!text.includes("BEGIN:VCALENDAR")) {
      throw new Error("Airbnb did not return a calendar file");
    }
    const ranges = parseICal(text);
    icalCache.set(room.slug, { at: Date.now(), ranges });
    return { ranges };
  } catch (error) {
    console.error(`[availability] ${room.slug}: Airbnb calendar fetch failed`, error);
    // Serve the last good copy if we have one — a brief blip shouldn't take
    // the booking form offline.
    if (cached) return { ranges: cached.ranges };
    return { ranges: [], error: SYNC_UNAVAILABLE };
  }
}

export async function getAvailability(
  roomSlug: string,
  options: { fresh?: boolean } = {},
): Promise<Availability> {
  const room = getRoom(roomSlug);
  if (!room) throw new Error(`Unknown room: ${roomSlug}`);

  if (options.fresh) icalCache.delete(roomSlug);

  const firstBookableNight = todayInHotelTz();
  const lastBookableNight = addDays(firstBookableNight, BOOKING_WINDOW_DAYS);

  const errors: string[] = [];
  const blockedRanges: BlockedRange[] = [];

  const [airbnb, direct] = await Promise.all([
    fetchAirbnbCalendar(room),
    listDirectBookings({ fresh: options.fresh }).catch((error: unknown) => {
      console.error("[availability] direct bookings unreadable", error);
      errors.push(SYNC_UNAVAILABLE);
      return [] as DirectBooking[];
    }),
  ]);

  if (airbnb.error) errors.push(airbnb.error);
  const unconfigured = Boolean(airbnb.unconfigured);

  for (const range of airbnb.ranges) {
    blockedRanges.push({ ...range, source: "airbnb" });
  }
  for (const booking of forRoom(direct, roomSlug)) {
    blockedRanges.push({
      start: booking.start,
      end: booking.end,
      summary: booking.summary,
      uid: booking.uid,
      source: booking.status === "held" ? "hold" : "direct",
    });
  }

  const nights = new Set<string>();
  for (const range of blockedRanges) {
    for (const night of nightsBetween(range.start, range.end)) {
      if (night >= firstBookableNight && night <= lastBookableNight) {
        nights.add(night);
      }
    }
  }

  // A real failure outranks "not set up yet": if one calendar is broken we
  // must not present the room as merely awaiting configuration.
  const mode: Availability["mode"] = errors.length
    ? "degraded"
    : unconfigured
      ? "enquiry"
      : "live";

  return {
    roomSlug,
    blockedNights: [...nights].sort(),
    blockedRanges,
    firstBookableNight,
    lastBookableNight,
    mode,
    synced: mode === "live",
    // One message per mode. The specifics of a failure are in the server log;
    // a guest can only act on "send us a message", so that is what we say.
    syncError:
      mode === "live"
        ? undefined
        : mode === "enquiry"
          ? NOT_CONNECTED_YET
          : SYNC_UNAVAILABLE,
    lastSyncedAt: new Date().toISOString(),
  };
}

/** True once at least one bookable room has its Airbnb calendar connected. */
export function calendarConnected(): boolean {
  return bookableRooms().some((room) => Boolean(process.env[room.airbnbIcalEnvVar]));
}

export type StayCheck =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * The single gate every booking passes through. The UI calls it to grey out
 * the button; the checkout route calls it again with fresh data before taking
 * any money, because the browser's copy of the calendar may be minutes old.
 */
export function validateStay(
  room: Room,
  availability: Availability,
  checkIn: string,
  checkOut: string,
): StayCheck {
  if (!room.bookable) {
    return { ok: false, reason: "This room is not available to book yet." };
  }
  if (checkIn >= checkOut) {
    return { ok: false, reason: "Check-out must be after check-in." };
  }
  if (checkIn < availability.firstBookableNight) {
    return { ok: false, reason: "Check-in cannot be in the past." };
  }
  if (checkOut > addDays(availability.lastBookableNight, 1)) {
    return {
      ok: false,
      reason: `We only take bookings up to ${BOOKING_WINDOW_DAYS} days ahead.`,
    };
  }

  const nights = nightsBetween(checkIn, checkOut);
  if (nights.length < room.minNights) {
    return {
      ok: false,
      reason: `This room has a ${room.minNights}-night minimum stay.`,
    };
  }
  if (nights.length > room.maxNights) {
    return {
      ok: false,
      reason: `Stays longer than ${room.maxNights} nights need to be arranged by message.`,
    };
  }

  if (!availability.synced) {
    return {
      ok: false,
      reason:
        availability.syncError ??
        "We can't confirm availability right now. Please send us an enquiry.",
    };
  }

  const blocked = new Set(availability.blockedNights);
  const clash = nights.find((night) => blocked.has(night));
  if (clash) {
    return { ok: false, reason: `Sorry — ${clash} is already booked.` };
  }

  return { ok: true };
}
