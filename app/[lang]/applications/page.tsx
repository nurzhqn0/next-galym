import { Suspense } from "react";
import { ApplicationsBrowser } from "@/components/applications-browser";
import { ApplicationsMap } from "@/components/applications-map";
import { PageShell } from "@/components/page-shell";
import { countryName, normalizeCountry } from "@/lib/countries";
import { openApplications, openCountryCounts } from "@/lib/data";
import { getDictionary, getLocale } from "../dictionaries";

export async function generateMetadata() {
  return { title: (await getDictionary()).nav.applications };
}

async function Listings({ searchParams }: { searchParams: Promise<{ country?: string | string[] }> }) {
  const lang = await getLocale();
  const t = await getDictionary();
  const country = normalizeCountry((await searchParams).country);
  const [listings, { countries, none }] = await Promise.all([openApplications(100), openCountryCounts()]);
  const labels = Object.fromEntries(countries.map(({ code }) => [code, countryName(code, lang)]));
  return (
    <ApplicationsBrowser
      listings={listings}
      counts={countries}
      none={none}
      initial={country}
      lang={lang}
      t={t}
      labels={labels}
      map={<ApplicationsMap counts={countries} lang={lang} labels={labels} />}
    />
  );
}

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ country?: string | string[] }> }) {
  const t = await getDictionary();
  return (
    <PageShell title={t.open.title} intro={t.hero.sub}>
      <Suspense fallback={<div className="min-h-[50vh]" />}>
        <Listings searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}
