/**
 * Minimal iCalendar (RFC 5545) support — just enough for channel-manager sync.
 *
 * We only care about VEVENTs with a start and end date, which is all Airbnb,
 * Booking.com and Vrbo put in their exported calendars. Writing ~100 lines here
 * beats pulling in a full iCal library that we'd only use two fields of.
 */

import { formatDateStr, isValidDateStr } from "./dates";

export type DateRange = {
  /** First night occupied, "YYYY-MM-DD". */
  start: string;
  /** Checkout day — exclusive, so it is NOT occupied. */
  end: string;
  summary?: string;
  uid?: string;
};

/**
 * Undo RFC 5545 line folding: a CRLF followed by a space or tab is a
 * continuation of the previous line, not a new one.
 */
function unfold(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");
}

/** Split "DTSTART;VALUE=DATE:20260101" into its name, params and value. */
function parseLine(line: string): { name: string; value: string } | null {
  const colon = line.indexOf(":");
  if (colon === -1) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1).trim();
  const name = head.split(";")[0].trim().toUpperCase();
  if (!name) return null;
  return { name, value };
}

/**
 * Accepts the two forms that appear in practice: a bare date (20260101) and a
 * UTC date-time (20260101T150000Z). Date-times are reduced to their calendar
 * day, which is what a nightly calendar actually cares about.
 */
function parseICalDate(value: string): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const candidate = `${y}-${m}-${d}`;
  return isValidDateStr(candidate) ? candidate : null;
}

export function parseICal(text: string): DateRange[] {
  const ranges: DateRange[] = [];
  let current: Partial<DateRange> | null = null;

  for (const line of unfold(text)) {
    const parsed = parseLine(line);
    if (!parsed) continue;
    const { name, value } = parsed;

    if (name === "BEGIN" && value.toUpperCase() === "VEVENT") {
      current = {};
      continue;
    }
    if (name === "END" && value.toUpperCase() === "VEVENT") {
      if (current?.start && current.end && current.start < current.end) {
        ranges.push(current as DateRange);
      }
      current = null;
      continue;
    }
    if (!current) continue;

    if (name === "DTSTART") {
      const date = parseICalDate(value);
      if (date) current.start = date;
    } else if (name === "DTEND") {
      const date = parseICalDate(value);
      if (date) current.end = date;
    } else if (name === "SUMMARY") {
      current.summary = unescapeText(value);
    } else if (name === "UID") {
      current.uid = value;
    }
  }

  return ranges;
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function toICalDate(value: string): string {
  return value.replace(/-/g, "");
}

/** Fold a content line at 75 octets, as required by RFC 5545. */
function fold(line: string): string {
  if (line.length <= 73) return line;
  const chunks: string[] = [line.slice(0, 73)];
  for (let i = 73; i < line.length; i += 72) {
    chunks.push(" " + line.slice(i, i + 72));
  }
  return chunks.join("\r\n");
}

/**
 * Build the feed that Airbnb (or any other channel) imports FROM us, so a
 * direct booking blocks those nights everywhere else too.
 */
export function buildICal(options: {
  name: string;
  ranges: DateRange[];
}): string {
  const stamp =
    formatDateStr(new Date()).replace(/-/g, "") +
    "T" +
    new Date().toISOString().slice(11, 19).replace(/:/g, "") +
    "Z";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Green Hotel//Direct Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(options.name)}`,
  ];

  for (const range of options.ranges) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeText(range.uid ?? `${range.start}-${range.end}@greenhotel`)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${toICalDate(range.start)}`,
      `DTEND;VALUE=DATE:${toICalDate(range.end)}`,
      `SUMMARY:${escapeText(range.summary ?? "Reserved")}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
