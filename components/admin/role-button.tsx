"use client";

import { useState } from "react";
import type { Dict } from "@/app/[lang]/dictionaries/en";
import { useAdmins, type Account } from "@/lib/stores/admins";
import { useHydrated } from "../use-hydrated";
import { errorText, send } from "./send";

/** Sets one account's role. The API allows this only for the superuser. */
export function RoleButton({ user, role, label, t }: { user: Account; role: "admin" | "user"; label: string; t: Dict["admin"] }) {
  const applyRole = useAdmins((s) => s.applyRole);
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change() {
    setBusy(true);
    setError(null);
    const res = await send("PATCH", `/api/v1/admin/users/${user.id}`, { role });
    setBusy(false);
    if (res.ok) return applyRole(user, role);
    setError(errorText(res.status, t.errors));
  }

  return (
    <div className="flex flex-col items-start gap-1 md:items-end">
      <button
        type="button"
        onClick={change}
        disabled={busy || !hydrated}
        aria-label={`${label}: ${user.fullName}`}
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
