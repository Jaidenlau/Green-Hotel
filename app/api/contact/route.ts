import { NextResponse } from "next/server";
import { emailConfigured, sendMail } from "@/lib/email";
import { formatHuman, isValidDateStr } from "@/lib/dates";
import { getRoom } from "@/lib/rooms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Crude per-instance rate limit — enough to blunt a bored bot. */
const recent = new Map<string, number[]>();
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 5;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(key, hits);
  if (recent.size > 5_000) recent.clear();
  return hits.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real guests never see this field, bots fill everything in.
  if (String(body.website ?? "")) {
    return NextResponse.json({ ok: true });
  }

  const name = String(body.name ?? "").trim().slice(0, 100);
  const email = String(body.email ?? "").trim().slice(0, 200);
  const message = String(body.message ?? "").trim().slice(0, 4000);
  const roomSlug = String(body.roomSlug ?? "").trim();
  const checkIn = body.checkIn;
  const checkOut = body.checkOut;

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Please fill in your name, email and message." },
      { status: 400 },
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "That email address looks wrong." }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many messages just now. Please try again later." },
      { status: 429 },
    );
  }

  const owner = process.env.OWNER_EMAIL;
  if (!emailConfigured() || !owner) {
    return NextResponse.json(
      {
        error:
          "Our contact form isn't connected yet — please email us directly and we'll reply the same day.",
      },
      { status: 503 },
    );
  }

  const room = getRoom(roomSlug);
  const lines = [
    `Enquiry from ${name} <${email}>`,
    "",
    room ? `Room:       ${room.name}` : "Room:       (not specified)",
    isValidDateStr(checkIn) ? `Check-in:   ${formatHuman(checkIn)}` : "",
    isValidDateStr(checkOut) ? `Check-out:  ${formatHuman(checkOut)}` : "",
    "",
    message,
  ].filter(Boolean);

  const sent = await sendMail({
    to: owner,
    subject: `Enquiry: ${room?.name ?? "Green Hotel"} — ${name}`,
    text: lines.join("\n"),
    replyTo: email,
  });

  if (!sent) {
    return NextResponse.json(
      { error: "We couldn't send that just now. Please email us directly." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
