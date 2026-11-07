import { Suspense } from "react";
import { AdminHeading, AdminNav } from "@/components/admin/admin-nav";
import { ArchiveForm } from "@/components/admin/archive-form";
import { PageShell } from "@/components/page-shell";
import { adminPage } from "@/lib/auth/guard";
import { getDictionary, getLocale } from "../../../dictionaries";

export async function generateMetadata() {
  return { title: (await getDictionary()).admin.archives.new };
}

async function Create() {
  const lang = await getLocale();
  const t = await getDictionary();
  const user = await adminPage(lang, `/${lang}/admin/archives/new`);
  return (
    <>
      <AdminNav lang={lang} t={t.admin} current="archives" superuser={user.role === "superuser"} />
      <AdminHeading title={t.admin.archives.new} back={`/${lang}/admin/archives`} backLabel={t.admin.back} />
      <div className="print-in max-w-[48rem]">
        <ArchiveForm lang={lang} t={t.admin} />
      </div>
    </>
  );
}

export default async function NewArchivePage() {
  const t = await getDictionary();
  return (
    <PageShell title={t.admin.title}>
      <Suspense fallback={<div className="min-h-[50vh]" />}>
        <Create />
      </Suspense>
    </PageShell>
  );
}
