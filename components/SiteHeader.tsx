import Link from "next/link";
import { HOTEL } from "@/lib/rooms";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="shell flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-full bg-forest text-paper"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
              <path d="M12 2.6 4.8 14.2h4.3L3.9 21.4h16.2l-5.2-7.2h4.3z" />
            </svg>
          </span>
          <span className="whitespace-nowrap font-display text-lg font-semibold tracking-tight">
            {HOTEL.name}
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/#rooms"
            className="rounded-full px-2 py-2 text-ink-soft transition hover:bg-forest-soft hover:text-forest-dark sm:px-3"
          >
            Rooms
          </Link>
          <Link
            href="/about"
            className="rounded-full px-2 py-2 text-ink-soft transition hover:bg-forest-soft hover:text-forest-dark sm:px-3"
          >
            About<span className="hidden sm:inline"> &amp; contact</span>
          </Link>
          <Link
            href="/rooms/ocean"
            className="ml-1 rounded-full bg-forest px-4 py-2 font-medium text-paper transition hover:bg-forest-dark"
          >
            Book
          </Link>
        </nav>
      </div>
    </header>
  );
}
