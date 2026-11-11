import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminAccounts } from "@/components/admin/admin-accounts";
import { PageShell } from "@/components/page-shell";
import { adminPage } from "@/lib/auth/guard";
import { listUsers } from "@/lib/services/users";
import { getDictionary, getLocale } from "../../dictionaries";

// Coming back within 30 s reuses the browser's copy, like the news and archives lists.
export const unstable_dynamicStaleTime = 30;

export async function generateMetadata() {
  return { title: (await getDictionary()).admin.tabs.admins };
}

async function Admins({ searchParams }: { searchParams: PageProps<"/[lang]/admin/admins">["searchParams"] }) {
  const lang = await getLocale();
  const t = await getDictionary();
  await adminPage(lang, `/${lang}/admin/admins`, true);
  const raw = (await searchParams).q;
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, 100);
  // The superuser is in neither list: one shows admins, the other searches regular users only.
  const [admins, found] = await Promise.all([listUsers(100, 0, { role: "admin" }), q ? listUsers(20, 0, { q, role: "user" }) : null]);
  // Dates cross to the browser as strings, as the API sends them.
  const plain = (r: typeof admins) => r.items.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }));

  return (
    <>
      <AdminNav lang={lang} t={t.admin} current="admins" superuser />
      <p className="max-w-[56ch] text-lg">{t.admin.admins.intro}</p>

      <AdminAccounts lang={lang} q={q} t={t.admin} initial={{ admins: plain(admins), found: found && plain(found) }} />
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
