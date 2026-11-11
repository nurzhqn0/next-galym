"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Dict } from "@/app/[lang]/dictionaries/en";
import { formatDate } from "@/lib/site";
import { useMyAnswers } from "@/lib/stores/my-answers";
import { LogoutButton } from "./logout-button";

/** Shows the answers kept in this tab at once, and re-checks the server on every visit. */
export function MyAnswers({ lang, t, logoutLabel, errorText }: { lang: string; t: Dict["account"]; logoutLabel: string; errorText: string }) {
  const router = useRouter();
  const user = useMyAnswers((s) => s.user);
  const answers = useMyAnswers((s) => s.answers);
  const failed = useMyAnswers((s) => s.failed);
  const load = useMyAnswers((s) => s.load);

  useEffect(() => {
    load().then((r) => {
      if (r === "signed-out") router.replace(`/${lang}/login?next=${encodeURIComponent(`/${lang}/account`)}`);
    });
  }, [load, lang, router]);

  if (!user || !answers) {
    return failed ? (
      <p role="alert" className="text-lg">
        {errorText}
      </p>
    ) : (
      <div className="min-h-[50vh]" />
    );
  }

  return (
    <>
      {/* Where PageShell's intro would sit: the user is known only in the browser, the title is not. */}
      <p className="-mt-5 mb-10 max-w-[56ch] text-xl">{`${user.fullName} · ${user.email}`}</p>
      {answers.length ? (
        <ol className="border-b-[2.5px] border-ink">
          {answers.map((s, i) => {
            const title = Object.values(s.data).find((v) => v.trim()) ?? s.formTitle;
            return (
              <li key={s.id} style={{ ["--i" as string]: Math.min(i, 5) }} className="print-in grid grid-cols-[2.5rem_1fr] gap-x-4 gap-y-2 border-t-[2.5px] border-ink py-5 md:grid-cols-[4rem_1fr_auto] md:items-center">
                <span className="bubble" data-filled="true" aria-hidden="true">{i + 1}</span>
                <div>
                  <h2 className="text-xl font-bold">{title}</h2>
                  <p className="label text-ink">
                    {s.formTitle} · {t.sent} {formatDate(s.createdAt, lang)}
                  </p>
                  {s.listingRemoved && <p className="mt-1 text-sm">{t.removed}</p>}
                  {s.external && <p className="mt-1 text-sm">{t.selfReported}</p>}
                </div>
                <p className="col-start-2 md:col-start-3">
                  {/* Taking an answer back removes its row, so every row here is applied. The review status stays with the admins. */}
                  <span className="stamp" data-status="applied">
                    {t.applied}
                  </span>
                </p>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="grid gap-4">
          <p className="text-xl font-bold">{t.empty}</p>
          <p>
            <Link href={`/${lang}/applications`} className="field field-solid label">
              {t.findOne}
            </Link>
          </p>
        </div>
      )}
      <div className="mt-10">
        <LogoutButton lang={lang} label={logoutLabel} />
      </div>
    </>
  );
}
