"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { NewsCard, type NewsItem } from "@/components/news-card";

/** Home-page news: photo cards in a row that scrolls sideways, with arrows and one dash per page. */
export function NewsCarousel({
  heading,
  lang,
  items,
  labels,
}: {
  heading: React.ReactNode;
  lang: string;
  items: NewsItem[];
  labels: { prev: string; next: string; page: string };
}) {
  const track = useRef<HTMLUListElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  // Pages are counted in cards: one page is as many cards as fit the track, so it matches the snap points.
  function geometry(el: HTMLUListElement) {
    const cards = Array.from(el.children) as HTMLElement[];
    const step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : el.clientWidth;
    const gap = cards.length > 1 ? step - cards[0].offsetWidth : 0;
    const perView = Math.max(1, Math.round((el.clientWidth + gap) / step));
    return { cards, step, perView, total: Math.max(1, Math.ceil(cards.length / perView)) };
  }

  // The page follows the scroll position, so swiping and the arrows stay in step.
  function measure() {
    const el = track.current;
    if (!el) return;
    const { step, perView, total } = geometry(el);
    // Hidden or not laid out yet (width 0): keep the last good values.
    if (!el.clientWidth || !(step > 0) || !Number.isFinite(total)) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setPages(total);
    setPage(atEnd ? total - 1 : Math.min(total - 1, Math.floor(Math.round(el.scrollLeft / step) / perView)));
  }

  const onResize = useEffectEvent(measure);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(() => onResize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function go(to: number) {
    const el = track.current;
    if (!el) return;
    const { cards, step, perView, total } = geometry(el);
    if (!el.clientWidth || !(step > 0) || !Number.isFinite(total)) return;
    const first = cards[Math.min(Math.max(0, Math.min(to, total - 1)) * perView, cards.length - 1)];
    el.scrollTo({
      left: Math.min(first ? first.offsetLeft : 0, el.scrollWidth - el.clientWidth),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        {heading}
        {pages > 1 && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => go(page - 1)}
              disabled={page === 0}
              aria-label={labels.prev}
              className="choose disabled:opacity-35"
            >
              <span className="bubble" data-filled="false" aria-hidden="true">
                ←
              </span>
            </button>
            <button
              type="button"
              onClick={() => go(page + 1)}
              disabled={page >= pages - 1}
              aria-label={labels.next}
              className="choose disabled:opacity-35"
            >
              <span className="bubble" data-filled="false" aria-hidden="true">
                →
              </span>
            </button>
          </div>
        )}
      </div>

      <ul
        ref={track}
        onScroll={measure}
        className="relative flex snap-x snap-mandatory gap-5 overflow-x-auto [scrollbar-width:none] md:gap-6 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((n) => (
          <li key={n.id} className="w-[85%] shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-3rem)/3)]">
            <NewsCard item={n} lang={lang} sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 85vw" />
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <div className="mt-4 flex justify-center gap-1">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={labels.page.replace("{n}", String(i + 1)).replace("{total}", String(pages))}
              aria-current={i === page ? "true" : undefined}
              className="grid h-11 w-11 place-items-center"
            >
              <span
                className={`block h-[6px] w-8 border-2 border-ink transition-colors ${i === page ? "bg-ink" : ""}`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
