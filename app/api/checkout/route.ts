import { NextResponse } from "next/server";
import { getAvailability, validateStay } from "@/lib/availability";
import { BOOKING_METADATA_KEY, clearBookingCache } from "@/lib/bookings";
import { diffDays, formatHuman, isValidDateStr } from "@/lib/dates";
import { getRoom, quoteStay } from "@/lib/rooms";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Stripe requires a checkout session to live at least 30 minutes. */
const HOLD_MINUTES = 30;

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Online payment isn't set up yet. Please send us an enquiry." },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const roomSlug = String(body.roomSlug ?? "");
  const checkIn = body.checkIn;
  const checkOut = body.checkOut;
  const guestName = String(body.guestName ?? "").trim().slice(0, 100);
  const guests = Number(body.guests ?? 1);

  const room = getRoom(roomSlug);
  if (!room) {
    return NextResponse.json({ error: "Unknown room." }, { status: 404 });
  }
  if (!isValidDateStr(checkIn) || !isValidDateStr(checkOut)) {
    return NextResponse.json({ error: "Invalid dates." }, { status: 400 });
  }
  if (!guestName) {
    return NextResponse.json({ error: "Please give your name." }, { status: 400 });
  }
  if (!Number.isInteger(guests) || guests < 1 || guests > (room.maxGuests ?? 2)) {
    return NextResponse.json(
      { error: `This room sleeps up to ${room.maxGuests ?? 2} guests.` },
      { status: 400 },
    );
  }

  // Re-check against live data. The browser's calendar can be minutes old, and
  // those minutes are exactly when a double booking happens.
  let availability;
  try {
    availability = await getAvailability(roomSlug, { fresh: true });
  } catch (error) {
    console.error("[checkout] availability", error);
    return NextResponse.json(
      { error: "We can't confirm availability right now. Please try again shortly." },
      { status: 503 },
    );
  }

  const check = validateStay(room, availability, checkIn, checkOut);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 409 });
  }

  const nights = diffDays(checkIn, checkOut);
  const quote = quoteStay(room, nights);
  const origin = siteOrigin(request);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // JPY is zero-decimal: unit_amount is whole yen, not sen.
      line_items: [
        {
          quantity: nights,
          price_data: {
            currency: "jpy",
            unit_amount: quote.discountedNightlyRateJpy,
            product_data: {
              name: `${room.name} — ${nights} night${nights === 1 ? "" : "s"}`,
              description: `${formatHuman(checkIn)} to ${formatHuman(checkOut)}`,
            },
          },
        },
        ...(quote.cleaningFeeJpy > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: "jpy" as const,
                  unit_amount: quote.cleaningFeeJpy,
                  product_data: { name: "Cleaning fee" },
                },
              },
            ]
          : []),
      ],
      expires_at: Math.floor(Date.now() / 1000) + HOLD_MINUTES * 60,
      success_url: `${origin}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/rooms/${room.slug}?checkout=cancelled`,
      metadata: {
        [BOOKING_METADATA_KEY]: "1",
        roomSlug: room.slug,
        checkIn,
        checkOut,
        guestName,
        guests: String(guests),
      },
      // Copied onto the PaymentIntent so the dates are visible on the payment
      // itself in the Stripe dashboard, not just on the session.
      payment_intent_data: {
        description: `${room.name}: ${checkIn} to ${checkOut} (${guestName})`,
        metadata: {
          roomSlug: room.slug,
          checkIn,
          checkOut,
          guestName,
        },
      },
    });

    // The new session holds these nights; drop the cached answer so the next
    // visitor sees the hold immediately.
    clearBookingCache();

    if (!session.url) throw new Error("Stripe returned no checkout URL");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[checkout] stripe", error);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again or send us an enquiry." },
      { status: 502 },
    );
  }
}

function siteOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export const runtime = "nodejs";
