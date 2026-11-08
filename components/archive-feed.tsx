"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ArchiveRow, type ArchiveItem } from "@/components/archive-row";

type Labels = { openLink: string; more: string; loading: string; retry: string };

/** The archive list: the first batch comes with the page, the next one loads as the reader nears the end. */
export function ArchiveFeed({
  lang,
  initial,
  total,
  batch,
  t,
}: {
  lang: string;
  initial: ArchiveItem[];
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
      const res = await fetch(`/api/v1/archives?lang=${lang}&limit=${batch}&offset=${fetched}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const next: ArchiveItem[] = await res.json();
      // An entry added meanwhile pushes the rest down one place: skip a row that is already shown.
      setItems((shown) => [...shown, ...next.filter((a) => !shown.some((s) => s.id === a.id))]);
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
      <div className="grid gap-4">
        {items.map((a, i) => (
          <div
            key={a.id}
            style={i < initial.length ? undefined : { ["--i" as string]: Math.min(i % batch, 3) }}
            className={i < initial.length ? undefined : "print-in"}
          >
            <ArchiveRow item={a} letter={String.fromCharCode(65 + (i % batch))} openLabel={t.openLink} />
          </div>
        ))}
      </div>
      {status !== "end" && (
        <div aria-live="polite" className="mt-6">
          <button ref={button} type="button" onClick={loadMore} aria-disabled={status === "loading"} className="field label">
            {status === "loading" ? t.loading : status === "failed" ? t.retry : t.more}
          </button>
        </div>
      )}
    </>
  );
}
