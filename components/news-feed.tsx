"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { NewsCard, type NewsItem } from "@/components/news-card";

type Labels = { more: string; loading: string; retry: string };

/** The news list as a card grid, newest post wide on top: the first batch comes with the page, the next one loads as the reader nears the end. */
export function NewsFeed({
  lang,
  initial,
  total,
  batch,
  t,
}: {
  lang: string;
  initial: NewsItem[];
  total: number;
  batch: number;
  t: Labels;
}) {
  const [items, setItems] = useState(initial);
  // Rows received so far, which is where the next request starts.
  const [fetched, setFetched] = useState(initial.length);
  const [status, setStatus] = useState<"idle" | "loading" | "failed" | "end">(initial.length < total ? "idle" : "end");
  const busy = useRef(false);
  const button = useRef<HTMLButtonElement>(null);

  async function loadMore() {
    if (busy.current) return;
    busy.current = true;
    setStatus("loading");
    try {
      const res = await fetch(`/api/v1/news?lang=${lang}&limit=${batch}&offset=${fetched}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const next: NewsItem[] = await res.json();
      // A post published meanwhile pushes the rest down one place: skip a post that is already shown.
      setItems((shown) => [...shown, ...next.filter((n) => !shown.some((s) => s.id === n.id))]);
      setFetched(fetched + next.length);
      setStatus(next.length < batch || fetched + next.length >= total ? "end" : "idle");
    } catch {
      setStatus("failed");
    } finally {
      busy.current = false;
    }
  }

  // Loads when the button comes within 200px of the screen. Checked again after every batch, in case
  // the button is still in view. After a failure it waits for a click.
  const nearEnd = useEffectEvent(() => {
    if (status === "idle") loadMore();
  });
  useEffect(() => {
    const el = button.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && nearEnd(), { rootMargin: "0px 0px 200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [fetched]);

  return (
    <>
      <ul className="grid gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {items.map((n, i) => (
          <li
            key={n.id}
            style={i < initial.length ? undefined : { ["--i" as string]: Math.min(i % batch, 3) }}
            className={`${i === 0 ? "sm:col-span-2 lg:col-span-3" : ""} ${i < initial.length ? "" : "print-in"}`}
          >
            <NewsCard
              item={n}
              lang={lang}
              lead={i === 0}
              sizes={i === 0 ? "(min-width: 1280px) 1240px, 100vw" : "(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"}
            />
          </li>
        ))}
      </ul>
      {status !== "end" && (
        <div aria-live="polite" className="mt-8">
          <button ref={button} type="button" onClick={loadMore} aria-disabled={status === "loading"} className="field label">
            {status === "loading" ? t.loading : status === "failed" ? t.retry : t.more}
          </button>
        </div>
      )}
    </>
  );
}
