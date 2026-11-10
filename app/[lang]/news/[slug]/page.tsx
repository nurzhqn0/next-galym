import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { NewsCard } from "@/components/news-card";
import { latestNews } from "@/lib/data";
import { isBlobUrl } from "@/lib/images";
import { getPublicNews } from "@/lib/services/news";
import { formatDate } from "@/lib/site";
import type { Locale } from "@/lib/locale";
import { getDictionary, getLocale } from "../../dictionaries";

async function article(slug: string, lang: Locale) {
  "use cache";
  cacheTag("news");
  cacheLife("minutes");
  return getPublicNews(slug, lang).catch(() => null);
}

async function Article({ params }: { params: PageProps<"/[lang]/news/[slug]">["params"] }) {
  const { slug } = await params;
  const lang = await getLocale();
  const t = await getDictionary();
  const n = await article(slug, lang);
  if (!n) notFound();
  // Set when the post has no text in this language and another translation is shown.
  const textLang = n.locale && n.locale !== lang ? n.locale : undefined;
  return (
    <article className="pl-[calc(var(--track)+1rem)] pr-4 pb-24 pt-10 md:pl-[calc(var(--track)+2rem)] md:pr-8 md:pt-14">
      <div className="mx-auto max-w-[60rem]">
        <header className="mx-auto max-w-[44rem]">
          <Link href={`/${lang}/news`} className="label inline-flex min-h-11 items-center gap-2 text-ink underline-offset-4 hover:underline">
            <span aria-hidden="true">←</span>
            {t.news.back}
          </Link>
          {n.publishedAt && (
            <time dateTime={new Date(n.publishedAt).toISOString()} className="label mt-6 block text-ink">
              {formatDate(n.publishedAt, lang)}
            </time>
          )}
          <h1 lang={textLang} className="display mt-3 text-[clamp(2.5rem,7vw,4.5rem)] text-ink">{n.title}</h1>
        </header>
        {/* A cover saved before uploads existed may live elsewhere; next/image only loads from the Blob store. */}
        {n.coverImageUrl && isBlobUrl(n.coverImageUrl) && (
          <div className="relative mt-10 aspect-[16/9] border-[2.5px] border-ink bg-stock-lit">
            <Image src={n.coverImageUrl} alt="" fill preload sizes="(min-width: 64rem) 60rem, 100vw" className="object-cover" />
          </div>
        )}
        {/* Plain text only: paragraphs split on blank lines, never injected as HTML. */}
        <div lang={textLang} className="mx-auto mt-10 grid max-w-[44rem] gap-5 text-xl leading-relaxed">
          {n.content?.split(/\n{2,}/).map((p, i) => (
            <p key={i} className="max-w-[65ch]">
              {p}
            </p>
          ))}
        </div>
      </div>
      <Suspense>
        <MoreNews lang={lang} slug={slug} title={t.news.more} all={t.news.all} />
      </Suspense>
    </article>
  );
}

/** Up to three other recent posts under the article, as the same cards as the news list. */
async function MoreNews({ lang, slug, title, all }: { lang: Locale; slug: string; title: string; all: string }) {
  const others = (await latestNews(lang, 4)).filter((n) => n.slug !== slug).slice(0, 3);
  if (!others.length) return null;
  return (
    <section aria-labelledby="more-news" className="rule mx-auto mt-20 max-w-[1240px] pt-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h2 id="more-news" className="display text-4xl md:text-5xl">
          {title}
        </h2>
        <Link href={`/${lang}/news`} className="field label">
          {all}
        </Link>
      </div>
      <ul className="grid gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {others.map((n) => (
          <li key={n.id}>
            <NewsCard item={n} lang={lang} sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function NewsArticle(props: PageProps<"/[lang]/news/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-[50vh]" />}>
      <Article params={props.params} />
    </Suspense>
  );
}
