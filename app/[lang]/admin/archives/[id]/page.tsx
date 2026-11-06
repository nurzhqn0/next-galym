import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { AdminHeading, AdminNav } from "@/components/admin/admin-nav";
import { ArchiveForm } from "@/components/admin/archive-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageShell } from "@/components/page-shell";
import { adminPage } from "@/lib/auth/guard";
import { HttpError } from "@/lib/http";
import { getAdminArchive } from "@/lib/services/archives";
import { getDictionary, getLocale } from "../../../dictionaries";

export async function generateMetadata() {
  return { title: (await getDictionary()).admin.archives.edit };
}

async function Edit({ params }: { params: PageProps<"/[lang]/admin/archives/[id]">["params"] }) {
  const { id } = await params;
  const lang = await getLocale();
  const t = await getDictionary();
  const user = await adminPage(lang, `/${lang}/admin/archives/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const item = await getAdminArchive(id).catch((e) => (e instanceof HttpError && e.status === 404 ? null : Promise.reject(e)));
  if (!item) notFound();
  return (
    <>
      <AdminNav lang={lang} t={t.admin} current="archives" superuser={user.role === "superuser"} />
      <AdminHeading title={t.admin.archives.edit} back={`/${lang}/admin/archives`} backLabel={t.admin.back} />
      <div className="grid max-w-[48rem] gap-8">
        <ArchiveForm lang={lang} t={t.admin} initial={item} />
        <DeleteButton url={`/api/v1/admin/archives/${item.id}`} back={`/${lang}/admin/archives`} t={t.admin} />
      </div>
    </>
  );
}

export default async function EditArchivePage(props: PageProps<"/[lang]/admin/archives/[id]">) {
  const t = await getDictionary();
  return (
    <PageShell title={t.admin.title}>
      <Suspense fallback={<div className="min-h-[50vh]" />}>
        <Edit params={props.params} />
      </Suspense>
    </PageShell>
  );
}
