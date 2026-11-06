import Link from "next/link";
import type { Dict } from "@/app/[lang]/dictionaries/en";

type Tab = "news" | "archives" | "admins";

/** The admin tab row. Admins is shown to the superuser only; the page itself checks the role too. */
export function AdminNav({ lang, t, current, superuser }: { lang: string; t: Dict["admin"]; current: Tab; superuser: boolean }) {
  const tabs: Tab[] = superuser ? ["news", "archives", "admins"] : ["news", "archives"];
  return (
    <nav aria-label={t.title} className="mb-10 flex flex-wrap gap-2">
      {tabs.map((k) => (
        <Link key={k} href={`/${lang}/admin/${k}`} aria-current={k === current ? "page" : undefined} className="field label">
          {t.tabs[k]}
        </Link>
      ))}
    </nav>
  );
}

/** Heading of a create or edit page, with the way back to its list. */
export function AdminHeading({ title, back, backLabel }: { title: string; back: string; backLabel: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h2 className="display text-[clamp(2rem,5vw,3rem)] text-ink">{title}</h2>
      <Link href={back} className="field label">
        {backLabel}
      </Link>
    </div>
  );
}
