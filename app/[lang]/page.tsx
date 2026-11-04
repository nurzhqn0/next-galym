import Link from "next/link";
import { AnswerRow } from "@/components/answer-row";
import { latestArchives, latestNews, openApplications } from "@/lib/data";
import { DRIVE_URL, formatDate, formatSize } from "@/lib/site";
import { getDictionary, getLocale } from "./dictionaries";

const pad = "pl-[calc(var(--track)+1rem)] pr-4 md:pl-[calc(var(--track)+2rem)] md:pr-8";
const wrap = "mx-auto max-w-[1240px]";

export default async function Home() {
  const lang = await getLocale();
  const t = await getDictionary();
  const [listings, news, archives] = await Promise.all([
    openApplications(3),
    latestNews(lang, 3),
    latestArchives(lang, 3),
  ]);

  return (
    <>
      {/* CTA: the first sheet */}
      <section className={`relative ${pad} pb-20 pt-10 md:pt-14`} aria-labelledby="hero">
        <div className={`${wrap} grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-start lg:gap-14`}>
          <div>
            <h1 id="hero" className="display text-[clamp(3.25rem,10.5vw,6rem)] text-ink">
              {t.hero.headline}
            </h1>
            <p className="mt-6 max-w-[40ch] text-xl md:text-2xl">{t.hero.sub}</p>
            <div className="mt-8">
              <Link href={`/${lang}/applications`} className="field field-solid label min-h-14 px-7 text-lg">
                {t.hero.cta}
              </Link>
            </div>
          </div>

          <div className="relative border-[2.5px] border-ink bg-stock-lit p-5 md:p-7">
            <span className="crosshair -left-3 -top-3" aria-hidden="true" />
            <span className="crosshair -right-3 -top-3" aria-hidden="true" />
            <span className="crosshair -bottom-3 -left-3" aria-hidden="true" />
            <span className="crosshair -bottom-3 -right-3" aria-hidden="true" />
            <h2 className="display text-4xl">{t.open.title}</h2>
            {listings.length > 0 ? (
              <ol className="mt-4">
                {listings.map((l, i) => (
                  <AnswerRow key={l.id} n={i + 1} listing={l} t={t} lang={lang} i={i} />
                ))}
              </ol>
            ) : (
              <div className="mt-5 grid gap-4 border-t-[2.5px] border-ink pt-6">
                <span className="flex gap-2" aria-hidden="true">
                  {["A", "B", "C", "D"].map((c) => (
                    <span key={c} className="bubble" data-filled="false">
                      {c}
                    </span>
                  ))}
                </span>
                <div>
                  <p className="text-xl font-bold">{t.open.empty}</p>
                  <p className="mt-1">{t.open.emptyHint}</p>
                </div>
              </div>
            )}
            <div className="mt-6">
              <Link href={`/${lang}/applications`} className="field label">
                {t.open.all}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About us */}
      <section id="about" className={`${pad} scroll-mt-4 pb-20`} aria-labelledby="about-h">
        <div className={`${wrap} rule pt-10`}>
          <div className="grid gap-10 md:grid-cols-[1fr_1.1fr] md:gap-16">
            <div>
              <h2 id="about-h" className="display text-4xl md:text-6xl">
                {t.about.title}
              </h2>
              <p className="mt-6 max-w-[32ch] text-2xl font-bold leading-snug">{t.about.lead}</p>
              <p className="mt-4 max-w-[52ch]">{t.about.pending}</p>
              <p className="mt-6">
                <span className="stamp">{t.about.draft}</span>
              </p>
            </div>
            <div>
              <h3 className="label mb-4 text-xl">{t.about.stepsTitle}</h3>
              <ol className="grid gap-3">
                {t.about.steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-4 border-[2.5px] border-ink bg-stock-lit p-3">
                    <span className="bubble" data-filled="false" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className="text-lg">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Results: score fields stay empty until real figures are supplied */}
      <section id="results" className={`${pad} scroll-mt-4 pb-20`} aria-labelledby="results-h">
        <div className={`${wrap} rule pt-10`}>
          <div className="grid gap-8 md:grid-cols-[1fr_1.1fr] md:gap-16">
            <h2 id="results-h" className="display text-4xl md:text-6xl">
              {t.results.title}
            </h2>
            <div className="grid gap-5">
              <div className="comb comb-lg" role="img" aria-label={t.results.cell}>
                <span /> <span /> <span /> <span />
              </div>
              <p className="max-w-[44ch]">{t.results.note}</p>
              <p>
                <span className="stamp">{t.results.pending}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* News */}
      <section id="news" className={`${pad} scroll-mt-4 pb-20`} aria-labelledby="news-h">
        <div className={`${wrap} rule pt-10`}>
          <h2 id="news-h" className="display mb-6 text-4xl md:text-6xl">
            {t.news.title}
          </h2>
          {news.length > 0 ? (
            <ul>
              {news.map((n) => (
                <li key={n.id} className="grid gap-1 border-t-[2.5px] border-ink py-5 first:border-t-0 md:grid-cols-[14rem_1fr] md:gap-8">
                  <time dateTime={new Date(n.publishedAt ?? 0).toISOString()} className="label text-ink">
                    {n.publishedAt ? formatDate(n.publishedAt, lang) : ""}
                  </time>
                  <Link href={`/${lang}/news/${n.slug}`} className="inline-block py-2 text-xl font-bold leading-snug hover:underline md:text-2xl">
                    {n.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-lg">{t.news.empty}</p>
          )}
          <div className="mt-6">
            <Link href={`/${lang}/news`} className="field label">
              {t.news.all}
            </Link>
          </div>
        </div>
      </section>

      {/* Login: the one drenched band */}
      <section className={`on-ink bg-ink text-stock ${pad} py-20`} aria-labelledby="login-h">
        <div className={`${wrap} grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end md:gap-16`}>
          <div>
            <h2 id="login-h" className="display max-w-[18ch] text-4xl md:text-6xl">
              {t.login.title}
            </h2>
            <p className="mt-5 max-w-[48ch] text-lg">{t.login.text}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/${lang}/login`} className="field field-solid label min-h-14 px-7 text-lg">
              {t.login.login}
            </Link>
            <Link href={`/${lang}/register`} className="field label min-h-14 px-7 text-lg">
              {t.login.register}
            </Link>
          </div>
        </div>
      </section>

      {/* Archive */}
      <section id="archive" className={`${pad} scroll-mt-4 py-20`} aria-labelledby="archive-h">
        <div className={wrap}>
          <h2 id="archive-h" className="display mb-6 text-4xl md:text-6xl">
            {t.archive.title}
          </h2>
          <div className="grid gap-4">
            <a
              href={DRIVE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="choose grid grid-cols-[auto_1fr] items-center gap-5 border-[2.5px] border-ink bg-stock-lit p-5 hover:bg-stock md:p-6"
            >
              <span className="bubble" data-filled="false" aria-hidden="true">
                A
              </span>
              <span>
                <span className="block text-xl font-bold md:text-2xl">{t.archive.driveTitle}</span>
                <span className="mt-1 block max-w-[56ch]">{t.archive.driveText}</span>
                <span className="label mt-2 inline-block text-ink underline">{t.archive.open}</span>
              </span>
            </a>
            {archives.map((a, i) => (
              <a
                key={a.id}
                href={a.fileUrl}
                rel="noopener noreferrer"
                className="choose grid grid-cols-[auto_1fr] items-center gap-5 border-[2.5px] border-ink bg-stock-lit p-5 hover:bg-stock md:p-6"
              >
                <span className="bubble" data-filled="false" aria-hidden="true">
                  {String.fromCharCode(66 + i)}
                </span>
                <span>
                  <span className="block text-xl font-bold md:text-2xl">{a.title}</span>
                  {a.description && <span className="mt-1 block max-w-[56ch]">{a.description}</span>}
                  <span className="label mt-2 inline-block text-ink">
                    {a.fileType} · {formatSize(a.fileSize)} · {t.archive.download}
                  </span>
                </span>
              </a>
            ))}
          </div>
          <div className="mt-6">
            <Link href={`/${lang}/archives`} className="field label">
              {t.archive.all}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
