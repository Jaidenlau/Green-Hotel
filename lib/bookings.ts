/**
 * Direct bookings live in Stripe, not in a database.
 *
 * A paid Checkout Session IS the booking: its metadata carries the room and
 * the dates. That keeps the deployment to a single service with nothing to
 * back up, and it gives us date holds for free — a session that is still
 * `open` means someone has the payment page in front of them right now, so we
 * block those nights until Stripe expires the session.
 *
 * Cancelling a booking is therefore just refunding it in the Stripe dashboard.
 */

import type Stripe from "stripe";
import type { DateRange } from "./ical";
import { getStripe } from "./stripe";
import { isValidDateStr, todayInHotelTz } from "./dates";

export const BOOKING_METADATA_KEY = "greenhotel_booking";

export type DirectBooking = DateRange & {
  roomSlug: string;
  guestName?: string;
  guestEmail?: string;
  status: "held" | "confirmed";
  sessionId: string;
};

type CacheEntry = { at: number; value: DirectBooking[] };
const CACHE_TTL_MS = 30_000;
const MAX_SESSIONS_SCANNED = 5_000;

let cache: CacheEntry | null = null;

/**
 * Every direct booking that still blocks a night: paid, or held by an open
 * checkout session. Refunded and cancelled bookings are excluded.
 *
 * `fresh` skips the cache — always pass it before taking money.
 */
export async function listDirectBookings(
  options: { fresh?: boolean } = {},
): Promise<DirectBooking[]> {
  if (!options.fresh && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.value;
  }

  const stripe = getStripe();
  if (!stripe) return [];

  const bookings: DirectBooking[] = [];
  // Sessions older than this can only describe stays already in the past.
  const createdAfter = Math.floor(Date.now() / 1000) - 400 * 86_400;
  let scanned = 0;

  try {
    const sessions = stripe.checkout.sessions.list({
      limit: 100,
      created: { gte: createdAfter },
      // Depth 3, so we can see whether the charge was refunded.
      expand: ["data.payment_intent.latest_charge"],
    });

    for await (const session of sessions) {
      if (++scanned > MAX_SESSIONS_SCANNED) break;
      const booking = toBooking(session);
      if (booking) bookings.push(booking);
    }
  } catch (error) {
    // A Stripe outage must not make the calendar look wide open. Reuse the
    // last good answer if we have one; otherwise let the caller fail closed.
    if (cache) return cache.value;
    throw error;
  }

  cache = { at: Date.now(), value: bookings };
  return bookings;
}

function toBooking(session: Stripe.Checkout.Session): DirectBooking | null {
  const meta = session.metadata ?? {};
  if (meta[BOOKING_METADATA_KEY] !== "1") return null;

  const roomSlug = meta.roomSlug;
  const start = meta.checkIn;
  const end = meta.checkOut;
  if (!roomSlug || !isValidDateStr(start) || !isValidDateStr(end)) return null;
  if (start >= end) return null;
  if (meta.cancelled === "true") return null;

  const base = {
    roomSlug,
    start,
    end,
    sessionId: session.id,
    uid: `${session.id}@greenhotel`,
    guestName: meta.guestName || undefined,
    guestEmail: session.customer_details?.email ?? undefined,
  };

  // Expired or abandoned checkouts release their nights.
  if (session.status === "expired") return null;

  if (session.status === "open") {
    return {
      ...base,
      status: "held",
      summary: "On hold (checkout in progress)",
    };
  }

  if (session.payment_status !== "paid") return null;
  if (isRefunded(session)) return null;

  return { ...base, status: "confirmed", summary: "Reserved (direct booking)" };
}

/** A refund in the Stripe dashboard is how the owner cancels a booking. */
function isRefunded(session: Stripe.Checkout.Session): boolean {
  const intent = session.payment_intent;
  if (!intent || typeof intent === "string") return false;
  if (intent.status === "canceled") return true;

  const charge = intent.latest_charge;
  if (!charge || typeof charge === "string") return false;
  // Treat any refund as a cancellation; partial refunds are price adjustments
  // in practice, so only a full refund frees the dates.
  return charge.refunded === true;
}

export function clearBookingCache(): void {
  cache = null;
}

/** Bookings for one room, dropping stays that have already finished. */
export function forRoom(
  bookings: DirectBooking[],
  roomSlug: string,
): DirectBooking[] {
  const today = todayInHotelTz();
  return bookings.filter((b) => b.roomSlug === roomSlug && b.end > today);
}
