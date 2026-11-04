import { PageShell } from "@/components/page-shell";
import { latestArchives } from "@/lib/data";
import { DRIVE_URL, formatSize } from "@/lib/site";
import { getDictionary, getLocale } from "../dictionaries";

export async function generateMetadata() {
  return { title: (await getDictionary()).archive.title };
}

const row = "choose grid grid-cols-[auto_1fr] items-center gap-5 border-[2.5px] border-ink bg-stock-lit p-5 hover:bg-stock md:p-6";

export default async function ArchivesPage() {
  const lang = await getLocale();
  const t = await getDictionary();
  const items = await latestArchives(lang, 100);
  return (
    <PageShell title={t.archive.title}>
      <div className="grid gap-4">
        <a href={DRIVE_URL} target="_blank" rel="noopener noreferrer" className={row}>
          <span className="bubble" data-filled="false" aria-hidden="true">A</span>
          <span>
            <span className="block text-xl font-bold md:text-2xl">{t.archive.driveTitle}</span>
            <span className="mt-1 block max-w-[56ch]">{t.archive.driveText}</span>
            <span className="label mt-2 inline-block text-ink underline">{t.archive.open}</span>
          </span>
        </a>
        {items.map((a, i) => (
          <a key={a.id} href={a.fileUrl} rel="noopener noreferrer" className={row}>
            <span className="bubble" data-filled="false" aria-hidden="true">
              {String.fromCharCode(66 + (i % 25))}
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
      {items.length === 0 && <p className="mt-6 text-lg">{t.archive.empty}</p>}
    </PageShell>
  );
}
