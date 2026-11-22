"use client";

import { useEffect, useRef, useState } from "react";
import type { Dict } from "@/app/[lang]/dictionaries/en";
import type { Locale } from "@/lib/locale";
import { ApplyButton } from "./apply-button";

export type Listing = { id: string; formTitle: string; applyUrl: string | null; data: Record<string, string> };

const DAY = 86_400_000;

/** A field from the listing's form data, matched by name regardless of case or spacing. */
const field = (l: Listing, name: string) =>
  (Object.entries(l.data).find(([k]) => k.trim().toLowerCase() === name)?.[1] ?? "").trim();

/** The three filters and the value each one reads from a listing. */
const keys = {
  Country: (l: Listing) => field(l, "location") || field(l, "country"),
  Type: (l: Listing) => l.formTitle,
  Coverage: (l: Listing) => field(l, "coverage"),
};
type FilterName = keyof typeof keys;
type Selected = Record<FilterName, string[]>;
const names = Object.keys(keys) as FilterName[];
const none: Selected = { Country: [], Type: [], Coverage: [] };

/** Deadline as a UTC timestamp. Accepts DD.MM.YYYY or YYYY-MM-DD; anything else is Infinity (no fixed deadline). */
const deadlineOf = (l: Listing) => {
  const v = field(l, "deadline");
  const dmy = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const [y, m, d] = dmy ? [+dmy[3], +dmy[2], +dmy[1]] : iso ? [+iso[1], +iso[2], +iso[3]] : [0, 0, 0];
  if (!y) return Infinity;
  const ts = Date.UTC(y, m - 1, d), date = new Date(ts);
  // Rejects dates like 31.02.2027, which Date.UTC would roll over into March.
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? ts : Infinity;
};

/** Today's date (midnight UTC), known only after mount so server and client render the same HTML. */
function useToday() {
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => {
    const n = new Date();
    setToday(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
  }, []);
  return today;
}

const chip = (on: boolean) =>
  `flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
    on ? "bg-ink text-stock" : "hover:bg-ink/10"
  }`;

export function AnswerRow({ listing, t, lang, i = 0, today }: {
  listing: Listing; t: Dict; lang: Locale; i?: number; today?: number | null;
}) {
  const ownToday = useToday();
  const now = today ?? ownToday;

  const title = field(listing, "title") || Object.values(listing.data).find((v) => v.trim()) || listing.formTitle;
  const country = keys.Country(listing), coverage = keys.Coverage(listing);
  const ts = deadlineOf(listing);
  const date = ts === Infinity ? null : new Date(ts);
  const days = date && now !== null ? Math.round((ts - now) / DAY) : null;

  const status =
    !date ? "No fixed deadline"
    : days === null ? "…"
    : days < 0 ? "Closed"
    : days === 0 ? "Due today"
    : days === 1 ? "1 day left"
    : `${days} days left`;

  return (
    <li className="print-in list-none py-2" style={{ ["--i" as string]: i }}>
      <article className="rounded-xl bg-stock-lit p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="mt-1 text-sm opacity-75">{[country, listing.formTitle].filter(Boolean).join(" · ")}</p>
          </div>
          {coverage && <span className="shrink-0 rounded-full bg-black/5 px-3 py-1 text-xs font-semibold">{coverage}</span>}
        </div>

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-ink/20 pt-4">
          <div>
            <p className="text-xs uppercase opacity-60">Deadline</p>
            <p className="mt-1 font-semibold">
              {date
                ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
                : field(listing, "deadline") || "Rolling"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{status}</p>
            {date && <p className="text-xs opacity-60">Until application closes</p>}
          </div>
        </div>

        <div className="mt-5">
          <ApplyButton applicationId={listing.id} applyUrl={listing.applyUrl} lang={lang} labels={t.open} name={title} />
        </div>
      </article>
    </li>
  );
}

export function ApplicationsExplorer({ listings, t, lang }: { listings: Listing[]; t: Dict; lang: Locale }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Selected>(none);
  const [open, setOpen] = useState<FilterName | null>(null);
  const [compact, setCompact] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const today = useToday();
  const barRef = useRef<HTMLDivElement>(null);

  // Close the open filter (and the collapsed panel) on any click outside the bar.
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) {
        setOpen(null);
        setExpanded(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  // Shrink the bar once the page is scrolled.
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 180);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const q = search.trim().toLowerCase();

  /** Does a listing pass the search and every filter (optionally ignoring one, for that filter's counts)? */
  const passes = (l: Listing, skip?: FilterName) =>
    (!q || `${l.formTitle} ${Object.values(l.data).join(" ")}`.toLowerCase().includes(q)) &&
    names.every((n) => n === skip || !selected[n].length || selected[n].includes(keys[n](l)));

  // Open listings by nearest deadline, then rolling ones, then closed ones.
  const rank = (l: Listing) => {
    const d = deadlineOf(l);
    return d === Infinity ? 1 : today !== null && d < today ? 2 : 0;
  };
  const filtered = listings
    .filter((l) => passes(l))
    .sort((a, b) => rank(a) - rank(b) || deadlineOf(a) - deadlineOf(b) || 0);

  const options = open ? [...new Set(listings.map(keys[open]))].filter(Boolean).sort() : [];
  const active = names.reduce((sum, n) => sum + selected[n].length, 0);
  const panelVisible = !compact || expanded;

  const toggle = (name: FilterName, v: string) =>
    setSelected((s) => ({ ...s, [name]: s[name].includes(v) ? s[name].filter((x) => x !== v) : [...s[name], v] }));
  const reset = () => { setSearch(""); setSelected(none); setOpen(null); };

  return (
    <div>
      <div ref={barRef} className={`sticky top-0 z-40 border-b-2 border-ink bg-stock-lit transition-all duration-300 ${compact ? "py-2" : "py-5"}`}>
        <div className="flex items-center gap-2">
          <input
            type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search opportunities..." aria-label="Search opportunities"
            className={`min-w-0 flex-1 rounded-full border-2 border-ink bg-transparent px-4 outline-none transition-all duration-300 ${compact ? "py-2 text-sm" : "py-4"}`}
          />
          {compact && (
            <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}
              className="rounded-full border-2 border-ink px-4 py-2 font-bold">
              Filters{active ? ` (${active})` : ""}
            </button>
          )}
        </div>

        <div className={`overflow-y-auto transition-all duration-300 ${panelVisible ? "max-h-[65vh] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {names.map((name) => (
              <button key={name} type="button" onClick={() => setOpen(open === name ? null : name)} aria-expanded={open === name}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-ink px-2 text-sm font-bold transition-colors ${
                  open === name ? "bg-ink text-stock" : "text-ink hover:bg-ink/10"
                }`}>
                {name}{selected[name].length ? ` (${selected[name].length})` : ""}
                <span aria-hidden="true">{open === name ? "⌃" : "⌄"}</span>
              </button>
            ))}
          </div>

          {open && (
            <div className="mt-3 grid gap-2 rounded-xl border-2 border-ink/20 bg-stock-lit p-4 sm:grid-cols-2">
              {options.map((v) => {
                const on = selected[open].includes(v);
                const count = listings.filter((l) => keys[open](l) === v && passes(l, open)).length;
                return (
                  <button key={v} type="button" onClick={() => toggle(open, v)} aria-pressed={on} className={chip(on)}>
                    <span>{v}</span>
                    <span className="rounded-full border border-current/20 px-2 py-0.5 text-xs">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="my-5 flex items-center justify-between gap-3">
        <p className="font-semibold">
          {filtered.length} {filtered.length === 1 ? "opportunity" : "opportunities"} found
        </p>
        {(q || active > 0) && (
          <button type="button" onClick={reset} className="text-sm font-bold underline underline-offset-4">
            Clear all
          </button>
        )}
      </div>

      {filtered.length ? (
        <ol className="grid gap-3">
          {filtered.map((l, i) => (
            <AnswerRow key={l.id} listing={l} t={t} lang={lang} i={Math.min(i, 5)} today={today} />
          ))}
        </ol>
      ) : (
        <p className="py-8 text-center">No matching opportunities.</p>
      )}
    </div>
  );
}