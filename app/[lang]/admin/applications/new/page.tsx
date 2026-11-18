import { Suspense } from "react";
import { AdminHeading, AdminNav } from "@/components/admin/admin-nav";
import { ApplicationForm } from "@/components/admin/application-form";
import { PageShell } from "@/components/page-shell";
import { adminPage } from "@/lib/auth/guard";
import { applicationCategories } from "@/lib/data";
import { getDictionary, getLocale } from "../../../dictionaries";

export async function generateMetadata() {
  return { title: (await getDictionary()).admin.applications.new };
}

async function Create() {
  const lang = await getLocale();
  const t = await getDictionary();
  const user = await adminPage(lang, `/${lang}/admin/applications/new`);
  const categories = await applicationCategories();
  return (
    <>
      <AdminNav lang={lang} t={t.admin} current="applications" superuser={user.role === "superuser"} />
      <AdminHeading title={t.admin.applications.new} back={`/${lang}/admin/applications`} backLabel={t.admin.back} />
      <div className="print-in max-w-[48rem]">
        <ApplicationForm lang={lang} t={t.admin} categories={categories} />
      </div>
    </>
  );
}

export default async function NewApplicationPage() {
  const t = await getDictionary();
  return (
    <PageShell title={t.admin.title}>
      <Suspense fallback={<div className="min-h-[50vh]" />}>
        <Create />
      </Suspense>
    </PageShell>
  );
}
