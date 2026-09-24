"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Availability } from "@/lib/availability";
import {
  addDays,
  diffDays,
  formatDateStr,
  formatHuman,
  nightsBetween,
  todayInHotelTz,
} from "@/lib/dates";
import { formatJpy, quoteStay, type Room } from "@/lib/rooms";

type Props = {
  room: Room;
  /** Whether online payment is switched on. Decided on the server. */
  paymentsEnabled: boolean;
};

type Selection = { checkIn: string | null; checkOut: string | null };

export function BookingWidget({ room, paymentsEnabled }: Props) {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({
    checkIn: null,
    checkOut: null,
  });
  const [hovered, setHovered] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guests, setGuests] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/availability?room=${encodeURIComponent(room.slug)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Availability unavailable");
        return (await response.json()) as Availability;
      })
      .then((data) => {
        if (!cancelled) setAvailability(data);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(
            "We couldn't load the calendar just now. Please send us an enquiry and we'll confirm by email.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [room.slug]);

  const blocked = useMemo(
    () => new Set(availability?.blockedNights ?? []),
    [availability],
  );

  const today = availability?.firstBookableNight ?? todayInHotelTz();
  const lastNight = availability?.lastBookableNight ?? addDays(today, 365);

  /**
   * A date can start a stay if that night is free. It can end a stay if every
   * night from the chosen check-in up to (not including) it is free — the
   * check-out day itself is never occupied, so it may be someone else's
   * check-in day.
   */
  const isSelectable = useCallback(
    (date: string): boolean => {
      if (date < today || date > addDays(lastNight, 1)) return false;
      const { checkIn, checkOut } = selection;
      if (checkIn && !checkOut) {
        if (date <= checkIn) return !blocked.has(date);
        return nightsBetween(checkIn, date).every((n) => !blocked.has(n));
      }
      return !blocked.has(date);
    },
    [blocked, lastNight, selection, today],
  );

  function handlePick(date: string) {
    setSubmitError(null);
    const { checkIn, checkOut } = selection;
    if (!checkIn || checkOut || date <= checkIn) {
      setSelection({ checkIn: date, checkOut: null });
      return;
    }
    setSelection({ checkIn, checkOut: date });
  }

  const nights =
    selection.checkIn && selection.checkOut
      ? diffDays(selection.checkIn, selection.checkOut)
      : 0;
  const quote = nights > 0 ? quoteStay(room, nights) : null;

  const stayProblem = useMemo(() => {
    if (!quote) return null;
    if (nights < room.minNights) {
      return `Minimum stay is ${room.minNights} night${room.minNights === 1 ? "" : "s"}.`;
    }
    if (nights > room.maxNights) {
      return `For stays over ${room.maxNights} nights, please message us.`;
    }
    return null;
  }, [nights, quote, room.maxNights, room.minNights]);

  const synced = availability?.synced ?? false;
  // "enquiry" means nobody has connected the Airbnb calendar yet. That is a
  // setup step, not a fault, so it gets calm copy instead of a warning.
  const mode = availability?.mode ?? "degraded";
  const canBook =
    paymentsEnabled &&
    synced &&
    Boolean(quote) &&
    !stayProblem &&
    guestName.trim().length > 0;

  async function handleBook() {
    if (!selection.checkIn || !selection.checkOut) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomSlug: room.slug,
          checkIn: selection.checkIn,
          checkOut: selection.checkOut,
          guestName: guestName.trim(),
          guests,
        }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Could not start checkout.");
      }
      window.location.href = data.url;
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
      setSubmitting(false);
    }
  }

  const enquiryHref = buildEnquiryHref(room.slug, selection);

  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-5 shadow-[0_1px_2px_rgba(18,33,26,0.04),0_12px_32px_-16px_rgba(18,33,26,0.18)] sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          {room.directDiscountPercent > 0 ? (
            <span className="mr-2 text-base text-ink-faint line-through">
              {formatJpy(room.nightlyRateJpy)}
            </span>
          ) : null}
          <span className="font-display text-2xl font-semibold">
            {formatJpy(
              Math.round(
                room.nightlyRateJpy * (1 - room.directDiscountPercent / 100),
              ),
            )}
          </span>
          <span className="text-sm text-ink-soft"> / night</span>
        </div>
        {room.directDiscountPercent > 0 ? (
          <span className="rounded-full bg-clay/10 px-3 py-1 text-xs font-medium text-clay">
            {room.directDiscountPercent}% off booking direct
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        {loadError ? (
          <Notice tone="warn">{loadError}</Notice>
        ) : !availability ? (
          <CalendarSkeleton />
        ) : (
          <>
            <Calendar
              today={today}
              lastNight={lastNight}
              blocked={blocked}
              selection={selection}
              hovered={hovered}
              onHover={setHovered}
              isSelectable={isSelectable}
              onPick={handlePick}
            />
            <Legend showBooked={mode !== "enquiry"} />
            {mode === "enquiry" ? (
              <div className="mt-4">
                <Notice tone="info">{availability.syncError}</Notice>
              </div>
            ) : mode === "degraded" ? (
              <div className="mt-4">
                <Notice tone="warn">
                  {availability.syncError}{" "}
                  To be safe we&apos;ve turned off instant booking — send us a
                  request and we&apos;ll confirm by email.
                </Notice>
              </div>
            ) : null}
          </>
        )}
      </div>

      {selection.checkIn ? (
        <div className="mt-5 rounded-xl border border-line bg-paper p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-faint">
                Check-in
              </p>
              <p className="font-medium">{formatHuman(selection.checkIn)}</p>
              <p className="text-xs text-ink-faint">from 16:00</p>
            </div>
            <span aria-hidden="true" className="text-ink-faint">
              →
            </span>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-ink-faint">
                Check-out
              </p>
              <p className="font-medium">
                {selection.checkOut ? formatHuman(selection.checkOut) : "Pick a date"}
              </p>
              <p className="text-xs text-ink-faint">by 10:00</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelection({ checkIn: null, checkOut: null })}
            className="mt-3 text-xs text-ink-soft underline underline-offset-2 hover:text-forest-dark"
          >
            Clear dates
          </button>
        </div>
      ) : null}

      {quote ? (
        <dl className="mt-5 space-y-2 border-t border-line pt-5 text-sm">
          <Row
            label={`${formatJpy(
              quote.discountJpy > 0
                ? quote.nightlyRateJpy
                : quote.discountedNightlyRateJpy,
            )} × ${quote.nights} night${quote.nights === 1 ? "" : "s"}`}
            value={formatJpy(quote.roomTotalJpy + quote.discountJpy)}
          />
          {quote.discountJpy > 0 ? (
            <Row
              label={`Direct booking discount (${room.directDiscountPercent}%)`}
              value={`− ${formatJpy(quote.discountJpy)}`}
              tone="good"
            />
          ) : null}
          {quote.cleaningFeeJpy > 0 ? (
            <Row label="Cleaning fee" value={formatJpy(quote.cleaningFeeJpy)} />
          ) : null}
          <div className="flex items-baseline justify-between border-t border-line pt-3 font-medium">
            <dt>Total</dt>
            <dd className="font-display text-lg">{formatJpy(quote.totalJpy)}</dd>
          </div>
          <p className="text-xs text-ink-faint">
            No platform service fee. Taxes, where they apply, are included.
          </p>
        </dl>
      ) : null}

      {stayProblem ? (
        <div className="mt-4">
          <Notice tone="warn">{stayProblem}</Notice>
        </div>
      ) : null}

      {quote && !stayProblem && paymentsEnabled && synced ? (
        <div className="mt-5 space-y-3">
          <label className="block text-sm">
            <span className="text-ink-soft">Name on the booking</span>
            <input
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              placeholder="Your full name"
              autoComplete="name"
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-ink placeholder:text-ink-faint"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-soft">Guests</span>
            <select
              value={guests}
              onChange={(event) => setGuests(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-ink"
            >
              {Array.from({ length: room.maxGuests ?? 2 }, (_, i) => i + 1).map(
                (n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "guest" : "guests"}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
      ) : null}

      {submitError ? (
        <div className="mt-4">
          <Notice tone="error">{submitError}</Notice>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {paymentsEnabled ? (
          <button
            type="button"
            onClick={handleBook}
            disabled={!canBook || submitting}
            className="w-full rounded-xl bg-forest px-4 py-3 font-medium text-paper transition hover:bg-forest-dark disabled:cursor-not-allowed disabled:bg-ink-faint/40 disabled:text-paper-raised"
          >
            {submitting
              ? "Taking you to payment…"
              : quote
                ? `Book — ${formatJpy(quote.totalJpy)}`
                : "Choose your dates"}
          </button>
        ) : null}

        <a
          href={enquiryHref}
          className={
            paymentsEnabled
              ? "block w-full rounded-xl border border-line px-4 py-3 text-center font-medium text-ink-soft transition hover:border-forest hover:text-forest-dark"
              : "block w-full rounded-xl bg-forest px-4 py-3 text-center font-medium text-paper transition hover:bg-forest-dark"
          }
        >
          {paymentsEnabled && synced
            ? "Or ask us a question first"
            : quote
              ? "Request these dates"
              : "Ask us about dates"}
        </a>

        <p className="text-center text-xs text-ink-faint">
          {paymentsEnabled && synced
            ? "Payment is taken securely by Stripe. We never see your card details."
            : "Sending a request doesn't book the room or charge you — we'll confirm by email first."}
        </p>
      </div>
    </div>
  );
}

function buildEnquiryHref(roomSlug: string, selection: Selection): string {
  const params = new URLSearchParams({ room: roomSlug });
  if (selection.checkIn) params.set("checkIn", selection.checkIn);
  if (selection.checkOut) params.set("checkOut", selection.checkOut);
  return `/about?${params.toString()}#contact`;
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={tone === "good" ? "text-forest" : undefined}>{value}</dd>
    </div>
  );
}

function Notice({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "info" | "warn" | "error";
}) {
  return (
    <p
      role={tone === "error" ? "alert" : undefined}
      className={
        tone === "error"
          ? "rounded-lg border border-clay/30 bg-clay/5 px-3 py-2 text-sm text-clay"
          : tone === "warn"
            ? "rounded-lg border border-clay/25 bg-clay/5 px-3 py-2 text-sm text-ink-soft"
            : "rounded-lg border border-line bg-forest-soft px-3 py-2 text-sm text-ink-soft"
      }
    >
      {children}
    </p>
  );
}

function CalendarSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden="true">
      <div className="h-5 w-32 rounded bg-line" />
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square rounded bg-line/60" />
        ))}
      </div>
    </div>
  );
}

function Legend({ showBooked }: { showBooked: boolean }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-faint">
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-forest" /> Your stay
      </li>
      {showBooked ? (
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-line" /> Booked
        </li>
      ) : null}
      <li>Prices update as you pick dates.</li>
    </ul>
  );
}

const MONTHS_SHOWN = 2;
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function Calendar({
  today,
  lastNight,
  blocked,
  selection,
  hovered,
  onHover,
  isSelectable,
  onPick,
}: {
  today: string;
  lastNight: string;
  blocked: Set<string>;
  selection: Selection;
  hovered: string | null;
  onHover: (date: string | null) => void;
  isSelectable: (date: string) => boolean;
  onPick: (date: string) => void;
}) {
  const [offset, setOffset] = useState(0);

  const firstMonth = useMemo(() => {
    const [y, m] = today.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1 + offset, 1));
  }, [offset, today]);

  const maxOffset = useMemo(() => {
    const [ty, tm] = today.split("-").map(Number);
    const [ly, lm] = lastNight.split("-").map(Number);
    return (ly - ty) * 12 + (lm - tm) - (MONTHS_SHOWN - 1);
  }, [lastNight, today]);

  // The provisional range while the guest hovers over a possible check-out.
  const previewEnd =
    selection.checkIn && !selection.checkOut && hovered && hovered > selection.checkIn
      ? hovered
      : selection.checkOut;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOffset((value) => Math.max(0, value - 1))}
          disabled={offset === 0}
          aria-label="Previous month"
          className="grid size-8 place-items-center rounded-full border border-line text-ink-soft transition hover:border-forest hover:text-forest disabled:opacity-30"
        >
          ‹
        </button>
        <p className="text-sm font-medium">
          {monthLabel(firstMonth)}
          <span className="hidden sm:inline">
            {" – "}
            {monthLabel(addMonths(firstMonth, MONTHS_SHOWN - 1))}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setOffset((value) => Math.min(maxOffset, value + 1))}
          disabled={offset >= maxOffset}
          aria-label="Next month"
          className="grid size-8 place-items-center rounded-full border border-line text-ink-soft transition hover:border-forest hover:text-forest disabled:opacity-30"
        >
          ›
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {Array.from({ length: MONTHS_SHOWN }, (_, i) => addMonths(firstMonth, i)).map(
          (month, index) => (
            <MonthGrid
              key={month.toISOString()}
              month={month}
              hiddenOnMobile={index > 0}
              blocked={blocked}
              selection={selection}
              previewEnd={previewEnd}
              onHover={onHover}
              isSelectable={isSelectable}
              onPick={onPick}
            />
          ),
        )}
      </div>
    </div>
  );
}

function MonthGrid({
  month,
  hiddenOnMobile,
  blocked,
  selection,
  previewEnd,
  onHover,
  isSelectable,
  onPick,
}: {
  month: Date;
  hiddenOnMobile: boolean;
  blocked: Set<string>;
  selection: Selection;
  previewEnd: string | null;
  onHover: (date: string | null) => void;
  isSelectable: (date: string) => boolean;
  onPick: (date: string) => void;
}) {
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  // getUTCDay() is Sunday-first; shift so the week starts on Monday.
  const leading = (new Date(Date.UTC(year, monthIndex, 1)).getUTCDay() + 6) % 7;

  return (
    <div className={hiddenOnMobile ? "hidden sm:block" : undefined}>
      <p className="mb-2 text-center text-xs font-medium text-ink-soft sm:text-left">
        {monthLabel(month)}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-ink-faint">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leading }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = formatDateStr(new Date(Date.UTC(year, monthIndex, i + 1)));
          const selectable = isSelectable(date);
          const isStart = selection.checkIn === date;
          const isEnd = previewEnd === date;
          const inRange =
            Boolean(selection.checkIn) &&
            Boolean(previewEnd) &&
            date > selection.checkIn! &&
            date < previewEnd!;

          return (
            <button
              key={date}
              type="button"
              disabled={!selectable}
              onClick={() => onPick(date)}
              onMouseEnter={() => onHover(date)}
              onMouseLeave={() => onHover(null)}
              aria-label={`${formatHuman(date)}${
                selectable ? "" : blocked.has(date) ? " — booked" : " — unavailable"
              }`}
              aria-pressed={isStart || isEnd}
              className={[
                "aspect-square rounded-lg text-xs transition",
                isStart || isEnd
                  ? "bg-forest font-medium text-paper"
                  : inRange
                    ? "bg-forest-soft text-forest-dark"
                    : selectable
                      ? "text-ink hover:bg-forest-soft"
                      : blocked.has(date)
                        ? "cursor-not-allowed bg-line/40 text-ink-faint line-through"
                        : "cursor-not-allowed text-ink-faint/40",
              ].join(" ")}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function addMonths(date: Date, count: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1));
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(date);
}
