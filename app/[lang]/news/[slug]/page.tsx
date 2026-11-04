import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
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
  return (
    <article className="pl-[calc(var(--track)+1rem)] pr-4 pb-24 pt-10 md:pl-[calc(var(--track)+2rem)] md:pr-8 md:pt-14">
      <div className="mx-auto max-w-[44rem]">
        <Link href={`/${lang}/news`} className="field label">
          {t.news.back}
        </Link>
        <h1 className="display mt-8 text-[clamp(2.5rem,7vw,4.5rem)] text-ink">{n.title}</h1>
        {n.publishedAt && (
          <p className="label mt-4 text-ink">
            {t.news.published}: <time dateTime={new Date(n.publishedAt).toISOString()}>{formatDate(n.publishedAt, lang)}</time>
          </p>
        )}
        {/* Plain text only: paragraphs split on blank lines, never injected as HTML. */}
        <div className="mt-8 grid gap-5 text-xl leading-relaxed">
          {n.content?.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    </article>
  );
}

export default function NewsArticle(props: PageProps<"/[lang]/news/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-[50vh]" />}>
      <Article params={props.params} />
    </Suspense>
  );
}
