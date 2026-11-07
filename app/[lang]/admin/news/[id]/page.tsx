import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { AdminHeading, AdminNav } from "@/components/admin/admin-nav";
import { DeleteButton } from "@/components/admin/delete-button";
import { NewsForm } from "@/components/admin/news-form";
import { PageShell } from "@/components/page-shell";
import { adminPage } from "@/lib/auth/guard";
import { adminNewsPost } from "@/lib/data";
import { getDictionary, getLocale } from "../../../dictionaries";

export async function generateMetadata() {
  return { title: (await getDictionary()).admin.news.edit };
}

async function Edit({ params }: { params: PageProps<"/[lang]/admin/news/[id]">["params"] }) {
  const { id } = await params;
  const lang = await getLocale();
  const t = await getDictionary();
  const user = await adminPage(lang, `/${lang}/admin/news/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const item = await adminNewsPost(id);
  if (!item) notFound();
  return (
    <>
      <AdminNav lang={lang} t={t.admin} current="news" superuser={user.role === "superuser"} />
      <AdminHeading title={t.admin.news.edit} back={`/${lang}/admin/news`} backLabel={t.admin.back} />
      <div className="print-in grid max-w-[48rem] gap-8">
        <NewsForm lang={lang} t={t.admin} initial={item} />
        <DeleteButton url={`/api/v1/admin/news/${item.id}`} back={`/${lang}/admin/news`} t={t.admin} />
      </div>
    </>
  );
}

export default async function EditNewsPage(props: PageProps<"/[lang]/admin/news/[id]">) {
  const t = await getDictionary();
  return (
    <PageShell title={t.admin.title}>
      <Suspense fallback={<div className="min-h-[50vh]" />}>
        <Edit params={props.params} />
      </Suspense>
    </PageShell>
  );
}
