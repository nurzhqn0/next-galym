"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Dict } from "@/app/[lang]/dictionaries/en";
import type { Locale } from "@/lib/locale";
import { formatDate } from "@/lib/site";
import { listKey, useAdminLists, type AdminList } from "@/lib/stores/admin-lists";
import { Pager } from "./pager";

type List = AdminList<"applications">;

// Reuses the stamp looks: open is solid, past its deadline is dashed, closed is plain.
const stamp = { open: "accepted", expired: "pending", closed: undefined } as const;

/** The applications list, kept in the zustand store like news and archives. */
export function ApplicationList({ lang, page, t, initial }: { lang: Locale; page: number; t: Dict["admin"]; initial: List }) {
  const router = useRouter();
  const stored = useAdminLists((s) => s.lists[listKey("applications", page)]);
  const seed = useAdminLists((s) => s.seed);
  const load = useAdminLists((s) => s.load);
  const { items, total } = (stored ?? initial) as List;

  useEffect(() => {
    seed("applications", page, initial);
  }, [seed, page, initial]);

  useEffect(() => {
    load("applications", page).then((r) => {
      if (r === "signed-out") router.replace(`/${lang}/login?next=${encodeURIComponent(`/${lang}/admin/applications`)}`);
    });
  }, [load, page, lang, router]);

  return (
    <>
      {items.length ? (
        <ul className="mt-8 border-b-[1.5px] border-ink">
          {items.map((a, i) => {
            const state = a.status === "closed" ? "closed" : a.live ? "open" : "expired";
            return (
              <li key={a.id} style={{ ["--i" as string]: Math.min(i, 3) }} className="print-in border-t-[1.5px] border-ink">
                <Link href={`/${lang}/admin/applications/${a.id}`} className="grid gap-2 px-2 py-5 hover:bg-stock-lit md:grid-cols-[10rem_1fr_auto] md:items-center md:gap-6">
                  <span>
                    <span className="stamp" data-status={stamp[state]}>
                      {t.applications.statuses[state]}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block break-words text-xl font-bold">{a.title}</span>
                    <span className="label block break-words text-ink">
                      {[a.category, a.deadline ? `${t.applications.deadline} ${formatDate(a.deadline, lang)}` : null, a.submissions ? t.applications.submissions.replace("{n}", String(a.submissions)) : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="label text-ink">
                    {t.updated} {formatDate(a.updatedAt, lang)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 text-lg">{t.applications.empty}</p>
      )}
      <Pager base={`/${lang}/admin/applications`} page={page} total={total} newer={t.newer} older={t.older} />
    </>
  );
}
