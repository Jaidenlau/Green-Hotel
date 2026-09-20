import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BookingWidget } from "@/components/BookingWidget";
import { HOTEL, ROOMS, getRoom, type Room } from "@/lib/rooms";
import { stripeConfigured } from "@/lib/stripe";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return ROOMS.map((room) => ({ slug: room.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const room = getRoom(slug);
  if (!room) return { title: "Room not found" };
  return { title: room.name, description: room.tagline };
}

export default async function RoomPage({ params }: Params) {
  const { slug } = await params;
  const room = getRoom(slug);
  if (!room) notFound();

  if (!room.bookable) {
    return (
      <div className="shell flex min-h-[50vh] flex-col items-start justify-center py-20">
        <h1 className="font-display text-4xl">{room.name}</h1>
        <p className="mt-3 max-w-md text-ink-soft">{room.tagline}</p>
        <Link
          href="/about#contact"
          className="mt-6 rounded-xl bg-forest px-5 py-3 font-medium text-paper transition hover:bg-forest-dark"
        >
          Get in touch
        </Link>
      </div>
    );
  }

  const [cover, ...rest] = room.photos;

  return (
    <article className="shell py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-faint">
        <Link href="/#rooms" className="hover:text-forest-dark">
          Rooms
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink-soft">{room.name}</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-balance font-display text-4xl sm:text-5xl">
          {room.name}
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">{room.tagline}</p>
      </header>

      {cover ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-4 sm:grid-rows-2">
          <div className="relative aspect-16/10 overflow-hidden rounded-2xl border border-line sm:col-span-2 sm:row-span-2 sm:aspect-auto">
            <Image
              src={cover.src}
              alt={cover.alt}
              fill
              priority
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          {rest.slice(0, 4).map((photo) => (
            <div
              key={photo.src}
              className="relative aspect-4/3 overflow-hidden rounded-2xl border border-line"
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div>
          <Facts room={room} />

          <section className="mt-10">
            <h2 className="font-display text-2xl">The space</h2>
            <div className="mt-4 space-y-4 text-pretty text-ink-soft">
              {room.description.map((paragraph) => (
                <p key={paragraph.slice(0, 32)}>{paragraph}</p>
              ))}
            </div>
          </section>

          <section className="mt-10 rounded-2xl border border-line bg-forest-soft/60 p-5">
            <h2 className="font-display text-lg">Worth knowing before you book</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              <li>
                This is an ordinary apartment building, so you can hear sound
                from the room next door.
              </li>
              <li>The room is in the semi-basement and has no lock on the bedroom door.</li>
              <li>
                Check-in is self-service from {HOTEL.checkInFrom} using a
                lockbox; check-out is by {HOTEL.checkOutBy}.
              </li>
              <li>
                There is no washing machine in the room — there is a coin
                laundry nearby, open 07:00–23:45.
              </li>
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl">What this place offers</h2>
            <div className="mt-5 grid gap-8 sm:grid-cols-2">
              {room.amenityGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="text-sm font-medium uppercase tracking-wide text-ink-faint">
                    {group.title}
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm">
                    {group.items.map((item) => (
                      <li key={item.label} className="flex gap-2.5">
                        <span
                          aria-hidden="true"
                          className={
                            item.unavailable
                              ? "mt-0.5 shrink-0 text-ink-faint"
                              : "mt-0.5 shrink-0 text-forest"
                          }
                        >
                          {item.unavailable ? "✕" : "✓"}
                        </span>
                        <span>
                          <span
                            className={
                              item.unavailable
                                ? "text-ink-faint line-through"
                                : undefined
                            }
                          >
                            {item.label}
                          </span>
                          {item.note ? (
                            <span className="block text-xs text-ink-faint">
                              {item.note}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10 border-t border-line pt-6 text-sm text-ink-faint">
            <h2 className="font-medium text-ink-soft">Registration details</h2>
            <p className="mt-2">
              {HOTEL.registration.law} · {HOTEL.registration.authority} ·{" "}
              {HOTEL.registration.number}
            </p>
          </section>
        </div>

        <aside className="order-first lg:order-none lg:sticky lg:top-20">
          <BookingWidget room={room} paymentsEnabled={stripeConfigured()} />
        </aside>
      </div>
    </article>
  );
}

function Facts({ room }: { room: Room }) {
  const facts = [
    room.sizeSqm ? { label: "Size", value: `${room.sizeSqm} m²` } : null,
    room.beds ? { label: "Bed", value: room.beds } : null,
    room.maxGuests ? { label: "Guests", value: `Up to ${room.maxGuests}` } : null,
    room.floor ? { label: "Floor", value: room.floor } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
      {facts.map((fact) => (
        <div key={fact.label} className="bg-paper-raised px-4 py-4">
          <dt className="text-xs uppercase tracking-wide text-ink-faint">
            {fact.label}
          </dt>
          <dd className="mt-1 text-sm font-medium">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
