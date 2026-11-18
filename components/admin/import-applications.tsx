"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Dict } from "@/app/[lang]/dictionaries/en";
import { toDmy } from "@/lib/application-fields";
import { parseImport } from "@/lib/application-import";
import { useAdminLists } from "@/lib/stores/admin-lists";
import { useHydrated } from "../use-hydrated";
import { alertClass, send } from "./send";

const EXAMPLE_CSV = `Title,Category,Deadline,Link,Status,Location,Coverage,Phone (private)
Summer Internship,Internships,31.12.2027,https://example.org/apply,open,Switzerland,Full + stipend,+7 700 000 00 00
Research Grant,Grants,2027-03-15,,open,Online,"Up to $5,000",
Old Program,Internships,,https://example.org/old,closed,Japan,Flights only,`;

const EXAMPLE_MD = `## Summer Internship
- Category: Internships
- Deadline: 31.12.2027
- Link: https://example.org/apply
- Location: Switzerland
- Coverage: Full + stipend
- Phone (private): +7 700 000 00 00

Free text here becomes the Description.

## Research Grant
- Category: Grants
- Deadline: 15.03.2027
- Status: open
- Location: Online`;

/** Upload or paste a CSV or Markdown file, review what it will create, then confirm. Nothing is sent before that. */
export function ImportApplications({ lang, t }: { lang: string; t: Dict["admin"] }) {
  const a = t.applications;
  const router = useRouter();
  const hydrated = useHydrated();
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("");
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  // Per detail name: shown on the site or not. Starts from what the file says.
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => (text.trim() ? parseImport(text, filename) : null), [text, filename]);
  const drafts = useMemo(() => parsed?.drafts ?? [], [parsed]);
  const labels = useMemo(() => {
    const seen = new Map<string, boolean>();
    for (const d of drafts) for (const f of d.item?.fields ?? []) if (!seen.has(f.label)) seen.set(f.label, f.public);
    return [...seen];
  }, [drafts]);
  const isVisible = (label: string, original: boolean) => visible[label] ?? original;
  const chosen = drafts.flatMap((d, i) => (d.item && !skipped.has(i) ? [d.item] : []));
  const failed = drafts.filter((d) => !d.item).length;

  function reset(next: string, name: string) {
    setText(next);
    setFilename(name);
    setSkipped(new Set());
    setVisible({});
    setError(null);
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    const items = chosen.map((it) => ({ ...it, fields: it.fields.map((f) => ({ ...f, public: isVisible(f.label, f.public) })) }));
    const res = await send("POST", "/api/v1/admin/applications/import", { items });
    if (res.ok) {
      useAdminLists.getState().clear();
      router.push(`/${lang}/admin/applications`);
      router.refresh();
      return;
    }
    setError(res.status === 401 ? t.errors.signedOut : res.status === 403 ? t.errors.forbidden : a.importFailed);
    setBusy(false);
  }

  return (
    <div className="grid gap-8">
      <section className="rounded-2xl grid gap-4 border-[1.5px] border-ink bg-stock-lit p-6 md:p-8">
        <p>{a.importIntro}</p>
        <div className="grid gap-2 text-sm">
          <p className="label text-base">{a.formatsTitle}</p>
          <p>{a.formatCsv}</p>
          <p>{a.formatMd}</p>
        </div>
        <div className="grid gap-3">
          <p className="label text-base">{a.examplesTitle}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { code: EXAMPLE_CSV, name: "example.csv", label: a.tryCsv },
              { code: EXAMPLE_MD, name: "example.md", label: a.tryMd },
            ].map((ex) => (
              <div key={ex.name} className="grid content-start gap-2">
                <pre className="max-h-64 overflow-auto rounded-2xl border-[1.5px] border-ink bg-stock p-3 text-xs">{ex.code}</pre>
                <button type="button" className="field label justify-self-start" onClick={() => reset(ex.code, ex.name)}>
                  {ex.label}
                </button>
              </div>
            ))}
          </div>
        </div>
        <label className="field field-solid label inline-flex min-h-11 cursor-pointer items-center justify-self-start">
          {a.chooseFile}
          <input
            type="file"
            accept=".csv,.md,.markdown,.txt,text/csv,text/markdown,text/plain"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) reset(await file.text(), file.name);
              e.target.value = "";
            }}
          />
        </label>
        <div className="grid gap-1.5">
          <label htmlFor="paste" className="label text-lg">
            {a.paste}
          </label>
          <textarea id="paste" rows={6} value={text} onChange={(e) => reset(e.target.value, "")} className="input resize-y font-mono text-sm" spellCheck={false} />
        </div>
      </section>

      {parsed && (
        <section className="grid gap-5" aria-live="polite">
          <h3 className="display text-[clamp(1.5rem,4vw,2.25rem)] text-ink">{a.preview}</h3>
          {parsed.warnings.map((w) => (
            <p key={w} className={alertClass}>
              {w}
            </p>
          ))}
          {drafts.length === 0 ? (
            <p className="text-lg">{a.noRows}</p>
          ) : (
            <>
              <p className="label text-lg">
                {a.ready.replace("{n}", String(chosen.length))}
                {failed > 0 && ` · ${a.problems.replace("{n}", String(failed))}`}
              </p>
              {labels.length > 0 && (
                <fieldset className="grid gap-2">
                  <legend className="label text-lg">{a.columns}</legend>
                  <p className="text-sm">{a.columnsHint}</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    {labels.map(([label, original]) => (
                      <label key={label} className="inline-flex min-h-11 items-center gap-2">
                        <input type="checkbox" checked={isVisible(label, original)} onChange={(e) => setVisible((v) => ({ ...v, [label]: e.target.checked }))} />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <ol className="border-b-[1.5px] border-ink">
                {drafts.map((d, i) => (
                  <li key={i} className={`grid gap-2 border-t-[1.5px] border-ink py-4 ${skipped.has(i) ? "opacity-50" : ""}`}>
                    {d.item ? (
                      <>
                        <label className="label inline-flex min-h-11 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!skipped.has(i)}
                            onChange={(e) =>
                              setSkipped((s) => {
                                const n = new Set(s);
                                if (e.target.checked) n.delete(i);
                                else n.add(i);
                                return n;
                              })
                            }
                          />
                          {a.include}
                        </label>
                        <h4 className="text-xl font-bold">{d.item.title}</h4>
                        <p className="label text-ink">
                          {[d.item.category, d.item.deadline ? `${a.deadline} ${toDmy(d.item.deadline)}` : a.noDeadline, a.statuses[d.item.status], d.item.applyUrl].filter(Boolean).join(" · ")}
                        </p>
                        {d.item.fields.length > 0 && (
                          <dl className="grid gap-x-6 gap-y-1 text-base sm:grid-cols-[auto_1fr]">
                            {d.item.fields.map((f) => (
                              <div key={f.label} className="contents">
                                <dt className="label text-sm text-ink">
                                  {f.label} <span className="font-normal">({a.types[f.type]}{isVisible(f.label, f.public) ? "" : `, ${a.hidden}`})</span>
                                </dt>
                                <dd className="whitespace-pre-line break-words">{f.value}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </>
                    ) : null}
                    {d.errors.map((m) => (
                      <p key={m} role="alert" className={alertClass}>
                        {m}
                      </p>
                    ))}
                    {d.warnings.map((m) => (
                      <p key={m} className="text-sm font-medium">
                        {m}
                      </p>
                    ))}
                  </li>
                ))}
              </ol>
            </>
          )}
          {error && (
            <p role="alert" className={alertClass}>
              {error}
            </p>
          )}
          <button type="button" onClick={confirm} disabled={busy || !hydrated || chosen.length === 0} className="field field-solid label min-h-14 justify-center text-lg disabled:opacity-70">
            {busy ? a.adding : a.addAll.replace("{n}", String(chosen.length))}
          </button>
        </section>
      )}
    </div>
  );
}
