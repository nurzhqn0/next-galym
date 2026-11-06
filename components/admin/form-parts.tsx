"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dict } from "@/app/[lang]/dictionaries/en";
import { useHydrated } from "../use-hydrated";
import { alertClass, errorText, send } from "./send";

/** Sends a form payload; on success goes to `done`, otherwise keeps the message and the invalid fields. */
export function useSave(t: Dict["admin"], done: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<string[]>([]);

  async function save(method: "POST" | "PATCH", url: string, payload: unknown) {
    setBusy(true);
    setError(null);
    setFields([]);
    const res = await send(method, url, payload);
    if (res.ok) {
      router.push(done);
      router.refresh();
      return;
    }
    setError(errorText(res.status, t.errors));
    setFields(res.fields);
    setBusy(false);
  }

  return { busy, error, save, invalid: (name: string) => fields.includes(name) };
}

/** Label above the control, hint below it. The control takes `id` and points `aria-describedby` at `${id}-hint`. */
export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="label text-lg">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-sm">
          {hint}
        </p>
      )}
    </div>
  );
}

export function SaveBar({ busy, error, t }: { busy: boolean; error: string | null; t: Dict["admin"] }) {
  const hydrated = useHydrated();
  return (
    <>
      {error && (
        <p role="alert" className={alertClass}>
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || !hydrated} className="field field-solid label min-h-14 justify-center text-lg disabled:opacity-70">
        {busy ? t.saving : t.save}
      </button>
    </>
  );
}

/** One language's fieldset: a rule above, the language name and whether it is required. */
export function LocaleFieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 border-t-[2.5px] border-ink pt-5">
      {/* Floated so the legend sits under the rule, not in it. */}
      <legend className="label float-left w-full text-xl text-ink">{legend}</legend>
      {children}
    </fieldset>
  );
}
