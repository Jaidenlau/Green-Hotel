"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ROOMS } from "@/lib/rooms";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

export function ContactForm({ fallbackEmail }: { fallbackEmail: string }) {
  const params = useSearchParams();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // Pre-fill from the booking widget's "ask us first" link.
  const [roomSlug, setRoomSlug] = useState(params.get("room") ?? "");
  const [checkIn, setCheckIn] = useState(params.get("checkIn") ?? "");
  const [checkOut, setCheckOut] = useState(params.get("checkOut") ?? "");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus({ kind: "sending" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          message: form.get("message"),
          website: form.get("website"),
          roomSlug,
          checkIn,
          checkOut,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not send.");
      setStatus({ kind: "sent" });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not send.",
      });
    }
  }

  if (status.kind === "sent") {
    return (
      <div className="rounded-2xl border border-forest/30 bg-forest-soft p-6">
        <h3 className="font-display text-xl text-forest-dark">Message sent</h3>
        <p className="mt-2 text-sm text-ink-soft">
          Thank you — we read every message and usually reply the same day. If
          you asked about specific dates, we&apos;ll confirm whether they&apos;re
          free and send you a payment link.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-line bg-paper-raised p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name">
          <input
            name="name"
            required
            autoComplete="name"
            className="input"
            placeholder="Full name"
          />
        </Field>
        <Field label="Email">
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Room (optional)">
          <select
            value={roomSlug}
            onChange={(event) => setRoomSlug(event.target.value)}
            className="input"
          >
            <option value="">Not sure yet</option>
            {ROOMS.filter((room) => room.bookable).map((room) => (
              <option key={room.slug} value={room.slug}>
                {room.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Check-in">
            <input
              type="date"
              value={checkIn}
              onChange={(event) => setCheckIn(event.target.value)}
              className="input"
            />
          </Field>
          <Field label="Check-out">
            <input
              type="date"
              value={checkOut}
              onChange={(event) => setCheckOut(event.target.value)}
              className="input"
            />
          </Field>
        </div>
      </div>

      <div className="mt-4">
        <Field label="Message">
          <textarea
            name="message"
            required
            rows={5}
            className="input resize-y"
            placeholder="How many of you are travelling, when you'd like to arrive, anything you need from us."
          />
        </Field>
      </div>

      {/* Honeypot — hidden from people, irresistible to bots. */}
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {status.kind === "error" ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-clay/30 bg-clay/5 px-3 py-2 text-sm text-clay"
        >
          {status.message}{" "}
          {fallbackEmail ? (
            <a className="underline" href={`mailto:${fallbackEmail}`}>
              Email us instead
            </a>
          ) : null}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status.kind === "sending"}
        className="mt-5 w-full rounded-xl bg-forest px-4 py-3 font-medium text-paper transition hover:bg-forest-dark disabled:bg-ink-faint/40 sm:w-auto sm:px-8"
      >
        {status.kind === "sending" ? "Sending…" : "Send message"}
      </button>

    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
