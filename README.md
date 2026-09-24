# Green Hotel — direct booking site

A small Next.js site so guests can book Green Hotel rooms without going
through Airbnb (and without Airbnb's service fee). It has two pages plus a
booking flow:

- `/` — booking. Calendar and Book button at the top, then photos of every
  room, then the building and the area.
- `/about` — about the team, and a contact form
- `/rooms/ocean` — the full room page: every photo, every amenity

## Three stages of setup

The site is built so it is useful before either integration is connected, and
each one can be switched on later by setting variables — no code changes.

| Stage | What you set | What guests get |
| --- | --- | --- |
| 1. Enquiry | `NEXT_PUBLIC_CONTACT_EMAIL` | The full site. Guests pick dates and email you a request; you confirm by hand. |
| 2. Synced | `+ AIRBNB_ICAL_*` | Nights Airbnb has taken are greyed out automatically. |
| 3. Instant | `+ STRIPE_SECRET_KEY` | Guests pay online and book themselves. |

Deploy at stage 1 today; the pages already say the right thing for whichever
stage you are at, so nothing reads as half-finished. At stage 1 and 2 the Book
button is a "Request these dates" button instead, because the site refuses to
sell a night it cannot verify.

`NEXT_PUBLIC_CONTACT_EMAIL` is the one variable worth setting before you
launch — without it there is no way for a guest to reach you.

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

## Deploying to Railway

1. **New Project → Deploy from GitHub repo**, and pick this repo.
2. Railway detects Next.js on its own. It runs `npm run build`, then
   `npm start`, and passes the port in `PORT` — which `next start` picks up, so
   there is nothing to configure.
3. Paste every variable from `.env.example` into **Variables**. Do this
   *before* the first deploy: anything starting with `NEXT_PUBLIC_` is baked
   into the build, so adding it later means redeploying.
4. **Settings → Networking → Generate Domain** (or point your own domain at
   it), then set `NEXT_PUBLIC_SITE_URL` to that address and redeploy. Stripe
   uses it to send guests back after payment, and it is the base of the
   calendar URL you give Airbnb.

It needs a Node server, not a static host, because of the calendar sync and the
Stripe calls — Railway, Vercel, Fly and a plain VPS all work. There is no
database to add.

## Changing rooms, prices and photos

Nearly everything lives in [`lib/rooms.ts`](lib/rooms.ts): names, prices, the
direct-booking discount, minimum and maximum stay, amenities and photo lists.
Photos go in `public/images/` and each one is tagged `kind: "room"` or
`kind: "place"`. Only `"room"` photos appear in the homepage room gallery —
that keeps the street, the building and the coin-laundry notice out of a
section headed "The rooms".

**Before going live, check these**, which are currently placeholders:

| Setting | Currently | Where |
| --- | --- | --- |
| Ocean nightly rate | ¥11,800 | `lib/rooms.ts` |
| Cleaning fee | ¥0 — included in the rate | `lib/rooms.ts` |
| Max guests | 2 | `lib/rooms.ts` |
| Check-in / check-out | 16:00 / 10:00 | `lib/rooms.ts` (`HOTEL`) |
| Contact email and phone | unset | `.env.local` |

**About the ¥11,800.** That was roughly US$75 at ¥156.9 to the dollar on
20 September 2026. Guests are charged in yen, so the dollar equivalent drifts
with the exchange rate — if US$75 is the number that matters, check the rate
now and again rather than assuming it still holds.

To advertise a direct-booking saving, set `directDiscountPercent` above 0.
`nightlyRateJpy` then shows struck through as the "normal" price, guests are
charged the discounted one, and a "% off direct" badge appears. It is currently
`0`, so ¥11,800 is simply the price.

Rooms 2, 3 and 4 are placeholders, built from the `placeholderRoom()` helper
at the top of `lib/rooms.ts`. They appear on the site as "opening soon" with a
"photo coming soon" tile and cannot be booked. To put one on sale, replace its
`placeholderRoom(n)` entry with a full room object (copy Ocean's), add its
photos, set `bookable: true`, and set its `AIRBNB_ICAL_ROOM_n` variable — a
room without that variable refuses bookings rather than risk a clash. Delete
any placeholders you don't need, or copy one to add more.

## A note on cancellations and refunds

The site takes payment in full at booking and does not implement a cancellation
policy — if a guest wants to cancel, you refund them in Stripe and decide the
amount yourself. If you want a stated policy (say, free cancellation up to 7
days before arrival), it needs to be written on the site and agreed at
checkout. Worth doing before you take many bookings.
