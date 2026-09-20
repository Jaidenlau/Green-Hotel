import { describe, expect, it } from "vitest";
import { buildICal, parseICal } from "@/lib/ical";

/** A trimmed copy of a real Airbnb export, CRLF line endings and all. */
const AIRBNB_FEED = [
  "BEGIN:VCALENDAR",
  "PRODID:-//Airbnb Inc//Hosting Calendar 0.8.8//EN",
  "CALSCALE:GREGORIAN",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "DTEND;VALUE=DATE:20260105",
  "DTSTART;VALUE=DATE:20260101",
  "UID:abc123@airbnb.com",
  "SUMMARY:Reserved",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTEND;VALUE=DATE:20260220",
  "DTSTART;VALUE=DATE:20260214",
  "UID:def456@airbnb.com",
  "SUMMARY:Airbnb (Not available)",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("parseICal", () => {
  it("reads Airbnb's export", () => {
    const ranges = parseICal(AIRBNB_FEED);
    expect(ranges).toHaveLength(2);
    expect(ranges[0]).toMatchObject({
      start: "2026-01-01",
      end: "2026-01-05",
      summary: "Reserved",
    });
    expect(ranges[1].summary).toBe("Airbnb (Not available)");
  });

  it("handles date-times as well as bare dates", () => {
    const feed = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "DTSTART:20260301T150000Z",
      "DTEND:20260304T110000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    expect(parseICal(feed)[0]).toMatchObject({
      start: "2026-03-01",
      end: "2026-03-04",
    });
  });

  it("unfolds wrapped lines", () => {
    const feed =
      "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260401\r\n" +
      "DTEND;VALUE=DATE:20260403\r\nSUMMARY:A very long summary that the\r\n" +
      "  exporter wrapped\r\nEND:VEVENT\r\nEND:VCALENDAR";
    expect(parseICal(feed)[0].summary).toBe(
      "A very long summary that the exporter wrapped",
    );
  });

  it("drops events that are missing or have nonsensical dates", () => {
    const feed = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "DTSTART;VALUE=DATE:20260401",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "DTSTART;VALUE=DATE:20260410",
      "DTEND;VALUE=DATE:20260401",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    expect(parseICal(feed)).toEqual([]);
  });

  it("survives junk without throwing", () => {
    expect(parseICal("")).toEqual([]);
    expect(parseICal("<html>404 not found</html>")).toEqual([]);
  });
});

describe("buildICal", () => {
  it("round-trips through the parser", () => {
    const ranges = [
      { start: "2026-05-01", end: "2026-05-04", uid: "x@greenhotel" },
      { start: "2026-06-10", end: "2026-06-12", uid: "y@greenhotel" },
    ];
    const parsed = parseICal(buildICal({ name: "Test", ranges }));
    expect(parsed.map((r) => [r.start, r.end])).toEqual([
      ["2026-05-01", "2026-05-04"],
      ["2026-06-10", "2026-06-12"],
    ]);
  });

  it("uses CRLF line endings, as RFC 5545 requires", () => {
    const output = buildICal({
      name: "Test",
      ranges: [{ start: "2026-05-01", end: "2026-05-04" }],
    });
    expect(output.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(output.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("escapes commas and semicolons in the calendar name", () => {
    const output = buildICal({ name: "Ocean, direct; bookings", ranges: [] });
    expect(output).toContain("X-WR-CALNAME:Ocean\\, direct\; bookings");
  });
});
