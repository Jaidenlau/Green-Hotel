import Image from "next/image";
import Link from "next/link";
import { HOTEL, ROOMS, formatJpy, quoteStay } from "@/lib/rooms";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Rooms />
      <Location />
    </>
  );
}

function Hero() {
  return (
    <section className="shell pt-10 sm:pt-16">
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft">
            <span className="size-1.5 rounded-full bg-forest" />
            Book direct — no platform service fee
          </p>
          <h1 className="mt-5 text-balance font-display text-4xl leading-[1.08] sm:text-5xl lg:text-6xl">
            A quiet base in the middle of Tokyo.
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-lg text-ink-soft">
            {HOTEL.name} is {HOTEL.walkMinutes} minutes&apos; walk from{" "}
            {HOTEL.nearestStation} — five minutes from Shinjuku, five from
            Ikebukuro, and surrounded by the restaurants, supermarkets and
            pharmacies that make a trip easy.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#rooms"
              className="rounded-xl bg-forest px-5 py-3 font-medium text-paper transition hover:bg-forest-dark"
            >
              See available rooms
            </Link>
            <Link
              href="/about#contact"
              className="rounded-xl border border-line bg-paper-raised px-5 py-3 font-medium text-ink-soft transition hover:border-forest hover:text-forest-dark"
            >
              Ask us anything
            </Link>
          </div>
        </div>

        <div className="relative aspect-4/3 overflow-hidden rounded-3xl border border-line bg-paper-raised">
          <Image
            src="/images/ocean-interior.png"
            alt="Inside the Ocean room, looking towards the TV and kitchenette"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}

function Rooms() {
  return (
    <section id="rooms" className="shell scroll-mt-20 pt-20 sm:pt-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl">Our rooms</h2>
          <p className="mt-2 max-w-lg text-ink-soft">
            Live availability, synced with our Airbnb calendar, so the dates you
            see here are genuinely free.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {ROOMS.map((room) => (
          <RoomCard key={room.slug} slug={room.slug} />
        ))}
      </div>
    </section>
  );
}

function RoomCard({ slug }: { slug: string }) {
  const room = ROOMS.find((r) => r.slug === slug)!;
  const cover = room.photos[0];
  const quote = room.bookable ? quoteStay(room, 1) : null;

  if (!room.bookable) {
    return (
      <div className="flex min-h-64 flex-col justify-end rounded-2xl border border-dashed border-line bg-paper-raised/60 p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          Coming soon
        </p>
        <h3 className="mt-2 font-display text-xl">{room.name}</h3>
        <p className="mt-1 text-sm text-ink-soft">{room.tagline}</p>
        <Link
          href="/about#contact"
          className="mt-4 w-fit text-sm font-medium text-forest underline underline-offset-4 hover:text-forest-dark"
        >
          Ask to be told when it opens
        </Link>
      </div>
    );
  }

  return (
    <Link
      href={`/rooms/${room.slug}`}
      className="group overflow-hidden rounded-2xl border border-line bg-paper-raised transition hover:border-forest/40 hover:shadow-[0_18px_40px_-24px_rgba(18,33,26,0.35)]"
    >
      {cover ? (
        <div className="relative aspect-16/10 overflow-hidden">
          <Image
            src={cover.src}
            alt={cover.alt}
            fill
            sizes="(max-width: 640px) 100vw, 45vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
          {room.directDiscountPercent > 0 ? (
            <span className="absolute left-4 top-4 rounded-full bg-paper-raised/95 px-3 py-1 text-xs font-medium text-clay shadow-sm">
              {room.directDiscountPercent}% off direct
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-xl">{room.name}</h3>
          {quote ? (
            <p className="shrink-0 text-sm text-ink-soft">
              <span className="font-medium text-ink">
                {formatJpy(quote.discountedNightlyRateJpy)}
              </span>{" "}
              / night
            </p>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-ink-soft">{room.tagline}</p>
        <ul className="mt-4 flex flex-wrap gap-2 text-xs text-ink-soft">
          {[
            room.sizeSqm ? `${room.sizeSqm} m²` : null,
            room.beds,
            room.maxGuests ? `Sleeps ${room.maxGuests}` : null,
            "Self check-in",
          ]
            .filter(Boolean)
            .map((fact) => (
              <li
                key={fact as string}
                className="rounded-full border border-line px-2.5 py-1"
              >
                {fact}
              </li>
            ))}
        </ul>
        <p className="mt-5 text-sm font-medium text-forest">
          Check dates &amp; book →
        </p>
      </div>
    </Link>
  );
}

function Location() {
  return (
    <section className="shell pt-20 sm:pt-28">
      <div className="grid gap-10 rounded-3xl border border-line bg-paper-raised p-6 sm:p-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl">Getting around</h2>
          <p className="mt-3 text-ink-soft">
            Takadanobaba sits on the JR Yamanote Line, the loop that threads
            through the centre of Tokyo. From the station:
          </p>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {HOTEL.transit.map((leg) => (
              <li
                key={leg.destination}
                className="flex items-baseline justify-between gap-4 py-3"
              >
                <span>{leg.destination}</span>
                <span className="text-sm text-ink-soft">
                  {leg.minutes} min by train
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-ink-soft">
            We store your luggage before check-in and after check-out, free of
            charge.
          </p>
        </div>

        <div className="relative min-h-64 overflow-hidden rounded-2xl border border-line">
          <Image
            src="/images/building-exterior.png"
            alt="The building exterior, showing the private entrance and stairway"
            fill
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
