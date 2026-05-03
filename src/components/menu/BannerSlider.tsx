"use client";

/**
 * BannerSlider — Promotional offer carousel for the customer menu page
 *
 * - Fetches active offers from Firestore in real-time
 * - Auto-advances every 4 seconds with a CSS progress bar
 * - Background image support (overlaid on gradient)
 * - Touch/mouse swipe support
 * - Dot navigation + arrow buttons
 * - Shows nothing when there are no active offers
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { listenToCollection, Collections } from "@/lib/firebase/firestore";
import { type OfferDoc } from "@/types/index";
import { orderBy } from "firebase/firestore";

type OfferWithId = OfferDoc & { id: string };

// ---------------------------------------------------------------------------
// Gradient → Tailwind class map (static so Tailwind purge sees them)
// ---------------------------------------------------------------------------

const GRADIENT_MAP: Record<string, string> = {
  "orange-red":    "from-orange-500 to-red-500",
  "purple-pink":   "from-purple-600 to-pink-500",
  "blue-cyan":     "from-blue-600 to-cyan-400",
  "green-teal":    "from-green-500 to-teal-400",
  "yellow-orange": "from-yellow-400 to-orange-500",
  "rose-purple":   "from-rose-500 to-purple-600",
  "sky-indigo":    "from-sky-500 to-indigo-600",
};

function getGradient(from: string) {
  return GRADIENT_MAP[from] ?? "from-orange-500 to-red-500";
}

// ---------------------------------------------------------------------------
// BannerSlider
// ---------------------------------------------------------------------------

const AUTO_INTERVAL = 4500;

export default function BannerSlider() {
  const [offers, setOffers] = useState<OfferWithId[]>([]);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Firestore live listener
  useEffect(() => {
    const unsub = listenToCollection<OfferDoc>(
      Collections.OFFERS,
      (docs) => {
        const active = (docs as OfferWithId[])
          .filter((o) => o.isActive)
          .sort((a, b) => a.order - b.order);
        setOffers(active);
        setCurrent(0);
      },
      [orderBy("order", "asc")]
    );
    return () => unsub();
  }, []);

  // Auto-advance with progress bar
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(0);

    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + (100 / (AUTO_INTERVAL / 50)), 100));
    }, 50);

    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % offers.length);
      setProgress(0);
    }, AUTO_INTERVAL);
  }, [offers.length]);

  useEffect(() => {
    if (offers.length > 1) startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [offers.length, startTimer]);

  const goTo = (idx: number) => { setCurrent(idx); startTimer(); };
  const goPrev = () => goTo((current - 1 + offers.length) % offers.length);
  const goNext = () => goTo((current + 1) % offers.length);

  // Touch / drag swipe
  const onDragStart = (x: number) => { setDragging(true); dragStart.current = x; };
  const onDragEnd = (x: number) => {
    if (!dragging) return;
    setDragging(false);
    const diff = dragStart.current - x;
    if (Math.abs(diff) > 40) diff > 0 ? goNext() : goPrev();
  };

  if (offers.length === 0) return null;

  return (
    <div className="px-4 pt-4 max-w-7xl mx-auto">
      {/* Slider track */}
      <div
        className="relative overflow-hidden rounded-2xl select-none cursor-grab active:cursor-grabbing"
        style={{ minHeight: 148 }}
        onMouseDown={(e) => onDragStart(e.clientX)}
        onMouseUp={(e) => onDragEnd(e.clientX)}
        onTouchStart={(e) => onDragStart(e.touches[0].clientX)}
        onTouchEnd={(e) => onDragEnd(e.changedTouches[0].clientX)}
      >
        {offers.map((offer, i) => {
          const gradient = getGradient(offer.bgFrom);
          const isVisible = i === current;

          return (
            <div
              key={offer.id}
              className={[
                "absolute inset-0 transition-all duration-500 ease-in-out",
                isVisible ? "opacity-100 scale-100" : "opacity-0 scale-[0.98] pointer-events-none",
              ].join(" ")}
              aria-hidden={!isVisible}
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />

              {/* Background image (if present) */}
              {offer.imageUrl && (
                <>
                  <img
                    src={offer.imageUrl}
                    alt={offer.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable={false}
                  />
                  {/* Gradient overlay so text stays readable */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                </>
              )}

              {/* Decorative circles (only when no image) */}
              {!offer.imageUrl && (
                <>
                  <div className="absolute -top-8 -right-8 h-36 w-36 rounded-full bg-white/10" />
                  <div className="absolute -bottom-12 -left-6 h-44 w-44 rounded-full bg-white/10" />
                  <div className="absolute top-4 right-24 h-16 w-16 rounded-full bg-white/5" />
                </>
              )}

              {/* Content */}
              <div className="relative z-10 flex items-center gap-4 p-5 min-h-[148px]">
                {/* Emoji shown only when no image */}
                {!offer.imageUrl && offer.emoji && (
                  <div className="text-5xl shrink-0 drop-shadow-lg" aria-hidden="true">
                    {offer.emoji}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {offer.badge && (
                    <span className="inline-block mb-1.5 rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                      {offer.badge}
                    </span>
                  )}
                  <h2 className="text-xl font-extrabold text-white leading-tight tracking-tight drop-shadow-md">
                    {offer.title}
                  </h2>
                  <p className="mt-0.5 text-sm text-white/80 line-clamp-2 leading-snug drop-shadow">
                    {offer.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Progress bar */}
        {offers.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 z-20">
            <div
              className="h-full bg-white/60 transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Prev / Next arrows (desktop) */}
        {offers.length > 1 && (
          <>
            <button
              id="btn-banner-prev"
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 hidden sm:flex h-7 w-7 items-center justify-center rounded-full bg-black/25 hover:bg-black/50 text-white backdrop-blur-sm transition-all"
              aria-label="Previous offer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              id="btn-banner-next"
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 hidden sm:flex h-7 w-7 items-center justify-center rounded-full bg-black/25 hover:bg-black/50 text-white backdrop-blur-sm transition-all"
              aria-label="Next offer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}

        {/* Slide counter badge (top-right) */}
        {offers.length > 1 && (
          <div className="absolute top-2 right-2 z-20 rounded-full bg-black/30 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-white/80">
            {current + 1} / {offers.length}
          </div>
        )}
      </div>

      {/* Dot navigation */}
      {offers.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2.5" role="tablist" aria-label="Offer slides">
          {offers.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === current}
              onClick={() => goTo(i)}
              className={[
                "rounded-full transition-all duration-300",
                i === current
                  ? "w-5 h-1.5 bg-orange-500"
                  : "w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60",
              ].join(" ")}
              aria-label={`Go to offer ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
