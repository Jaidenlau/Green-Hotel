import Image from "next/image";
import Link from "next/link";
import { BookingWidget } from "@/components/BookingWidget";
import { Gallery, type GalleryItem } from "@/components/Gallery";
import {
  HOTEL,
  ROOMS,
  bookableRooms,
  formatJpy,
  photosOfKind,
  type Room,
} from "@/lib/rooms";
import { stripeConfigured } from "@/lib/stripe";

export default function HomePage() {
  const rooms = bookableRooms();
  const upcoming = ROOMS.filter((room) => !room.bookable);
  // Every room, not just the bookable ones — an unlisted room still shows
  // here, with a placeholder tile, so the floor is visibly accounted for.
  const roomPhotos: GalleryItem[] = ROOMS.flatMap((room) =>
    photosOfKind(room, "room").map((photo) => ({
      ...photo,
      roomName: room.name,
      comingSoon: !room.bookable,
    })),
  );
  // The building, the street, the coin laundry. Useful, but not rooms — so
  // they get their own strip rather than padding out the room gallery.
  const placePhotos: GalleryItem[] = dedupeBySrc(
    rooms.flatMap((room) =>
      photosOfKind(room, "place").map((photo) => ({
        ...photo,
        roomName: HOTEL.name,
      })),
    ),
  );

  return (
    <>
      <Intro />

      <section id="book" className="shell scroll-mt-20 pt-10">
        {rooms.map((room) => (
          <BookingPanel key={room.slug} room={room} />
        ))}
      </section>

      {roomPhotos.length ? (
        <section id="rooms" className="shell scroll-mt-20 pt-20">
          <h2 className="font-display text-3xl sm:text-4xl">The rooms</h2>
          <p className="mt-2 max-w-xl text-ink-soft">
            Tap a photo to see it full size. Rooms marked “soon” aren&apos;t
            taking bookings yet — message us and we&apos;ll tell you when they
            open.
          </p>
          <div className="mt-8">
            <Gallery items={roomPhotos} />
          </div>
        </section>
      ) : null}

      {placePhotos.length ? (
        <section className="shell pt-16">
          <h2 className="font-display text-2xl">The building and the area</h2>
          <div className="mt-6">
            <Gallery items={placePhotos} />
          </div>
        </section>
      ) : null}

      {upcoming.length ? <Upcoming rooms={upcoming} /> : null}

      <Location />
    </>
  );
}

function dedupeBySrc(items: GalleryItem[]): GalleryItem[] {
  const seen = new Set<string>();
  return items.filter((item) =>
    seen.has(item.src) ? false : (seen.add(item.src), true),
  );
}

function Intro() {
  return (
    <section className="shell pt-10 sm:pt-14">
      <p className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft">
        <span className="size-1.5 rounded-full bg-forest" />
        Book direct — no platform service fee
      </p>
      <h1 className="mt-4 text-balance font-display text-4xl leading-[1.08] sm:text-5xl">
        {HOTEL.name}, {HOTEL.addressLine.split(",")[0]}
      </h1>
      <p className="mt-4 max-w-2xl text-pretty text-lg text-ink-soft">
        {HOTEL.walkMinutes} minutes&apos; walk from {HOTEL.nearestStation} — five
        minutes from Shinjuku, five from Ikebukuro. Pick your dates below and
        you&apos;re booked.
      </p>
    </section>
  );
}

function BookingPanel({ room }: { room: Room }) {
  const [cover, ...rest] = [
    ...photosOfKind(room, "room"),
    ...photosOfKind(room, "place"),
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      <div className="order-2 lg:order-none">
        {cover ? (
          <div className="grid grid-cols-3 gap-3">
            <div className="relative col-span-3 aspect-16/10 overflow-hidden rounded-2xl border border-line">
              <Image
                src={cover.src}
                alt={cover.alt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
              />
            </div>
            {rest.slice(0, 3).map((photo) => (
              <div
                key={photo.src}
                className="relative aspect-4/3 overflow-hidden rounded-xl border border-line"
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 1024px) 33vw, 20vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl sm:text-3xl">{room.name}</h2>
          <Link
            href={`/rooms/${room.slug}`}
            className="text-sm font-medium text-forest underline underline-offset-4 hover:text-forest-dark"
          >
            Full details &amp; all amenities →
          </Link>
        </div>
        <p className="mt-2 text-ink-soft">{room.tagline}</p>

        <ul className="mt-4 flex flex-wrap gap-2 text-xs text-ink-soft">
          {[
            room.sizeSqm ? `${room.sizeSqm} m²` : null,
            room.beds,
            room.maxGuests ? `Sleeps ${room.maxGuests}` : null,
            room.floor,
            "Self check-in",
            "Free luggage storage",
            "Cleaning included",
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

        {room.description[0] ? (
          <p className="mt-5 max-w-2xl text-pretty text-sm text-ink-soft">
            {room.description[0]}
          </p>
        ) : null}
      </div>

      <aside className="order-1 lg:order-none lg:sticky lg:top-20">
        <BookingWidget room={room} paymentsEnabled={stripeConfigured()} />
      </aside>
    </div>
  );
}

function Upcoming({ rooms }: { rooms: Room[] }) {
  return (
    <section className="shell pt-20">
      <h2 className="font-display text-2xl">Opening soon</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {rooms.map((room) => (
          <div
            key={room.slug}
            className="rounded-2xl border border-dashed border-line bg-paper-raised/60 p-5"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              Coming soon
            </p>
            <h3 className="mt-2 font-display text-lg">{room.name}</h3>
            <p className="mt-1 text-sm text-ink-soft">{room.tagline}</p>
            <Link
              href="/about#contact"
              className="mt-3 inline-block text-sm font-medium text-forest underline underline-offset-4 hover:text-forest-dark"
            >
              Ask to be told when it opens
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function Location() {
  return (
    <section className="shell pt-20">
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
            Restaurants, cafés, supermarkets and pharmacies are all around the
            station, and we store your luggage before check-in and after
            check-out free of charge.
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

export const metadata = {
  description: `Book ${HOTEL.name} directly — ${formatJpy(
    ROOMS[0].nightlyRateJpy,
  )} a night, cleaning included, ${HOTEL.walkMinutes} minutes' walk from ${
    HOTEL.nearestStation
  }.`,
};
