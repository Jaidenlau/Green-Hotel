import { describe, expect, it } from "vitest";
import { validateStay, type Availability } from "@/lib/availability";
import { nightsBetween } from "@/lib/dates";
import { getRoom, type Room } from "@/lib/rooms";

const room = getRoom("ocean") as Room;

function availability(
  overrides: Partial<Availability> & { blocked?: string[] } = {},
): Availability {
  const { blocked, ...rest } = overrides;
  return {
    roomSlug: "ocean",
    blockedNights: blocked ?? [],
    blockedRanges: [],
    firstBookableNight: "2026-01-01",
    lastBookableNight: "2026-12-31",
    synced: true,
    lastSyncedAt: new Date().toISOString(),
    ...rest,
  };
}

describe("validateStay", () => {
  it("accepts a free stay", () => {
    expect(
      validateStay(room, availability(), "2026-03-01", "2026-03-04"),
    ).toEqual({ ok: true });
  });

  it("rejects a stay that touches a booked night", () => {
    const result = validateStay(
      room,
      availability({ blocked: ["2026-03-02"] }),
      "2026-03-01",
      "2026-03-04",
    );
    expect(result.ok).toBe(false);
  });

  it("allows checking out on the day someone else checks in", () => {
    // The other guest occupies the night of the 4th onwards; our stay ends
    // that morning, so it does not overlap.
    const blocked = nightsBetween("2026-03-04", "2026-03-08");
    expect(
      validateStay(room, availability({ blocked }), "2026-03-01", "2026-03-04"),
    ).toEqual({ ok: true });
  });

  it("allows checking in on the day someone else checks out", () => {
    const blocked = nightsBetween("2026-02-25", "2026-03-01");
    expect(
      validateStay(room, availability({ blocked }), "2026-03-01", "2026-03-04"),
    ).toEqual({ ok: true });
  });

  it("rejects a stay that fully contains a booking", () => {
    const blocked = nightsBetween("2026-03-05", "2026-03-07");
    const result = validateStay(
      room,
      availability({ blocked }),
      "2026-03-01",
      "2026-03-10",
    );
    expect(result.ok).toBe(false);
  });

  it("refuses to book when the calendar could not be synced", () => {
    const result = validateStay(
      room,
      availability({ synced: false, syncError: "Airbnb is down." }),
      "2026-03-01",
      "2026-03-04",
    );
    // Failing closed is the whole point: an unsynced calendar must never
    // read as "everything is free".
    expect(result).toEqual({ ok: false, reason: "Airbnb is down." });
  });

  it("rejects dates in the past and backwards ranges", () => {
    expect(
      validateStay(room, availability(), "2025-12-30", "2026-01-05").ok,
    ).toBe(false);
    expect(
      validateStay(room, availability(), "2026-03-04", "2026-03-01").ok,
    ).toBe(false);
    expect(
      validateStay(room, availability(), "2026-03-04", "2026-03-04").ok,
    ).toBe(false);
  });

  it("enforces the maximum stay", () => {
    const result = validateStay(room, availability(), "2026-03-01", "2026-05-01");
    expect(result.ok).toBe(false);
  });

  it("refuses rooms that are not on sale yet", () => {
    const placeholder = getRoom("room-2") as Room;
    expect(
      validateStay(placeholder, availability(), "2026-03-01", "2026-03-04").ok,
    ).toBe(false);
  });
});
