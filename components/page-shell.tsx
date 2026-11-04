const pad = "pl-[calc(var(--track)+1rem)] pr-4 md:pl-[calc(var(--track)+2rem)] md:pr-8";

/** Common frame for inner pages: one sheet, one heading. */
export function PageShell({ title, intro, children, narrow }: { title: string; intro?: string; children: React.ReactNode; narrow?: boolean }) {
  return (
    <div className={`${pad} pb-24 pt-10 md:pt-14`}>
      <div className={`mx-auto ${narrow ? "max-w-[34rem]" : "max-w-[1240px]"}`}>
        <h1 className="display text-[clamp(2.75rem,8vw,5rem)] text-ink">{title}</h1>
        {intro && <p className="mt-5 max-w-[56ch] text-xl">{intro}</p>}
        <div className="mt-10">{children}</div>
      </div>
    </div>
  );
}
