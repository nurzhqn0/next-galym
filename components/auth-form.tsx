"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Dict } from "@/app/[lang]/dictionaries/en";
import { useHydrated } from "./use-hydrated";

/** Only same-site paths: blocks open redirects through ?next=. */
function safeNext(next: string | null, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
}

export function AuthForm({ mode, lang, t }: { mode: "login" | "register"; lang: string; t: Dict }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const hydrated = useHydrated();
  const register = mode === "register";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields([]);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch(`/api/v1/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        // Admins and the superuser start on the admin page; everyone else on the applications.
        const user: { role?: string } | null = await res.json().catch(() => null);
        const home = user?.role && user.role !== "user" ? `/${lang}/admin/news` : `/${lang}/applications`;
        router.push(safeNext(params.get("next"), home));
        router.refresh();
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) setError(t.auth.errors.invalid);
      else if (res.status === 409) setError(t.auth.errors.exists);
      else if (res.status === 429) setError(t.auth.errors.tooMany);
      else if (res.status === 400) {
        setError(t.auth.errors.input);
        setFields((body.issues ?? []).map((i: { path: (string | number)[] }) => String(i.path[0])));
      } else setError(t.auth.errors.generic);
    } catch {
      setError(t.auth.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  const field = (name: string, label: string, type: string, extra: object = {}) => (
    <label className="grid gap-1.5">
      <span className="label text-lg">{label}</span>
      <input
        name={name}
        type={type}
        required
        className="input"
        aria-invalid={fields.includes(name)}
        aria-describedby={error ? "auth-error" : undefined}
        {...extra}
      />
    </label>
  );

  return (
    <form onSubmit={submit} method="post" className="grid gap-5 border-[2.5px] border-ink bg-stock-lit p-6 md:p-8">
      {register && field("fullName", t.auth.fullName, "text", { autoComplete: "name", maxLength: 200 })}
      {field("email", t.auth.email, "email", { autoComplete: "email", maxLength: 320 })}
      {field("password", t.auth.password, "password", {
        autoComplete: register ? "new-password" : "current-password",
        minLength: register ? 10 : undefined,
        maxLength: 200,
      })}
      {register && <p className="-mt-3 text-sm">{t.auth.passwordHint}</p>}
      {error && (
        <p id="auth-error" role="alert" className="border-[2.5px] border-dashed border-ink bg-[#ffd0c8] p-3 font-medium">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || !hydrated} className="field field-solid label min-h-14 justify-center text-lg disabled:opacity-70">
        {busy ? t.auth.sending : register ? t.auth.submitRegister : t.auth.submitLogin}
      </button>
      <p>
        {register ? t.auth.haveAccount : t.auth.noAccount}{" "}
        <Link href={`/${lang}/${register ? "login" : "register"}`} className="inline-block py-2 font-bold underline">
          {register ? t.auth.loginTitle : t.auth.registerTitle}
        </Link>
      </p>
    </form>
  );
}
