import Link from "next/link";
import type { Metadata } from "next";
import { formatHuman } from "@/lib/dates";
import { HOTEL, getRoom } from "@/lib/rooms";
import { getStripe } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Booking confirmed",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ session_id?: string }> };

export default async function SuccessPage({ searchParams }: Props) {
  const { session_id: sessionId } = await searchParams;
  const details = sessionId ? await loadBooking(sessionId) : null;

  return (
    <div className="shell flex min-h-[60vh] items-center py-16">
      <div className="mx-auto max-w-xl text-center">
        <span
          aria-hidden="true"
          className="mx-auto grid size-14 place-items-center rounded-full bg-forest-soft text-2xl text-forest"
        >
          ✓
        </span>
        <h1 className="mt-6 font-display text-4xl">
          {details ? "You're booked in" : "Thank you"}
        </h1>

        {details ? (
          <>
            <p className="mt-4 text-ink-soft">
              We&apos;ve reserved <strong className="text-ink">{details.roomName}</strong>{" "}
              for you. A receipt is on its way to{" "}
              <strong className="text-ink">{details.email ?? "your email"}</strong>,
              and we&apos;ll send check-in instructions and the lockbox code a
              few days before you arrive.
            </p>
            <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line text-left">
              <Cell label="Check-in" value={`${details.checkIn} · from ${HOTEL.checkInFrom}`} />
              <Cell label="Check-out" value={`${details.checkOut} · by ${HOTEL.checkOutBy}`} />
              <Cell label="Guests" value={details.guests} />
              <Cell label="Paid" value={details.total} />
            </dl>
          </>
        ) : (
          <p className="mt-4 text-ink-soft">
            If your payment went through you&apos;ll have a receipt by email
            shortly. If anything looks wrong, message us and we&apos;ll sort it
            out.
          </p>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-forest px-5 py-3 font-medium text-paper transition hover:bg-forest-dark"
          >
            Back to the site
          </Link>
          <Link
            href="/about#contact"
            className="rounded-xl border border-line px-5 py-3 font-medium text-ink-soft transition hover:border-forest hover:text-forest-dark"
          >
            Message us
          </Link>
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper-raised px-4 py-4">
      <dt className="text-xs uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

async function loadBooking(sessionId: string) {
  const stripe = getStripe();
  if (!stripe) return null;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return null;

    const meta = session.metadata ?? {};
    const room = getRoom(meta.roomSlug ?? "");
    return {
      roomName: room?.name ?? "your room",
      checkIn: meta.checkIn ? formatHuman(meta.checkIn) : "—",
      checkOut: meta.checkOut ? formatHuman(meta.checkOut) : "—",
      guests: meta.guests ?? "—",
      total: `¥${(session.amount_total ?? 0).toLocaleString("en-US")}`,
      email: session.customer_details?.email ?? undefined,
    };
  } catch (error) {
    console.error("[success]", error);
    return null;
  }
}
