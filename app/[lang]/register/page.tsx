import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
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
      <Suspense>
        <AuthForm mode="register" lang={lang} t={t} />
      </Suspense>
    </PageShell>
  );
}
