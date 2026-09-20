import { describe, expect, it } from "vitest";
import {
  addDays,
  diffDays,
  isValidDateStr,
  nightsBetween,
} from "@/lib/dates";

describe("isValidDateStr", () => {
  it("accepts real dates", () => {
    expect(isValidDateStr("2026-01-01")).toBe(true);
    expect(isValidDateStr("2028-02-29")).toBe(true); // leap year
  });

  it("rejects dates that only look real", () => {
    expect(isValidDateStr("2026-02-30")).toBe(false);
    expect(isValidDateStr("2027-02-29")).toBe(false); // not a leap year
    expect(isValidDateStr("2026-13-01")).toBe(false);
    expect(isValidDateStr("2026-1-1")).toBe(false);
    expect(isValidDateStr("")).toBe(false);
    expect(isValidDateStr(null)).toBe(false);
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("is unaffected by daylight saving shifts elsewhere in the world", () => {
    // These are the dates US/EU clocks change; a naive local-time
    // implementation drifts by an hour and lands on the wrong day.
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
    expect(diffDays("2026-03-01", "2026-04-01")).toBe(31);
  });
});

describe("nightsBetween", () => {
  it("excludes the check-out day", () => {
    expect(nightsBetween("2026-01-01", "2026-01-04")).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
    ]);
  });

  it("is empty for a same-day range", () => {
    expect(nightsBetween("2026-01-01", "2026-01-01")).toEqual([]);
  });

  it("lets one guest check out on the day the next checks in", () => {
    const leaving = nightsBetween("2026-01-01", "2026-01-05");
    const arriving = nightsBetween("2026-01-05", "2026-01-08");
    expect(leaving.some((night) => arriving.includes(night))).toBe(false);
  });
});
