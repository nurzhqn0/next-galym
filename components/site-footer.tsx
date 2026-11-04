import Link from "next/link";
import type { Locale } from "@/lib/locale";
import type { Dict } from "@/app/[lang]/dictionaries/en";
import { INSTAGRAM_URL } from "@/lib/site";
import { LangSwitch } from "./lang-switch";
import { Logo } from "./logo";

export function SiteFooter({ lang, t }: { lang: Locale; t: Dict }) {
  const links = [
    { href: `/${lang}#about`, label: t.nav.about },
    { href: `/${lang}#results`, label: t.nav.results },
    { href: `/${lang}#news`, label: t.nav.news },
    { href: `/${lang}/applications`, label: t.nav.applications },
    { href: `/${lang}/archives`, label: t.nav.archives },
    { href: `/${lang}/login`, label: t.nav.login },
  ];
  return (
    <footer className="on-ink bg-ink text-stock pl-[calc(var(--track)+1rem)] pr-4 py-14 md:pl-[calc(var(--track)+2rem)] md:pr-8">
      <div className="mx-auto grid max-w-[1240px] gap-10 md:grid-cols-[1.2fr_1fr_auto] md:items-start">
        <div className="grid gap-4">
          <Logo tone="gold" label="Next Galym" className="h-auto w-64" />
          <p className="max-w-[32ch] text-lg">{t.footer.tagline}</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="label inline-flex min-h-11 items-center underline-offset-4 hover:underline">
              {l.label}
            </Link>
          ))}
          <a
            href={INSTAGRAM_URL}
            rel="noopener noreferrer"
            target="_blank"
            className="label inline-flex min-h-11 items-center underline-offset-4 hover:underline"
          >
            {t.footer.instagram}
          </a>
        </nav>
        <LangSwitch lang={lang} label={t.nav.language} />
      </div>
      <p className="mx-auto mt-12 max-w-[1240px] border-t-[2.5px] border-stock pt-4 text-sm">
        {t.footer.rights}
      </p>
    </footer>
  );
}
