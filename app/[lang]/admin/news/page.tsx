import Link from "next/link";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminList } from "@/components/admin/admin-list";
import { PAGE_SIZE, pageOf } from "@/components/admin/pager";
import { PageShell } from "@/components/page-shell";
import { adminPage } from "@/lib/auth/guard";
import { adminNewsList } from "@/lib/data";
import { getDictionary, getLocale } from "../../dictionaries";

// Coming back to this list within 30 s reuses the browser's copy. Save and delete land here and refresh it.
// Not on edit pages: a stale form would overwrite newer data.
export const unstable_dynamicStaleTime = 30;

export async function generateMetadata() {
  return { title: (await getDictionary()).admin.tabs.news };
}

async function List({ searchParams }: { searchParams: PageProps<"/[lang]/admin/news">["searchParams"] }) {
  const lang = await getLocale();
  const t = await getDictionary();
  const user = await adminPage(lang, `/${lang}/admin/news`);
  const page = pageOf((await searchParams).page);
  const list = await adminNewsList(PAGE_SIZE, (page - 1) * PAGE_SIZE);
  return (
    <>
      <AdminNav lang={lang} t={t.admin} current="news" superuser={user.role === "superuser"} />
      <Link href={`/${lang}/admin/news/new`} className="field field-solid label">
        {t.admin.news.new}
      </Link>
      <AdminList lang={lang} kind="news" page={page} t={t.admin} initial={list} />
    </>
  );
}

export default async function AdminNewsPage(props: PageProps<"/[lang]/admin/news">) {
  const t = await getDictionary();
  return (
    <PageShell title={t.admin.title}>
      <Suspense fallback={<div className="min-h-[50vh]" />}>
        <List searchParams={props.searchParams} />
      </Suspense>
    </PageShell>
  );
}
