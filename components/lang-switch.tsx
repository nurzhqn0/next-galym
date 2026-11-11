"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { LOCALE_COOKIE, locales, type Locale } from "@/lib/locale";

const names: Record<Locale, string> = { en: "English", kk: "Қазақша", ru: "Русский" };

function Links({ lang, label, rest }: { lang: Locale; label: string; rest: string }) {
  return (
    <nav aria-label={label} className="flex gap-2">
      {locales.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest ? `/${rest}` : ""}`}
          hrefLang={l}
          lang={l}
          aria-label={names[l]}
          aria-current={l === lang ? "true" : undefined}
          // Remembered for a year: proxy.ts sends the next visit to "/" straight to this language.
          onClick={() => (document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`)}
          className="choose"
        >
          <span className="bubble" data-filled={l === lang}>
            {l.toUpperCase()}
          </span>
        </Link>
      ))}
    </nav>
  );
}

/** Same page in another language: swap the first path segment. */
function PathAware({ lang, label }: { lang: Locale; label: string }) {
  const rest = usePathname().split("/").slice(2).join("/");
  return <Links lang={lang} label={label} rest={rest} />;
}

export function LangSwitch({ lang, label }: { lang: Locale; label: string }) {
  // usePathname needs a boundary on dynamic routes; until it resolves, link to each locale's home.
  return (
    <Suspense fallback={<Links lang={lang} label={label} rest="" />}>
      <PathAware lang={lang} label={label} />
    </Suspense>
  );
}
