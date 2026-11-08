import { ArchiveRow } from "@/components/archive-row";
import { PageShell } from "@/components/page-shell";
import { latestArchives } from "@/lib/data";
import { getDictionary, getLocale } from "../dictionaries";

export async function generateMetadata() {
  return { title: (await getDictionary()).archive.title };
}

export default async function ArchivesPage() {
  const lang = await getLocale();
  const t = await getDictionary();
  const items = await latestArchives(lang, 100);
  return (
    <PageShell title={t.archive.title}>
      <div className="grid gap-4">
        {items.map((a, i) => (
          <ArchiveRow key={a.id} item={a} letter={String.fromCharCode(65 + (i % 26))} openLabel={t.archive.openLink} />
        ))}
      </div>
      {items.length === 0 && <p className="mt-6 text-lg">{t.archive.empty}</p>}
    </PageShell>
  );
}
