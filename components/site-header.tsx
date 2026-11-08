import Link from "next/link";
import { currentUser } from "@/lib/auth/guard";
import type { Locale } from "@/lib/locale";
import type { Dict } from "@/app/[lang]/dictionaries/en";
import { LangSwitch } from "./lang-switch";
import { MobileMenu } from "./mobile-menu";
import { Logo } from "./logo";

export async function SiteHeader({ lang, t }: { lang: Locale; t: Dict }) {
  const user = await currentUser();
  const items = [
    { href: `/${lang}#about`, label: t.nav.about },
    { href: `/${lang}#results`, label: t.nav.results },
    { href: `/${lang}#news`, label: t.nav.news },
    { href: `/${lang}/applications`, label: t.nav.applications },
    { href: `/${lang}/archives`, label: t.nav.archives },
  ];
  const account = user
    ? { href: `/${lang}/account`, label: t.nav.account }
    : { href: `/${lang}/login`, label: t.nav.login };
  const admin = user && user.role !== "user" ? { href: `/${lang}/admin/news`, label: t.nav.admin } : null;

  return (
    <header className="relative pl-[calc(var(--track)+1rem)] pr-4 pt-4 md:pl-[calc(var(--track)+2rem)] md:pr-8">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4">
        <Link href={`/${lang}`} aria-label={t.nav.home} className="block w-44 shrink-0 md:w-56">
          <Logo tone="crimson" label="Next Galym" className="h-auto w-full" />
        </Link>

        {/* Desktop: the sheet's field band */}
        <nav aria-label="Main" className="hidden items-center gap-2 xl:flex">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className="field label">
              {i.label}
            </Link>
          ))}
          {admin && (
            <Link href={admin.href} className="field label">
              {admin.label}
            </Link>
          )}
          <Link href={account.href} className="field field-solid label">
            {account.label}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <LangSwitch lang={lang} label={t.nav.language} />
          </div>
          <MobileMenu label={t.nav.menu}>
            {items.map((i) => (
              <Link key={i.href} href={i.href} className="field label justify-start">
                {i.label}
              </Link>
            ))}
            {admin && (
              <Link href={admin.href} className="field label justify-start">
                {admin.label}
              </Link>
            )}
            <Link href={account.href} className="field field-solid label justify-start">
              {account.label}
            </Link>
            <div className="pt-1 sm:hidden">
              <LangSwitch lang={lang} label={t.nav.language} />
            </div>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
