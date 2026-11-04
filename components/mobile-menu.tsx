"use client";

import { useEffect, useRef, useState } from "react";

/** Native disclosure that also closes on link click, Escape and outside click. */
export function MobileMenu({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <details ref={ref} open={open} onToggle={(e) => setOpen(e.currentTarget.open)} className="relative xl:hidden">
      <summary className="field label cursor-pointer list-none [&::-webkit-details-marker]:hidden">{label}</summary>
      <div
        onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
        className="absolute right-0 top-[calc(100%+0.5rem)] z-30 grid w-[min(86vw,20rem)] gap-2 border-[2.5px] border-ink bg-stock p-3"
      >
        {children}
      </div>
    </details>
  );
}
