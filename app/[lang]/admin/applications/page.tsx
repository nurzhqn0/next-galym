import Link from "next/link";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { ApplicationList } from "@/components/admin/application-list";
import { PAGE_SIZE, pageOf } from "@/components/admin/pager";
import { PageShell } from "@/components/page-shell";
import { adminPage } from "@/lib/auth/guard";
import { adminApplicationList } from "@/lib/data";
import { getDictionary, getLocale } from "../../dictionaries";

// Coming back to this list within 30 s reuses the browser's copy. Save and delete land here and refresh it.
// Not on edit pages: a stale form would overwrite newer data.
export const unstable_dynamicStaleTime = 30;

export async function generateMetadata() {
  return { title: (await getDictionary()).admin.tabs.applications };
}

async function List({ searchParams }: { searchParams: PageProps<"/[lang]/admin/applications">["searchParams"] }) {
  const lang = await getLocale();
  const t = await getDictionary();
  const user = await adminPage(lang, `/${lang}/admin/applications`);
  const page = pageOf((await searchParams).page);
  const list = await adminApplicationList(PAGE_SIZE, (page - 1) * PAGE_SIZE);
  return (
    <>
      <AdminNav lang={lang} t={t.admin} current="applications" superuser={user.role === "superuser"} />
      <div className="flex flex-wrap gap-2">
        <Link href={`/${lang}/admin/applications/new`} className="field field-solid label">
          {t.admin.applications.new}
        </Link>
        <Link href={`/${lang}/admin/applications/import`} className="field label">
          {t.admin.applications.import}
        </Link>
        <a href="/api/v1/admin/applications/export" download className="field label">
          {t.admin.applications.export}
        </a>
      </div>
      <ApplicationList lang={lang} page={page} t={t.admin} initial={list} />
    </>
  );
}

export default async function AdminApplicationsPage(props: PageProps<"/[lang]/admin/applications">) {
  const t = await getDictionary();
  return (
    <PageShell title={t.admin.title}>
      <Suspense fallback={<div className="min-h-[50vh]" />}>
        <List searchParams={props.searchParams} />
      </Suspense>
    </PageShell>
  );
}
