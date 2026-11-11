import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Dict } from "@/app/[lang]/dictionaries/en";
import { currentUser } from "@/lib/auth/guard";
import { AuthForm } from "./auth-form";

/** Signed in already: off to the account. Reads the cookie, so it only runs inside the Suspense below. */
async function SignedOutOnly({ mode, lang, t }: { mode: "login" | "register"; lang: string; t: Dict }) {
  if (await currentUser()) redirect(`/${lang}/account`);
  return <AuthForm mode={mode} lang={lang} t={t} />;
}

/** The log in / register form. Until it streams in, an empty box of the same size holds its place. */
export function AuthGate({ mode, lang, t }: { mode: "login" | "register"; lang: string; t: Dict }) {
  return (
    <Suspense
      fallback={
        <div
          aria-hidden="true"
          className={`border-[2.5px] border-ink bg-stock-lit ${mode === "register" ? "min-h-[33rem]" : "min-h-[25rem]"}`}
        />
      }
    >
      <SignedOutOnly mode={mode} lang={lang} t={t} />
    </Suspense>
  );
}
