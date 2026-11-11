"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Dict } from "@/app/[lang]/dictionaries/en";
import { useAdmins, type Account } from "@/lib/stores/admins";
import { RoleButton } from "./role-button";

/** The admin list and the search results, kept in the zustand store; revisits show them at once. */
export function AdminAccounts({
  lang,
  q,
  t,
  initial,
}: {
  lang: string;
  q: string;
  t: Dict["admin"];
  /** The server render's lists: shown on the first paint, before the store has anything. */
  initial: { admins: Account[]; found: Account[] | null };
}) {
  const router = useRouter();
  const a = t.admins;
  const stored = useAdmins((s) => s.admins);
  const storedFound = useAdmins((s) => s.found);
  const foundQ = useAdmins((s) => s.foundQ);
  const seed = useAdmins((s) => s.seed);
  const admins = stored ?? initial.admins;
  const found = stored ? (foundQ === q ? storedFound : null) : initial.found;
  const load = useAdmins((s) => s.load);

  useEffect(() => {
    seed(initial.admins, initial.found, q);
  }, [seed, initial, q]);

  useEffect(() => {
    load(q).then((r) => {
      if (r === "signed-out") router.replace(`/${lang}/login?next=${encodeURIComponent(`/${lang}/admin/admins`)}`);
    });
  }, [load, q, lang, router]);

  const row = (u: Account, role: "admin" | "user", label: string) => (
    <li key={u.id} className="grid gap-3 border-t-[2.5px] border-ink py-4 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0">
        <p className="break-words text-xl font-bold">{u.fullName}</p>
        <p className="break-all">
          {u.email}
          {!u.isActive && <span className="label ml-2 text-ink">· {a.inactive}</span>}
        </p>
      </div>
      <RoleButton user={u} role={role} label={label} t={t} />
    </li>
  );

  return (
    <>
      <section className="mt-10" aria-labelledby="current-admins">
        <h2 id="current-admins" className="display text-[clamp(2rem,5vw,3rem)] text-ink">
          {a.current}
        </h2>
        {admins.length ? (
          <ul className="mt-4 border-b-[2.5px] border-ink">{admins.map((u) => row(u, "user", a.remove))}</ul>
        ) : (
          <p className="mt-4 text-lg">{a.none}</p>
        )}
      </section>

      <section className="mt-14" aria-labelledby="add-admin">
        <h2 id="add-admin" className="display text-[clamp(2rem,5vw,3rem)] text-ink">
          {a.add}
        </h2>
        <p className="mt-2">{a.addHint}</p>
        <form action={`/${lang}/admin/admins`} method="get" role="search" className="mt-4 flex flex-wrap items-end gap-2">
          <div className="grid min-w-[min(100%,18rem)] flex-1 gap-1.5">
            <label htmlFor="q" className="label text-lg">
              {a.searchLabel}
            </label>
            <input id="q" name="q" type="search" maxLength={100} defaultValue={q} className="input" />
          </div>
          <button type="submit" className="field field-solid label min-h-12">
            {a.search}
          </button>
        </form>
        {q &&
          found &&
          (found.length ? <ul className="mt-6 border-b-[2.5px] border-ink">{found.map((u) => row(u, "admin", a.make))}</ul> : <p className="mt-6 text-lg">{a.noResults}</p>)}
      </section>
    </>
  );
}
