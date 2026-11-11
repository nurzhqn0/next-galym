import Link from "next/link";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminList } from "@/components/admin/admin-list";
import { PAGE_SIZE, pageOf } from "@/components/admin/pager";
import { PageShell } from "@/components/page-shell";
import { adminPage } from "@/lib/auth/guard";
import { adminArchiveList } from "@/lib/data";
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
  const list = await adminArchiveList(PAGE_SIZE, (page - 1) * PAGE_SIZE);
  return (
    <>
      <AdminNav lang={lang} t={t.admin} current="archives" superuser={user.role === "superuser"} />
      <Link href={`/${lang}/admin/archives/new`} className="field field-solid label">
        {t.admin.archives.new}
      </Link>
      <AdminList lang={lang} kind="archives" page={page} t={t.admin} initial={list} />
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
