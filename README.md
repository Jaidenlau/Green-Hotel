# Green Hotel — direct booking site

A small Next.js site so guests can book Green Hotel rooms without going
through Airbnb (and without Airbnb's service fee). It has two pages plus a
booking flow:

- `/` — the rooms, with live availability
- `/about` — about the team, and a contact form
- `/rooms/ocean` — the room itself, with a calendar and a Book button

## How the Airbnb sync works

This is the part that stops you double-booking, so it is worth understanding.

**Airbnb → this site.** Airbnb publishes each listing's calendar as an `.ics`
file at a secret URL. The site fetches that file, reads the booked date ranges
out of it, and greys those nights out. It re-reads it at most every 5 minutes.

**This site → Airbnb.** The site publishes its own `.ics` feed of direct
bookings at `/api/calendar/<room>`. Point Airbnb's calendar **import** at that
URL and a direct booking will block the night on Airbnb too.

You need both directions. With only the first, a direct booking would leave the
night bookable on Airbnb.

> Airbnb polls imported calendars on its own schedule — usually within a few
> hours, not instantly. For same-day and next-day bookings, still check both
> calendars by hand.

**If the sync fails, booking switches off.** If the Airbnb calendar can't be
read, the site does *not* assume the room is free — it disables the Book button
and asks the guest to send an enquiry instead. An empty calendar and an
unreachable calendar look identical from the outside, and selling a night that
is already taken is much worse than losing a booking.

### Connecting a room

1. In Airbnb: **Calendar → Availability → Connect calendars → Export
   calendar**. Copy the link.
2. Put it in `.env.local` as `AIRBNB_ICAL_OCEAN` (see `.env.example`).
3. In Airbnb: **Connect calendars → Import calendar**. Paste
   `https://your-domain.com/api/calendar/ocean` and give it a name.
4. If you set `CALENDAR_FEED_SECRET`, the import URL becomes
   `https://your-domain.com/api/calendar/ocean?key=THE_SECRET`. Worth doing —
   otherwise anyone who guesses the URL can see when the room is occupied.

## How payments work

Payments go through **Stripe Checkout**. The guest never types a card number
into this site; they are sent to Stripe's own page and back again. That means
this site never stores or even sees card details.

Stripe supports Japanese businesses and can settle to a Japanese bank account
in JPY. You will need the business details Stripe asks for at signup
(registration number, bank account, ID).

### Setting Stripe up

1. Create an account at <https://dashboard.stripe.com/register>.
2. Copy the **secret key** (`sk_live_…`, or `sk_test_…` while you try it out)
   into `STRIPE_SECRET_KEY`.
3. Add a webhook endpoint pointing at
   `https://your-domain.com/api/webhooks/stripe`, subscribed to
   `checkout.session.completed`, `checkout.session.expired` and
   `charge.refunded`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
4. That's it. Leave the keys blank and the site runs in **enquiry-only** mode:
   the calendar still works, but guests send a message instead of paying.

### Where bookings are stored

**In Stripe.** There is no database. A paid Checkout Session *is* the booking —
the room and the dates are written into its metadata — so:

- **To see your bookings:** Stripe dashboard → Payments. The dates are in the
  payment description.
- **To cancel a booking:** refund it in Stripe. The nights free themselves up
  automatically, here and in the feed Airbnb imports.
- **Nothing to back up**, and one less service to pay for.

While a guest is on the payment page their dates are **held** (Stripe expires
an unpaid session after 30 minutes, which releases them). Availability is
re-checked against live data immediately before any charge, so a guest who sits
on the page while someone else books is told the dates have gone rather than
being charged for them.

## Email

The contact form and the "you have a booking" notification use
[Resend](https://resend.com). Set `RESEND_API_KEY`, `MAIL_FROM` (on a domain
you have verified with Resend) and `OWNER_EMAIL`. Without these the contact
form tells guests to email you directly instead.

## Running it

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev                  # http://localhost:3000
```

```bash
npm test          # date, calendar and double-booking logic
npm run typecheck
npm run build
```

## Deploying

Built for [Vercel](https://vercel.com): import the repo, paste the same
variables from `.env.example` into **Settings → Environment Variables**, deploy.
Any Node host works — it needs a server, not just static files, because of the
calendar sync and Stripe calls.

Set `NEXT_PUBLIC_SITE_URL` to the real domain once you have one; Stripe uses it
to send guests back after payment.

## Changing rooms, prices and photos

Nearly everything lives in [`lib/rooms.ts`](lib/rooms.ts): names, prices, the
direct-booking discount, minimum and maximum stay, amenities and photo lists.
Photos go in `public/images/`.

**Before going live, check these**, which are currently placeholders:

| Setting | Currently | Where |
| --- | --- | --- |
| Ocean nightly rate | ¥12,000 | `lib/rooms.ts` |
| Cleaning fee | ¥3,000 | `lib/rooms.ts` |
| Direct discount | 20% | `lib/rooms.ts` |
| Max guests | 2 | `lib/rooms.ts` |
| Check-in / check-out | 16:00 / 10:00 | `lib/rooms.ts` (`HOTEL`) |
| Contact email and phone | unset | `.env.local` |

The second room is a placeholder. Fill in its entry in `lib/rooms.ts` and set
`bookable: true` to put it on sale.

## A note on cancellations and refunds

The site takes payment in full at booking and does not implement a cancellation
policy — if a guest wants to cancel, you refund them in Stripe and decide the
amount yourself. If you want a stated policy (say, free cancellation up to 7
days before arrival), it needs to be written on the site and agreed at
checkout. Worth doing before you take many bookings.
