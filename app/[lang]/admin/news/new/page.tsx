import { Suspense } from "react";
import { AdminHeading, AdminNav } from "@/components/admin/admin-nav";
import { NewsForm } from "@/components/admin/news-form";
import { PageShell } from "@/components/page-shell";
import { adminPage } from "@/lib/auth/guard";
import { getDictionary, getLocale } from "../../../dictionaries";

export async function generateMetadata() {
  return { title: (await getDictionary()).admin.news.new };
}

async function Create() {
  const lang = await getLocale();
  const t = await getDictionary();
  const user = await adminPage(lang, `/${lang}/admin/news/new`);
  return (
    <>
      <AdminNav lang={lang} t={t.admin} current="news" superuser={user.role === "superuser"} />
      <AdminHeading title={t.admin.news.new} back={`/${lang}/admin/news`} backLabel={t.admin.back} />
      <div className="print-in max-w-[48rem]">
        <NewsForm lang={lang} t={t.admin} />
      </div>
    </>
  );
}

export default async function NewNewsPage() {
  const t = await getDictionary();
  return (
    <PageShell title={t.admin.title}>
      <Suspense fallback={<div className="min-h-[50vh]" />}>
        <Create />
      </Suspense>
    </PageShell>
  );
}
