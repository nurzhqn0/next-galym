"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMyAnswers } from "@/lib/stores/my-answers";
import { useHydrated } from "./use-hydrated";

type Labels = {
  apply: string;
  applying: string;
  applied: string;
  loginToApply: string;
  error: string;
  removed: string;
  openApplication: string;
  iApplied: string;
  markedApplied: string;
};

/** Filling the bubble is applying. 401 sends the visitor to log in first. */
export function ApplyButton({ applicationId, applyUrl, lang, labels, name }: { applicationId: string; applyUrl: string | null; lang: string; labels: Labels; name: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [state, setState] = useState<"idle" | "sending" | "done" | "error" | "gone">("idle");
  // Already answered (here or on another visit): show the bubble filled, as on "My answers".
  const answered = useMyAnswers((s) => s.answers?.some((a) => a.applicationId === applicationId) ?? false);
  const load = useMyAnswers((s) => s.load);
  useEffect(() => {
    if (!useMyAnswers.getState().answers) load();
  }, [load]);

  async function apply() {
    if (state === "sending" || state === "done" || state === "gone" || answered) return;
    setState("sending");
    try {
      const res = await fetch(`/api/v1/applications/${applicationId}/submissions`, { method: "POST" });
      if (res.status === 401) {
        router.push(`/${lang}/login?next=${encodeURIComponent(`/${lang}/applications`)}`);
        return;
      }
      // Refresh rather than clear, so the other bubbles on the page stay filled.
      if (res.status === 201) useMyAnswers.getState().load();
      if (res.status === 201 || res.status === 409) return setState("done");
      setState(res.status === 410 ? "gone" : "error");
    } catch {
      setState("error");
    }
  }

  const done = state === "done" || answered;
  // With a link the student applies on the other site first, then marks it here; the mark is their own claim.
  const idle = applyUrl ? labels.iApplied : labels.apply;
  const text =
    state === "sending" ? labels.applying : done ? (applyUrl ? labels.markedApplied : labels.applied) : state === "gone" ? labels.removed : idle;
  return (
    <div className="flex flex-col items-start gap-1 md:items-end">
      {applyUrl && (
        <a href={applyUrl} target="_blank" rel="noopener noreferrer" className="field field-solid label mb-2 inline-flex min-h-11 items-center">
          {labels.openApplication}
        </a>
      )}
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
        {state === "done" ? text : ""}
      </span>
      {state === "error" && (
        <p role="alert" className="text-sm font-medium">
          {labels.error}
        </p>
      )}
    </div>
  );
}
