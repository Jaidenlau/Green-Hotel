import { NextResponse } from "next/server";
import { getAvailability } from "@/lib/availability";
import { getRoom } from "@/lib/rooms";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("room");
  if (!slug || !getRoom(slug)) {
    return NextResponse.json({ error: "Unknown room." }, { status: 404 });
  }

  try {
    const availability = await getAvailability(slug);
    return NextResponse.json(availability, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[availability]", error);
    return NextResponse.json(
      { error: "Could not load availability." },
      { status: 503 },
    );
  }
}
