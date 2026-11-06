import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LogoutButton } from "@/components/logout-button";
import { PageShell } from "@/components/page-shell";
import { currentUser } from "@/lib/auth/guard";
import { listMySubmissions } from "@/lib/services/applications";
import { formatDate } from "@/lib/site";
import { getDictionary, getLocale } from "../dictionaries";

export async function generateMetadata() {
  return { title: (await getDictionary()).account.title };
}

async function Answers() {
  const lang = await getLocale();
  const t = await getDictionary();
  const user = await currentUser();
  if (!user) redirect(`/${lang}/login?next=${encodeURIComponent(`/${lang}/account`)}`);
  const subs = await listMySubmissions(user.id);
  return (
    <PageShell title={t.account.title} intro={`${user.fullName} · ${user.email}`}>
      {subs.length ? (
        <ol className="border-b-[2.5px] border-ink">
          {subs.map((s, i) => {
            const title = Object.values(s.data).find((v) => v.trim()) ?? s.formTitle;
            return (
              <li key={s.id} className="grid grid-cols-[2.5rem_1fr] gap-x-4 gap-y-2 border-t-[2.5px] border-ink py-5 md:grid-cols-[4rem_1fr_auto] md:items-center">
                <span className="bubble" data-filled="true" aria-hidden="true">{i + 1}</span>
                <div>
                  <h2 className="text-xl font-bold">{title}</h2>
                  <p className="label text-ink">
                    {s.formTitle} · {t.account.sent} {formatDate(s.createdAt, lang)}
                  </p>
                  {s.listingRemoved && <p className="mt-1 text-sm">{t.account.removed}</p>}
                  {s.external && <p className="mt-1 text-sm">{t.account.selfReported}</p>}
                </div>
                <p className="col-start-2 md:col-start-3">
                  <span className="stamp" data-status={s.status}>{t.account.status[s.status]}</span>
                </p>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="grid gap-4">
          <p className="text-xl font-bold">{t.account.empty}</p>
          <p>
            <Link href={`/${lang}/applications`} className="field field-solid label">
              {t.account.findOne}
            </Link>
          </p>
        </div>
      )}
      <div className="mt-10">
        <LogoutButton lang={lang} label={t.auth.logout} />
      </div>
    </PageShell>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh]" />}>
      <Answers />
    </Suspense>
  );
}
