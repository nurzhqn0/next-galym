"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Dict } from "@/app/[lang]/dictionaries/en";
import type { listAdminArchives } from "@/lib/services/archives";
import type { listAdminNews } from "@/lib/services/news";
import { pickTranslation, type Locale } from "@/lib/locale";
import { formatDate } from "@/lib/site";
import { listKey, useAdminLists, type AdminList as List, type Kind } from "@/lib/stores/admin-lists";
import { Pager } from "./pager";

type NewsRow = Awaited<ReturnType<typeof listAdminNews>>["items"][number];
type ArchiveRow = Awaited<ReturnType<typeof listAdminArchives>>["items"][number];

// Reuses the stamp looks: a draft is dashed, a published post is solid.
const stamp = { draft: "pending", published: "accepted", archived: undefined } as const;

/** The news or archives list, kept in the zustand store; revisits show it at once. */
export function AdminList({ lang, kind, page, t, initial }: { lang: Locale; kind: Kind; page: number; t: Dict["admin"]; initial: List }) {
  const router = useRouter();
  const stored = useAdminLists((s) => s.lists[listKey(kind, page)]);
  const seed = useAdminLists((s) => s.seed);
  const load = useAdminLists((s) => s.load);
  const { items, total } = stored ?? initial;

  useEffect(() => {
    seed(kind, page, initial);
  }, [seed, kind, page, initial]);

  useEffect(() => {
    load(kind, page).then((r) => {
      if (r === "signed-out") router.replace(`/${lang}/login?next=${encodeURIComponent(`/${lang}/admin/${kind}`)}`);
    });
  }, [load, kind, page, lang, router]);

  return (
    <>
      {items.length ? (
        <ul className="mt-8 border-b-[2.5px] border-ink">
          {items.map((item, i) => {
            const n = kind === "news" ? (item as NewsRow) : null;
            const file = kind === "archives" ? (item as ArchiveRow).fileUrl : "";
            const title = pickTranslation(item.translations as { locale: "en" | "kk" | "ru"; title: string }[], lang)?.title ?? n?.slug ?? file;
            return (
              <li key={item.id} style={{ ["--i" as string]: Math.min(i, 3) }} className="print-in border-t-[2.5px] border-ink">
                <Link
                  href={`/${lang}/admin/${kind}/${item.id}`}
                  className={`grid gap-2 px-2 py-5 hover:bg-stock-lit md:items-center md:gap-6 ${n ? "md:grid-cols-[10rem_1fr_auto]" : "md:grid-cols-[1fr_auto]"}`}
                >
                  {n && (
                    <span>
                      <span className="stamp" data-status={stamp[n.status]}>
                        {t.news.statuses[n.status]}
                      </span>
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block break-words text-xl font-bold">{title}</span>
                    <span className="label block break-all text-ink">{n ? `/news/${n.slug}` : new URL(file).hostname}</span>
                  </span>
                  <span className="label text-ink">
                    {t.updated} {formatDate(item.updatedAt, lang)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 text-lg">{t[kind].empty}</p>
      )}
      <Pager base={`/${lang}/admin/${kind}`} page={page} total={total} newer={t.newer} older={t.older} />
    </>
  );
}
