import { ApplicationsExplorer } from "@/components/answer-row";
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
      <ApplicationsExplorer listings={listings} t={t} lang={lang} />
    </PageShell>
  );
}