import { Suspense } from "react";
import Image from "next/image";
import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { calendarConnected } from "@/lib/availability";
import { emailConfigured } from "@/lib/email";
import { stripeConfigured } from "@/lib/stripe";
import { HOTEL } from "@/lib/rooms";

export const metadata: Metadata = {
  title: "About & contact",
  description:
    "Who runs Green Hotel in Takadanobaba, how to reach us, and how to book directly.",
};

export default function AboutPage() {
  // Don't advertise a sync or a payment flow that isn't switched on yet.
  const syncLive = calendarConnected();
  const paymentsLive = stripeConfigured();

  return (
    <div className="shell py-12 sm:py-16">
      <header className="max-w-2xl">
        <h1 className="text-balance font-display text-4xl sm:text-5xl">
          A small, family-run place
        </h1>
        <p className="mt-5 text-pretty text-lg text-ink-soft">
          {HOTEL.name} is run by a small team who live in the neighbourhood.
          We look after the rooms ourselves, answer messages ourselves, and
          keep the place simple, clean and quiet.
        </p>
      </header>

      <section className="mt-12 grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div className="relative aspect-4/3 overflow-hidden rounded-3xl border border-line">
          <Image
            src="/images/building-exterior.png"
            alt="The exterior of the Green Hotel building in Takadanobaba"
            fill
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="object-cover"
          />
        </div>

        <div className="space-y-5 text-ink-soft">
          <h2 className="font-display text-2xl text-ink">Why book direct</h2>
          <p>
            You may already have found us on Airbnb. Booking through this site
            skips the platform&apos;s service fee, so the same room costs you
            less and we keep more of what you pay — which goes straight back
            into the rooms.
          </p>
          {syncLive ? (
            <p>
              The calendar on this site reads our Airbnb calendar directly, so a
              date shown as free really is free. If anything goes wrong with
              that sync we turn instant booking off rather than risk
              double-booking you.
            </p>
          ) : (
            <p>
              Tell us the nights you want and we&apos;ll confirm them by email,
              usually the same day. We check every request against our calendar
              by hand before confirming, so you will never be double-booked.
            </p>
          )}
          {paymentsLive ? (
            <p>
              Payment is handled by Stripe. Your card details go to them, never
              to us.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-16 grid gap-6 sm:grid-cols-3">
        <InfoCard title="Where we are">
          <p>{HOTEL.addressLine}</p>
          <p className="mt-1">
            {HOTEL.walkMinutes} minutes&apos; walk from {HOTEL.nearestStation}
          </p>
        </InfoCard>
        <InfoCard title="Check-in & out">
          <p>Self check-in from {HOTEL.checkInFrom} with a lockbox</p>
          <p className="mt-1">Check-out by {HOTEL.checkOutBy}</p>
          <p className="mt-1">Free luggage storage either side</p>
        </InfoCard>
        <InfoCard title="Registration">
          <p>{HOTEL.registration.law}</p>
          <p className="mt-1">{HOTEL.registration.authority}</p>
          <p className="mt-1">{HOTEL.registration.number}</p>
        </InfoCard>
      </section>

      <section id="contact" className="mt-16 scroll-mt-20">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl">Contact us</h2>
          <p className="mt-3 text-ink-soft">
            Questions about the room, the area, a long stay, or dates that
            aren&apos;t showing as free? Send us a message — we usually reply
            the same day.
          </p>
          {HOTEL.contactEmail || HOTEL.contactPhone ? (
            <p className="mt-3 text-sm text-ink-soft">
              You can also reach us at{" "}
              {HOTEL.contactEmail ? (
                <a
                  className="font-medium text-forest underline underline-offset-4"
                  href={`mailto:${HOTEL.contactEmail}`}
                >
                  {HOTEL.contactEmail}
                </a>
              ) : null}
              {HOTEL.contactEmail && HOTEL.contactPhone ? " or " : null}
              {HOTEL.contactPhone ? (
                <a
                  className="font-medium text-forest underline underline-offset-4"
                  href={`tel:${HOTEL.contactPhone.replace(/\s/g, "")}`}
                >
                  {HOTEL.contactPhone}
                </a>
              ) : null}
              .
            </p>
          ) : null}
        </div>

        <div className="mt-6 max-w-3xl">
          <Suspense
            fallback={
              <div className="h-96 animate-pulse rounded-2xl border border-line bg-paper-raised" />
            }
          >
            <ContactForm
              fallbackEmail={HOTEL.contactEmail}
              emailEnabled={emailConfigured() && Boolean(process.env.OWNER_EMAIL)}
            />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-5">
      <h3 className="text-sm font-medium uppercase tracking-wide text-ink-faint">
        {title}
      </h3>
      <div className="mt-3 text-sm text-ink-soft">{children}</div>
    </div>
  );
}
