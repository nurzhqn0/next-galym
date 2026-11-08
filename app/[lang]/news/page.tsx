import { NewsFeed } from "@/components/news-feed";
import { PageShell } from "@/components/page-shell";
import { latestNews, newsCount } from "@/lib/data";
import { getDictionary, getLocale } from "../dictionaries";

// Ten at a time, like the archive page.
const BATCH = 10;

export async function generateMetadata() {
  return { title: (await getDictionary()).news.title };
}

export default async function NewsPage() {
  const lang = await getLocale();
  const t = await getDictionary();
  // The first ten come with the page; the feed loads the rest as the reader scrolls.
  const [items, total] = await Promise.all([latestNews(lang, BATCH), newsCount()]);
  return (
    <PageShell title={t.news.title}>
      {items.length ? <NewsFeed lang={lang} initial={items} total={total} batch={BATCH} t={t.archive} /> : <p className="text-lg">{t.news.empty}</p>}
    </PageShell>
  );
}
