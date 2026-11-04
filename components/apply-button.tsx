"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHydrated } from "./use-hydrated";

type Labels = { apply: string; applying: string; applied: string; loginToApply: string; error: string; removed: string };

/** Filling the bubble is applying. 401 sends the visitor to log in first. */
export function ApplyButton({ applicationId, lang, labels, name }: { applicationId: string; lang: string; labels: Labels; name: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [state, setState] = useState<"idle" | "sending" | "done" | "error" | "gone">("idle");

  async function apply() {
    if (state === "sending" || state === "done" || state === "gone") return;
    setState("sending");
    try {
      const res = await fetch(`/api/v1/applications/${applicationId}/submissions`, { method: "POST" });
      if (res.status === 401) {
        router.push(`/${lang}/login?next=${encodeURIComponent(`/${lang}/applications`)}`);
        return;
      }
      if (res.status === 201 || res.status === 409) return setState("done");
      setState(res.status === 410 ? "gone" : "error");
    } catch {
      setState("error");
    }
  }

  const done = state === "done";
  const text =
    state === "sending" ? labels.applying : done ? labels.applied : state === "gone" ? labels.removed : labels.apply;
  return (
    <div className="flex flex-col items-start gap-1 md:items-end">
      <button
        type="button"
        onClick={apply}
        aria-disabled={!hydrated || state === "sending" || done || state === "gone"}
        aria-label={`${text}: ${name}`}
        className="choose label inline-flex min-h-11 items-center gap-3 text-lg aria-disabled:cursor-default"
      >
        <span className="bubble" data-filled={done} aria-hidden="true" />
        {text}
      </button>
      <span className="sr-only" aria-live="polite">
        {state === "done" ? labels.applied : ""}
      </span>
      {state === "error" && (
        <p role="alert" className="text-sm font-medium">
          {labels.error}
        </p>
      )}
    </div>
  );
}
