import { Suspense } from "react";
import { AdminHeading, AdminNav } from "@/components/admin/admin-nav";
import { ImportApplications } from "@/components/admin/import-applications";
import { PageShell } from "@/components/page-shell";
import { adminPage } from "@/lib/auth/guard";
import { getDictionary, getLocale } from "../../../dictionaries";

export async function generateMetadata() {
  return { title: (await getDictionary()).admin.applications.importTitle };
}

async function Import() {
  const lang = await getLocale();
  const t = await getDictionary();
  const user = await adminPage(lang, `/${lang}/admin/applications/import`);
  return (
    <>
      <AdminNav lang={lang} t={t.admin} current="applications" superuser={user.role === "superuser"} />
      <AdminHeading title={t.admin.applications.importTitle} back={`/${lang}/admin/applications`} backLabel={t.admin.back} />
      <div className="print-in max-w-[56rem]">
        <ImportApplications lang={lang} t={t.admin} />
      </div>
    </>
  );
}

export default async function ImportApplicationsPage() {
  const t = await getDictionary();
  return (
    <PageShell title={t.admin.title}>
      <Suspense fallback={<div className="min-h-[50vh]" />}>
        <Import />
      </Suspense>
    </PageShell>
  );
}
