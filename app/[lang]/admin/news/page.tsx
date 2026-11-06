import Link from "next/link";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { PAGE_SIZE, Pager, pageOf } from "@/components/admin/pager";
import { PageShell } from "@/components/page-shell";
import { adminPage } from "@/lib/auth/guard";
import { pickTranslation } from "@/lib/locale";
import { listAdminNews } from "@/lib/services/news";
import { formatDate } from "@/lib/site";
import { getDictionary, getLocale } from "../../dictionaries";

export async function generateMetadata() {
  return { title: (await getDictionary()).admin.tabs.news };
}

// Reuses the stamp looks: a draft is dashed, a published post is solid.
const stamp = { draft: "pending", published: "accepted", archived: undefined } as const;

async function List({ searchParams }: { searchParams: PageProps<"/[lang]/admin/news">["searchParams"] }) {
  const lang = await getLocale();
  const t = await getDictionary();
  const user = await adminPage(lang, `/${lang}/admin/news`);
  const page = pageOf((await searchParams).page);
  const { items, total } = await listAdminNews(PAGE_SIZE, (page - 1) * PAGE_SIZE);
  return (
    <>
      <AdminNav lang={lang} t={t.admin} current="news" superuser={user.role === "superuser"} />
      <Link href={`/${lang}/admin/news/new`} className="field field-solid label">
        {t.admin.news.new}
      </Link>
      {items.length ? (
        <ul className="mt-8 border-b-[2.5px] border-ink">
          {items.map((n) => (
            <li key={n.id} className="border-t-[2.5px] border-ink">
              <Link
                href={`/${lang}/admin/news/${n.id}`}
                className="grid gap-2 px-2 py-5 hover:bg-stock-lit md:grid-cols-[10rem_1fr_auto] md:items-center md:gap-6"
              >
                <span>
                  <span className="stamp" data-status={stamp[n.status]}>
                    {t.admin.news.statuses[n.status]}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block break-words text-xl font-bold">{pickTranslation(n.translations, lang)?.title ?? n.slug}</span>
                  <span className="label block break-all text-ink">/news/{n.slug}</span>
                </span>
                <span className="label text-ink">
                  {t.admin.updated} {formatDate(n.updatedAt, lang)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-lg">{t.admin.news.empty}</p>
      )}
      <Pager base={`/${lang}/admin/news`} page={page} total={total} newer={t.admin.newer} older={t.admin.older} />
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
