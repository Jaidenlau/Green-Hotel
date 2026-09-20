"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/rooms";

export type GalleryItem = Photo & {
  roomName: string;
  /** Marks a room that exists but is not on sale yet. */
  comingSoon?: boolean;
};

export function Gallery({ items }: { items: GalleryItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (delta: number) =>
      setOpen((current) =>
        current === null
          ? null
          : (current + delta + items.length) % items.length,
      ),
    [items.length],
  );

  // Arrow keys and Escape are what people reach for in a lightbox.
  useEffect(() => {
    if (open === null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKey);
    // Stop the page behind the overlay scrolling with it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [close, open, step]);

  if (items.length === 0) return null;
  const active = open === null ? null : items[open];

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, index) => (
          <li key={item.src}>
            <button
              type="button"
              onClick={() => setOpen(index)}
              className="group relative block aspect-4/3 w-full overflow-hidden rounded-xl border border-line bg-paper-raised"
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition duration-500 group-hover:scale-[1.04]"
              />
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-linear-to-t from-ink/70 to-transparent px-3 pb-2 pt-8 text-left text-xs font-medium text-paper">
                {item.roomName}
                {item.comingSoon ? (
                  <span className="rounded-full bg-paper/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                    Soon
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.alt}
          onClick={close}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-paper/10 text-2xl text-paper hover:bg-paper/20"
          >
            ×
          </button>

          {items.length > 1 ? (
            <>
              <NavButton side="left" onClick={() => step(-1)} />
              <NavButton side="right" onClick={() => step(1)} />
            </>
          ) : null}

          <figure
            onClick={(event) => event.stopPropagation()}
            className="max-h-full w-full max-w-4xl"
          >
            <div className="relative mx-auto aspect-4/3 w-full">
              <Image
                src={active.src}
                alt={active.alt}
                fill
                sizes="90vw"
                className="rounded-xl object-contain"
              />
            </div>
            <figcaption className="mt-3 text-center text-sm text-paper/70">
              {active.roomName} — {active.alt}
            </figcaption>
          </figure>
        </div>
      ) : null}
    </>
  );
}

function NavButton({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={[
        "absolute top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-paper/10 text-2xl text-paper hover:bg-paper/20",
        side === "left" ? "left-3" : "right-3",
      ].join(" ")}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  );
}
