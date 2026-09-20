import Link from "next/link";
import { HOTEL } from "@/lib/rooms";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-forest-soft/50">
      <div className="shell grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="font-display text-lg font-semibold">{HOTEL.name}</p>
          <p className="mt-2 text-sm text-ink-soft">{HOTEL.addressLine}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {HOTEL.walkMinutes} minutes&apos; walk from {HOTEL.nearestStation}
          </p>
        </div>

        <div className="text-sm">
          <p className="font-medium">Get in touch</p>
          <ul className="mt-2 space-y-1 text-ink-soft">
            {HOTEL.contactEmail ? (
              <li>
                <a className="hover:text-forest-dark" href={`mailto:${HOTEL.contactEmail}`}>
                  {HOTEL.contactEmail}
                </a>
              </li>
            ) : null}
            {HOTEL.contactPhone ? (
              <li>
                <a className="hover:text-forest-dark" href={`tel:${HOTEL.contactPhone.replace(/\s/g, "")}`}>
                  {HOTEL.contactPhone}
                </a>
              </li>
            ) : null}
            <li>
              <Link className="hover:text-forest-dark" href="/about#contact">
                Send us a message
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <p className="font-medium">Registration</p>
          <p className="mt-2 text-ink-soft">{HOTEL.registration.law}</p>
          <p className="text-ink-soft">{HOTEL.registration.authority}</p>
          <p className="text-ink-soft">{HOTEL.registration.number}</p>
        </div>
      </div>

      <div className="border-t border-line/70">
        <div className="shell flex flex-wrap items-center justify-between gap-2 py-5 text-xs text-ink-faint">
          <p>
            © {new Date().getFullYear()} {HOTEL.name}. All rights reserved.
          </p>
          <p>
            Check-in from {HOTEL.checkInFrom} · Check-out by {HOTEL.checkOutBy}
          </p>
        </div>
      </div>
    </footer>
  );
}
