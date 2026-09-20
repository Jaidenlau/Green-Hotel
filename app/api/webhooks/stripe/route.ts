/**
 * Stripe webhook. The booking itself is already recorded — a paid session IS
 * the booking — so this route exists to invalidate the availability cache the
 * moment money lands, and to tell the owner a booking came in.
 */

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { BOOKING_METADATA_KEY, clearBookingCache } from "@/lib/bookings";
import { sendMail } from "@/lib/email";
import { formatHuman } from "@/lib/dates";
import { getRoom } from "@/lib/rooms";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  // The raw body is required: any re-serialisation breaks the signature.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch (error) {
    console.error("[webhook] signature", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Any of these change which nights are free.
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.expired" ||
    event.type === "charge.refunded"
  ) {
    clearBookingCache();
  }

  if (event.type === "checkout.session.completed") {
    await notifyOwner(event.data.object);
  }

  return NextResponse.json({ received: true });
}

async function notifyOwner(session: Stripe.Checkout.Session): Promise<void> {
  const meta = session.metadata ?? {};
  if (meta[BOOKING_METADATA_KEY] !== "1") return;

  const to = process.env.OWNER_EMAIL;
  if (!to) return;

  const room = getRoom(meta.roomSlug ?? "");
  const lines = [
    `New direct booking for ${room?.name ?? meta.roomSlug}.`,
    "",
    `Guest:      ${meta.guestName ?? "—"}`,
    `Email:      ${session.customer_details?.email ?? "—"}`,
    `Guests:     ${meta.guests ?? "—"}`,
    `Check-in:   ${meta.checkIn ? formatHuman(meta.checkIn) : "—"}`,
    `Check-out:  ${meta.checkOut ? formatHuman(meta.checkOut) : "—"}`,
    `Paid:       ¥${(session.amount_total ?? 0).toLocaleString("en-US")}`,
    "",
    `Stripe session: ${session.id}`,
    "",
    "These nights are now blocked on this site and in the calendar feed Airbnb imports.",
    "To cancel, refund the payment in the Stripe dashboard — that frees the dates automatically.",
  ];

  await sendMail({
    to,
    subject: `Booking: ${room?.name ?? meta.roomSlug} — ${meta.checkIn} to ${meta.checkOut}`,
    text: lines.join("\n"),
    replyTo: session.customer_details?.email ?? undefined,
  });
}
