import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { AdminHeading, AdminNav } from "@/components/admin/admin-nav";
import { ApplicationForm } from "@/components/admin/application-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageShell } from "@/components/page-shell";
import { adminPage } from "@/lib/auth/guard";
import { adminApplication, applicationCategories } from "@/lib/data";
import { getDictionary, getLocale } from "../../../dictionaries";

export async function generateMetadata() {
  return { title: (await getDictionary()).admin.applications.edit };
}

async function Edit({ params }: { params: PageProps<"/[lang]/admin/applications/[id]">["params"] }) {
  const { id } = await params;
  const lang = await getLocale();
  const t = await getDictionary();
  const user = await adminPage(lang, `/${lang}/admin/applications/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const [item, categories] = await Promise.all([adminApplication(id), applicationCategories()]);
  if (!item) notFound();
  return (
    <>
      <AdminNav lang={lang} t={t.admin} current="applications" superuser={user.role === "superuser"} />
      <AdminHeading title={t.admin.applications.edit} back={`/${lang}/admin/applications`} backLabel={t.admin.back} />
      <div className="print-in grid max-w-[48rem] gap-8">
        <ApplicationForm lang={lang} t={t.admin} initial={item} categories={categories} />
        <DeleteButton url={`/api/v1/admin/applications/${item.id}`} back={`/${lang}/admin/applications`} t={t.admin} conflict={t.admin.applications.inUse} />
      </div>
    </>
  );
}

export default async function EditApplicationPage(props: PageProps<"/[lang]/admin/applications/[id]">) {
  const t = await getDictionary();
  return (
    <PageShell title={t.admin.title}>
      <Suspense fallback={<div className="min-h-[50vh]" />}>
        <Edit params={props.params} />
      </Suspense>
    </PageShell>
  );
}
