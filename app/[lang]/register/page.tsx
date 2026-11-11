import { AuthGate } from "@/components/auth-gate";
import { PageShell } from "@/components/page-shell";
import { getDictionary, getLocale } from "../dictionaries";

export async function generateMetadata() {
  return { title: (await getDictionary()).auth.registerTitle };
}

export default async function Page() {
  const lang = await getLocale();
  const t = await getDictionary();
  return (
    <PageShell title={t.auth.registerTitle} narrow>
      <AuthGate mode="register" lang={lang} t={t} />
    </PageShell>
  );
}
