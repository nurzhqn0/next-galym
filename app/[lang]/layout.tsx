import type { Metadata } from "next";
import { Fira_Sans, Fira_Sans_Extra_Condensed } from "next/font/google";
import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { locales } from "@/lib/locale";
import { getDictionary, getLocale } from "./dictionaries";
import "../globals.css";

// Both faces carry every Kazakh letter (checked against the font files).
const fira = Fira_Sans({
  variable: "--font-fira",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "700"],
  display: "swap",
});
const firaXc = Fira_Sans_Extra_Condensed({
  variable: "--font-fira-xc",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["700", "800"],
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: { default: t.meta.title, template: `%s · ${t.meta.title}` }, description: t.meta.description };
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const lang = await getLocale();
  const t = await getDictionary();
  return (
    <html lang={lang} className={`${fira.variable} ${firaXc.variable}`}>
      <body>
        <a
          href="#main"
          className="label field-solid fixed left-4 top-2 z-50 -translate-y-20 px-4 py-3 focus:translate-y-0"
        >
          {t.nav.skip}
        </a>
        <Suspense fallback={<div className="h-20" />}>
          <SiteHeader lang={lang} t={t} />
        </Suspense>
        <main id="main">{children}</main>
        <SiteFooter lang={lang} t={t} />
      </body>
    </html>
  );
}
