import { MyAnswers } from "@/components/my-answers";
import { PageShell } from "@/components/page-shell";
import { getDictionary, getLocale } from "../dictionaries";

export async function generateMetadata() {
  return { title: (await getDictionary()).account.title };
}

// The answers load in the browser (components/my-answers.tsx); the API checks the session.
export default async function AccountPage() {
  const lang = await getLocale();
  const t = await getDictionary();
  return (
    <PageShell title={t.account.title}>
      <MyAnswers lang={lang} t={t.account} logoutLabel={t.auth.logout} errorText={t.auth.errors.generic} />
    </PageShell>
  );
}
