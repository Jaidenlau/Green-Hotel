/**
 * The feed Airbnb imports FROM us.
 *
 * Without this the sync is one-way: Airbnb bookings would block this site, but
 * a direct booking would leave the night bookable on Airbnb. Paste this URL
 * into Airbnb's "Import calendar" to close that loop.
 */

import { forRoom, listDirectBookings } from "@/lib/bookings";
import { buildICal } from "@/lib/ical";
import { getRoom } from "@/lib/rooms";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ room: string }> },
) {
  const { room: rawSlug } = await params;
  const slug = rawSlug.replace(/\.ics$/i, "");
  const room = getRoom(slug);
  if (!room) {
    return new Response("Unknown room", { status: 404 });
  }

  // A secret suffix keeps the guest list from being trivially enumerable.
  const secret = process.env.CALENDAR_FEED_SECRET;
  if (secret) {
    const provided = new URL(_request.url).searchParams.get("key");
    if (provided !== secret) {
      return new Response("Not found", { status: 404 });
    }
  }

  let bookings;
  try {
    bookings = forRoom(await listDirectBookings({ fresh: true }), slug);
  } catch (error) {
    console.error("[calendar]", error);
    // Returning an empty calendar here would tell Airbnb the room is free.
    return new Response("Calendar temporarily unavailable", { status: 503 });
  }

  const body = buildICal({
    name: `${room.name} — direct bookings`,
    ranges: bookings.map((booking) => ({
      start: booking.start,
      end: booking.end,
      uid: booking.uid,
      // Deliberately no guest details: this feed goes to a third party.
      summary: "Reserved",
    })),
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
