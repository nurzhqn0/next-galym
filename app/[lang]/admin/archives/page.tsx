import Link from "next/link";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { PAGE_SIZE, Pager, pageOf } from "@/components/admin/pager";
import { PageShell } from "@/components/page-shell";
import { adminPage } from "@/lib/auth/guard";
import { adminArchiveList } from "@/lib/data";
import { pickTranslation } from "@/lib/locale";
import { formatDate, formatSize } from "@/lib/site";
import { getDictionary, getLocale } from "../../dictionaries";

// Coming back to this list within 30 s reuses the browser's copy. Save and delete land here and refresh it.
// Not on edit pages: a stale form would overwrite newer data.
export const unstable_dynamicStaleTime = 30;

export async function generateMetadata() {
  return { title: (await getDictionary()).admin.tabs.archives };
}

async function List({ searchParams }: { searchParams: PageProps<"/[lang]/admin/archives">["searchParams"] }) {
  const lang = await getLocale();
  const t = await getDictionary();
  const user = await adminPage(lang, `/${lang}/admin/archives`);
  const page = pageOf((await searchParams).page);
  const { items, total } = await adminArchiveList(PAGE_SIZE, (page - 1) * PAGE_SIZE);
  return (
    <>
      <AdminNav lang={lang} t={t.admin} current="archives" superuser={user.role === "superuser"} />
      <Link href={`/${lang}/admin/archives/new`} className="field field-solid label">
        {t.admin.archives.new}
      </Link>
      {items.length ? (
        <ul className="mt-8 border-b-[2.5px] border-ink">
          {items.map((a, i) => (
            <li key={a.id} style={{ ["--i" as string]: Math.min(i, 3) }} className="print-in border-t-[2.5px] border-ink">
              <Link
                href={`/${lang}/admin/archives/${a.id}`}
                className="grid gap-2 px-2 py-5 hover:bg-stock-lit md:grid-cols-[1fr_auto] md:items-center md:gap-6"
              >
                <span className="min-w-0">
                  <span className="block break-words text-xl font-bold">{pickTranslation(a.translations, lang)?.title ?? a.fileUrl}</span>
                  <span className="label block text-ink">
                    {a.fileType} · {formatSize(a.fileSize)}
                  </span>
                </span>
                <span className="label text-ink">
                  {t.admin.updated} {formatDate(a.updatedAt, lang)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-lg">{t.admin.archives.empty}</p>
      )}
      <Pager base={`/${lang}/admin/archives`} page={page} total={total} newer={t.admin.newer} older={t.admin.older} />
    </>
  );
}

export default async function AdminArchivesPage(props: PageProps<"/[lang]/admin/archives">) {
  const t = await getDictionary();
  return (
    <PageShell title={t.admin.title}>
      <Suspense fallback={<div className="min-h-[50vh]" />}>
        <List searchParams={props.searchParams} />
      </Suspense>
    </PageShell>
  );
}
