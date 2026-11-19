"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Dict } from "@/app/[lang]/dictionaries/en";
import type { Locale } from "@/lib/locale";
import { normalizeCountry } from "@/lib/countries";
import { useApplicationsFilter } from "@/lib/stores/applications-filter";
import { AnswerRow, type Listing } from "./answer-row";

type Props = {
  listings: (Listing & { countries: string[] })[];
  counts: { code: string; count: number }[];
  none: number;
  initial: string | undefined;
  lang: Locale;
  t: Dict;
  labels: Record<string, string>;
  map: React.ReactNode;
};

const modified = (e: React.MouseEvent) => e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

/** Chips, map and list of the applications page. Selecting filters on the client and only updates the URL. */
export function ApplicationsBrowser({ listings, counts, none, initial, lang, t, labels, map }: Props) {
  const stored = useApplicationsFilter((s) => s.country);
  const select = useApplicationsFilter((s) => s.select);
  // Until mounted, show the server's selection so the first paint matches the server HTML.
  const [ready, setReady] = useState(false);
  const country = ready ? stored : initial;

  const params = useSearchParams();

  useEffect(() => {
    select(normalizeCountry(params.get("country")));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- switch from the server selection to the store
    setReady(true);
  }, [params, select]);

  // Links to this same page from elsewhere (header, footer) are served from Next's cache and never update
  // useSearchParams, so handle them here, before next/link does.
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.<HTMLAnchorElement>("a[href]");
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download") || root.current?.contains(a)) return;
      const url = new URL(a.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname) return;
      e.preventDefault();
      select(normalizeCountry(url.searchParams.get("country")));
      const next = url.pathname + url.search;
      if (next !== location.pathname + location.search) history.pushState(null, "", next);
    };
    document.addEventListener("click", onDocClick, true);
    return () => document.removeEventListener("click", onDocClick, true);
  }, [select]);

  const base = `/${lang}/applications`;
  const href = (code?: string) => (code ? `${base}?country=${code}` : base);
  const go = (code: string | undefined) => {
    const next = code === country ? undefined : code;
    if (next === country) return;
    select(next);
    history.pushState(null, "", href(next));
  };

  const link = (code: string | undefined, label: string, count?: number) => (
    <li key={code ?? "all"}>
      <a
        href={href(code)}
        aria-current={country === code ? "page" : undefined}
        className="field label"
        onClick={(e) => {
          if (modified(e)) return;
          e.preventDefault();
          go(code);
        }}
      >
        {label}
        {count !== undefined && <span className="ml-1.5 tabular-nums">{count}</span>}
      </a>
    </li>
  );

  const shown = listings.filter((l) =>
    country === "none" ? l.countries.length === 0 : country ? l.countries.includes(country) : true,
  );

  return (
    <div ref={root}>
      {country && /^[A-Z]{2}$/.test(country) && (
        <style>{`[data-map] a[data-code="${country}"] :is(path,circle):not([fill="transparent"]){fill:var(--color-ink-deep)}[data-map] a.group[data-code="${country}"]{transform:scale(1.1)}`}</style>
      )}
      <div
        onClickCapture={(e) => {
          const a = (e.target as Element).closest<HTMLElement>("a[data-code]");
          if (!a || modified(e)) return;
          e.preventDefault();
          go(a.dataset.code);
        }}
      >
        {map}
      </div>
      <nav aria-label={t.open.mapLabel} className="mb-6">
        <ul className="flex flex-wrap gap-2">
          {link(undefined, t.open.all)}
          {counts.map(({ code, count }) => link(code, labels[code] ?? code, count))}
          {none > 0 && link("none", t.open.online, none)}
        </ul>
      </nav>
      <p aria-live="polite" className="sr-only">
        {shown.length ? `${t.open.count}: ${shown.length}` : country && country !== "none" ? t.open.emptyCountry : t.open.empty}
      </p>
      {shown.length ? (
        <ol className="border-b-[1.5px] border-ink">
          {shown.map((l, i) => (
            <AnswerRow key={l.id} n={i + 1} listing={l} t={t} lang={lang} i={Math.min(i, 5)} wide />
          ))}
        </ol>
      ) : (
        <div className="rounded-2xl border-[1.5px] border-ink bg-stock-lit p-6">
          <p className="text-xl font-bold">{country && country !== "none" ? t.open.emptyCountry : t.open.empty}</p>
          <p className="mt-1">{t.open.emptyHint}</p>
        </div>
      )}
    </div>
  );
}
