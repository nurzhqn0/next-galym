import { Suspense } from "react";
import { AnswerRow } from "@/components/answer-row";
import { CountryFilter } from "@/components/country-filter";
import { PageShell } from "@/components/page-shell";
import { isCountryCode } from "@/lib/countries";
import { openApplications } from "@/lib/data";
import { getDictionary, getLocale } from "../dictionaries";

export async function generateMetadata() {
  return { title: (await getDictionary()).nav.applications };
}

/** An uppercase valid code, "none", or undefined. */
function normalizeCountry(value: string | string[] | undefined) {
  const v = (Array.isArray(value) ? value[0] : value)?.toUpperCase();
  return v === "NONE" ? "none" : v && isCountryCode(v) ? v : undefined;
}

async function Listings({ searchParams }: { searchParams: Promise<{ country?: string | string[] }> }) {
  const lang = await getLocale();
  const t = await getDictionary();
  const country = normalizeCountry((await searchParams).country);
  const listings = await openApplications(100, country);
  return (
    <>
      <CountryFilter t={t} lang={lang} active={country} />
      {listings.length ? (
        <ol className="border-b-[1.5px] border-ink">
          {listings.map((l, i) => (
            <AnswerRow key={l.id} n={i + 1} listing={l} t={t} lang={lang} i={Math.min(i, 5)} wide />
          ))}
        </ol>
      ) : (
        <div className="rounded-2xl border-[1.5px] border-ink bg-stock-lit p-6">
          <p className="text-xl font-bold">{country && country !== "none" ? t.open.emptyCountry : t.open.empty}</p>
          <p className="mt-1">{t.open.emptyHint}</p>
        </div>
      )}
    </>
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
