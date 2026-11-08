"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dict } from "@/app/[lang]/dictionaries/en";
import { useHydrated } from "../use-hydrated";
import { errorText, send } from "./send";

/** Sets one account's role. The API allows this only for the superuser. */
export function RoleButton({ userId, role, label, name, t }: { userId: string; role: "admin" | "user"; label: string; name: string; t: Dict["admin"] }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change() {
    setBusy(true);
    setError(null);
    const res = await send("PATCH", `/api/v1/admin/users/${userId}`, { role });
    setBusy(false);
    if (res.ok) return router.refresh();
    setError(errorText(res.status, t.errors));
  }

  return (
    <div className="flex flex-col items-start gap-1 md:items-end">
      <button
        type="button"
        onClick={change}
        disabled={busy || !hydrated}
        aria-label={`${label}: ${name}`}
        className={`field label disabled:opacity-70 ${role === "admin" ? "field-solid" : ""}`}
      >
        {label}
      </button>
      {error && (
        <p role="alert" className="text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
