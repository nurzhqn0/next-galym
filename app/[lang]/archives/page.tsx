import { ArchiveFeed } from "@/components/archive-feed";
import { PageShell } from "@/components/page-shell";
import { archiveCount, latestArchives } from "@/lib/data";
import { getDictionary, getLocale } from "../dictionaries";

// Ten at a time, like the news page.
const BATCH = 10;

export async function generateMetadata() {
  return { title: (await getDictionary()).archive.title };
}

export default async function ArchivesPage() {
  const lang = await getLocale();
  const t = await getDictionary();
  // The first ten come with the page; the feed loads the rest as the reader scrolls.
  const [items, total] = await Promise.all([latestArchives(lang, BATCH), archiveCount()]);
  return (
    <PageShell title={t.archive.title}>
      <ArchiveFeed lang={lang} initial={items} total={total} batch={BATCH} t={t.archive} />
      {items.length === 0 && <p className="mt-6 text-lg">{t.archive.empty}</p>}
    </PageShell>
  );
}
