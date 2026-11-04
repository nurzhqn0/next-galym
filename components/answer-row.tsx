import type { Dict } from "@/app/[lang]/dictionaries/en";
import type { Locale } from "@/lib/locale";
import { ApplyButton } from "./apply-button";

export type Listing = { id: string; formTitle: string; data: Record<string, string> };

/** One open application, printed as a numbered question you answer by filling the bubble. */
export function AnswerRow({ n, listing, t, lang, i = 0, wide = false }: { n: number; listing: Listing; t: Dict; lang: Locale; i?: number; wide?: boolean }) {
  const entries = Object.entries(listing.data).filter(([, v]) => v.trim());
  const [title, ...rest] = entries;
  return (
    <li
      className={`print-in grid grid-cols-[2.5rem_1fr] gap-x-4 gap-y-4 border-t-[2.5px] border-ink py-5 ${wide ? "md:grid-cols-[4rem_1fr_auto] md:items-start md:py-6" : ""}`}
      style={{ ["--i" as string]: i }}
    >
      <span className={`label text-4xl text-ink ${wide ? "md:text-5xl" : ""}`} aria-hidden="true">
        {n}
      </span>
      <div className="min-w-0">
        <h3 className={`text-xl font-bold leading-snug ${wide ? "md:text-2xl" : ""}`}>{title ? title[1] : listing.formTitle}</h3>
        <p className="label mt-1 text-sm text-ink">{listing.formTitle}</p>
        {rest.length > 0 && (
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-base sm:grid-cols-[auto_1fr]">
            {rest.slice(0, 4).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="label text-sm text-ink">{k}</dt>
                <dd className="break-words">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <div className={`col-start-2 ${wide ? "md:col-start-3" : ""}`}>
        <ApplyButton applicationId={listing.id} lang={lang} labels={t.open} name={title ? title[1] : listing.formTitle} />
      </div>
    </li>
  );
}
