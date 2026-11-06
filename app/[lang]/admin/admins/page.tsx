import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { RoleButton } from "@/components/admin/role-button";
import { PageShell } from "@/components/page-shell";
import { adminPage } from "@/lib/auth/guard";
import { listUsers } from "@/lib/services/users";
import { getDictionary, getLocale } from "../../dictionaries";

export async function generateMetadata() {
  return { title: (await getDictionary()).admin.tabs.admins };
}

type Account = Awaited<ReturnType<typeof listUsers>>["items"][number];

async function Admins({ searchParams }: { searchParams: PageProps<"/[lang]/admin/admins">["searchParams"] }) {
  const lang = await getLocale();
  const t = await getDictionary();
  const a = t.admin.admins;
  await adminPage(lang, `/${lang}/admin/admins`, true);
  const raw = (await searchParams).q;
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, 100);
  // The superuser is in neither list: one shows admins, the other searches regular users only.
  const [admins, found] = await Promise.all([listUsers(100, 0, { role: "admin" }), q ? listUsers(20, 0, { q, role: "user" }) : null]);

  const row = (u: Account, role: "admin" | "user", label: string) => (
    <li key={u.id} className="grid gap-3 border-t-[2.5px] border-ink py-4 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0">
        <p className="break-words text-xl font-bold">{u.fullName}</p>
        <p className="break-all">
          {u.email}
          {!u.isActive && <span className="label ml-2 text-ink">· {a.inactive}</span>}
        </p>
      </div>
      <RoleButton userId={u.id} role={role} label={label} name={u.fullName} t={t.admin} />
    </li>
  );

  return (
    <>
      <AdminNav lang={lang} t={t.admin} current="admins" superuser />
      <p className="max-w-[56ch] text-lg">{a.intro}</p>

      <section className="mt-10" aria-labelledby="current-admins">
        <h2 id="current-admins" className="display text-[clamp(2rem,5vw,3rem)] text-ink">
          {a.current}
        </h2>
        {admins.items.length ? (
          <ul className="mt-4 border-b-[2.5px] border-ink">{admins.items.map((u) => row(u, "user", a.remove))}</ul>
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
        {found &&
          (found.items.length ? (
            <ul className="mt-6 border-b-[2.5px] border-ink">{found.items.map((u) => row(u, "admin", a.make))}</ul>
          ) : (
            <p className="mt-6 text-lg">{a.noResults}</p>
          ))}
      </section>
    </>
  );
}

export default async function AdminsPage(props: PageProps<"/[lang]/admin/admins">) {
  const t = await getDictionary();
  return (
    <PageShell title={t.admin.title}>
      <Suspense fallback={<div className="min-h-[50vh]" />}>
        <Admins searchParams={props.searchParams} />
      </Suspense>
    </PageShell>
  );
}
