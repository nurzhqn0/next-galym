"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMyAnswers } from "@/lib/stores/my-answers";
import { useHydrated } from "./use-hydrated";

type Labels = {
  notApplied: string;
  applying: string;
  applied: string;
  error: string;
  removed: string;
  openApplication: string;
};

/** The bubble has two states: empty is not applied, filled is applied. A click switches it. 401 sends the visitor to log in first. */
export function ApplyButton({ applicationId, applyUrl, lang, labels, name }: { applicationId: string; applyUrl: string | null; lang: string; labels: Labels; name: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [state, setState] = useState<"idle" | "sending" | "error" | "gone">("idle");
  // What the server knows (also from earlier visits), until a click here says otherwise.
  const answered = useMyAnswers((s) => s.answers?.some((a) => a.applicationId === applicationId) ?? false);
  const [clicked, setClicked] = useState<boolean | null>(null);
  const applied = clicked ?? answered;
  const load = useMyAnswers((s) => s.load);
  useEffect(() => {
    if (!useMyAnswers.getState().answers) load();
  }, [load]);

  async function toggle() {
    if (state === "sending" || state === "gone") return;
    setState("sending");
    try {
      const res = await fetch(`/api/v1/applications/${applicationId}/submissions`, { method: applied ? "DELETE" : "POST" });
      if (res.status === 401) {
        router.push(`/${lang}/login?next=${encodeURIComponent(`/${lang}/applications`)}`);
        return;
      }
      // 409 and 404 mean the server was already in the state asked for.
      const ok = applied ? res.status === 204 || res.status === 404 : res.status === 201 || res.status === 409;
      if (ok) {
        setClicked(!applied);
        setState("idle");
        // Refresh rather than clear, so the other bubbles on the page stay filled.
        load();
      } else setState(res.status === 410 ? "gone" : "error");
    } catch {
      setState("error");
    }
  }

  const text = state === "sending" ? labels.applying : applied ? labels.applied : state === "gone" ? labels.removed : labels.notApplied;
  return (
    <div className="flex flex-col items-start gap-1 md:items-end">
      {applyUrl && (
        <a href={applyUrl} target="_blank" rel="noopener noreferrer" className="field field-solid label mb-2 inline-flex min-h-11 items-center">
          {labels.openApplication}
        </a>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={applied}
        aria-disabled={!hydrated || state === "sending" || state === "gone"}
        aria-label={`${text}: ${name}`}
        className="choose label inline-flex min-h-11 items-center gap-3 text-lg aria-disabled:cursor-default"
      >
        <span className="bubble" data-filled={applied} aria-hidden="true" />
        {text}
      </button>
      <span className="sr-only" aria-live="polite">
        {clicked !== null && state === "idle" ? text : ""}
      </span>
      {state === "error" && (
        <p role="alert" className="text-sm font-medium">
          {labels.error}
        </p>
      )}
    </div>
  );
}
