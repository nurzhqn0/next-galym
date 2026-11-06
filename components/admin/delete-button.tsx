"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dict } from "@/app/[lang]/dictionaries/en";
import { alertClass, errorText, send } from "./send";

/** Two steps: Delete, then "Yes, delete" or Cancel. On success, back to the list. */
export function DeleteButton({ url, back, t }: { url: string; back: string; t: Dict["admin"] }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "busy">("idle");
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setState("busy");
    setError(null);
    const res = await send("DELETE", url);
    if (res.ok) {
      router.push(back);
      router.refresh();
      return;
    }
    setError(errorText(res.status, t.errors));
    setState("idle");
  }

  return (
    <div className="grid justify-items-start gap-3">
      <div className="flex flex-wrap gap-2">
        {state === "idle" ? (
          <button type="button" className="field label" onClick={() => setState("confirm")}>
            {t.delete}
          </button>
        ) : (
          <>
            <button type="button" className="field field-solid label" disabled={state === "busy"} onClick={remove} autoFocus>
              {state === "busy" ? t.deleting : t.confirmDelete}
            </button>
            <button type="button" className="field label" disabled={state === "busy"} onClick={() => setState("idle")}>
              {t.cancel}
            </button>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className={alertClass}>
          {error}
        </p>
      )}
    </div>
  );
}
