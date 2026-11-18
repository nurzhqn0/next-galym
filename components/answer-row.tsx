import type { Dict } from "@/app/[lang]/dictionaries/en";
import { parseDate } from "@/lib/application-fields";
import type { Locale } from "@/lib/locale";
import { formatDate } from "@/lib/site";
import { ApplyButton } from "./apply-button";

export type Listing = {
  id: string;
  title: string;
  category: string | null;
  applyUrl: string | null;
  deadline: string | null;
  fields: { label: string; type: string; value: string }[];
};

/** A detail value by its type: links open in a new tab, emails send mail, dates read in the page language. */
export function FieldValue({ type, value, lang }: { type: string; value: string; lang: string }) {
  if (type === "url") {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="underline">
        {value}
      </a>
    );
  }
  if (type === "email") {
    return (
      <a href={`mailto:${value}`} className="underline">
        {value}
      </a>
    );
  }
  if (type === "date") {
    const iso = parseDate(value);
    return <>{iso ? formatDate(iso, lang) : value}</>;
  }
  return <span className="whitespace-pre-line">{value}</span>;
}

/** One open application, printed as a numbered question you answer by filling the bubble. */
export function AnswerRow({ n, listing, t, lang, i = 0, wide = false }: { n: number; listing: Listing; t: Dict; lang: Locale; i?: number; wide?: boolean }) {
  const rest = listing.fields.filter((f) => f.value.trim()).slice(0, 4);
  return (
    <li
      className={`print-in grid grid-cols-[2.5rem_1fr] gap-x-4 gap-y-4 border-t-[1.5px] border-ink py-5 ${wide ? "md:grid-cols-[4rem_1fr_auto] md:items-start md:py-6" : ""}`}
      style={{ ["--i" as string]: i }}
    >
      <span className={`label text-4xl text-ink ${wide ? "md:text-5xl" : ""}`} aria-hidden="true">
        {n}
      </span>
      <div className="min-w-0">
        <h3 className={`text-xl font-bold leading-snug ${wide ? "md:text-2xl" : ""}`}>{listing.title}</h3>
        {listing.category && <p className="label mt-1 text-sm text-ink">{listing.category}</p>}
        {(listing.deadline || rest.length > 0) && (
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-base sm:grid-cols-[auto_1fr]">
            {listing.deadline && (
              <div className="contents">
                <dt className="label text-sm text-ink">{t.open.deadline}</dt>
                <dd>{formatDate(listing.deadline, lang)}</dd>
              </div>
            )}
            {rest.map((f) => (
              <div key={f.label} className="contents">
                <dt className="label text-sm text-ink">{f.label}</dt>
                <dd className="break-words">
                  <FieldValue type={f.type} value={f.value} lang={lang} />
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <div className={`col-start-2 ${wide ? "md:col-start-3" : ""}`}>
        <ApplyButton applicationId={listing.id} applyUrl={listing.applyUrl} lang={lang} labels={t.open} name={listing.title} />
      </div>
    </li>
  );
}
