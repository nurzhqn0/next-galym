import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { latestNews } from "@/lib/data";
import { formatDate } from "@/lib/site";
import { getDictionary, getLocale } from "../dictionaries";

export async function generateMetadata() {
  return { title: (await getDictionary()).news.title };
}

export default async function NewsPage() {
  const lang = await getLocale();
  const t = await getDictionary();
  const items = await latestNews(lang, 50);
  return (
    <PageShell title={t.news.title}>
      {items.length ? (
        <ul>
          {items.map((n) => (
            <li key={n.id} className="grid gap-1 border-t-[2.5px] border-ink py-5 md:grid-cols-[14rem_1fr] md:gap-8">
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
    </PageShell>
  );
}
