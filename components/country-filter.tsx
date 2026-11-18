import { countryName } from "@/lib/countries";
import { openCountryCounts } from "@/lib/data";
import type { Dict } from "@/app/[lang]/dictionaries/en";
import type { Locale } from "@/lib/locale";

export async function CountryFilter({ t, lang, active }: { t: Dict; lang: Locale; active?: string }) {
  const { countries, none } = await openCountryCounts();
  const link = (href: string, current: boolean, label: string, count?: number) => (
    <li key={href}>
      <a
        href={href}
        aria-current={current ? "page" : undefined}
        className="field label"
      >
        {label}
        {count !== undefined && <span className="ml-1.5 tabular-nums">{count}</span>}
      </a>
    </li>
  );
  return (
    <nav aria-label={t.open.mapLabel} className="mb-6">
      <ul className="flex flex-wrap gap-2">
        {link(`/${lang}/applications`, !active, t.open.all)}
        {countries.map(({ code, count }) => link(`?country=${code}`, active === code, countryName(code, lang), count))}
        {none > 0 && link("?country=none", active === "none", t.open.online, none)}
      </ul>
    </nav>
  );
}
