import { AnswerRow } from "@/components/answer-row";
import { PageShell } from "@/components/page-shell";
import { openApplications } from "@/lib/data";
import { getDictionary, getLocale } from "../dictionaries";

export async function generateMetadata() {
  return { title: (await getDictionary()).nav.applications };
}

export default async function ApplicationsPage() {
  const lang = await getLocale();
  const t = await getDictionary();
  const listings = await openApplications(100);
  return (
    <PageShell title={t.open.title} intro={t.hero.sub}>
      {listings.length ? (
        <ol className="border-b-[2.5px] border-ink">
          {listings.map((l, i) => (
            <AnswerRow key={l.id} n={i + 1} listing={l} t={t} lang={lang} i={Math.min(i, 5)} wide />
          ))}
        </ol>
      ) : (
        <div className="border-[2.5px] border-ink bg-stock-lit p-6">
          <p className="text-xl font-bold">{t.open.empty}</p>
          <p className="mt-1">{t.open.emptyHint}</p>
        </div>
      )}
    </PageShell>
  );
}
