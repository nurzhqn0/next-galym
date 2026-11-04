import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { getDictionary, getLocale } from "./dictionaries";

export default async function NotFound() {
  const lang = await getLocale();
  const t = await getDictionary();
  return (
    <PageShell title={t.notFound.title} intro={t.notFound.text}>
      <Link href={`/${lang}`} className="field field-solid label">
        {t.notFound.back}
      </Link>
    </PageShell>
  );
}
