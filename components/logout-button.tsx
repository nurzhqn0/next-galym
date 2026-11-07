"use client";

import { useRouter } from "next/navigation";
import { useMyAnswers } from "@/lib/stores/my-answers";

export function LogoutButton({ lang, label }: { lang: string; label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="field label"
      onClick={async () => {
        await fetch("/api/v1/auth/logout", { method: "POST" });
        useMyAnswers.getState().clear();
        router.push(`/${lang}`);
        router.refresh();
      }}
    >
      {label}
    </button>
  );
}
