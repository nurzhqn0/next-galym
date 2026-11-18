"use client";

import { useMemo, useRef, useState } from "react";
import type { Dict } from "@/app/[lang]/dictionaries/en";
import { countryName, ALPHA2_TO_NUMERIC } from "@/lib/countries";
import { fieldTypes, type AppField, type FieldType } from "@/lib/application-fields";
import { Field, SaveBar, useSave } from "./form-parts";

export type ApplicationInitial = {
  id: string;
  title: string;
  category: string | null;
  applyUrl: string | null;
  deadline: string | null;
  status: "open" | "closed";
  fields: AppField[];
  countries: string[];
};

const inputType: Record<FieldType, string> = { text: "text", longtext: "text", url: "url", date: "date", number: "text", email: "email" };

/** One detail: name, type, value, public flag. Rows get a stable key so moving one keeps its typing state. */
type Row = AppField & { key: number };
let nextKey = 0;
const withKey = (f: AppField): Row => ({ ...f, key: nextKey++ });

export function ApplicationForm({ lang, t, initial, categories }: { lang: string; t: Dict["admin"]; initial?: ApplicationInitial; categories: string[] }) {
  const a = t.applications;
  const { busy, error, save, invalid } = useSave(t, `/${lang}/admin/applications`);
  const [rows, setRows] = useState<Row[]>(() => (initial?.fields ?? []).map(withKey));

  const [countries, setCountries] = useState<string[]>(initial?.countries ?? []);
  const [query, setQuery] = useState("");
  const countryInput = useRef<HTMLInputElement>(null);
  const names = useMemo(() => {
    const dn = new Intl.DisplayNames([lang], { type: "region" });
    return Object.keys(ALPHA2_TO_NUMERIC).map((c) => [c, (dn.of(c) ?? c).toLowerCase()] as const);
  }, [lang]);
  const q = query.trim().toLowerCase();
  const rank = (c: string, n: string) => (n === q || c.toLowerCase() === q ? 0 : n.startsWith(q) ? 1 : 2);
  const matches = q
    ? names
        .filter(([c, n]) => !countries.includes(c) && (c.toLowerCase() === q || n.includes(q)))
        .sort((a, b) => rank(...a) - rank(...b))
        .map(([c]) => c)
        .slice(0, 8)
    : [];
  const pick = (c: string) => {
    setCountries((x) => [...x, c]);
    setQuery("");
    countryInput.current?.focus();
  };

  const patch = (key: number, p: Partial<AppField>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const j = i + d;
      if (j < 0 || j >= r.length) return r;
      const copy = [...r];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = (k: string) => String(f.get(k) ?? "").trim();
    const payload = {
      title: text("title"),
      category: text("category") || null,
      applyUrl: text("applyUrl") || null,
      deadline: text("deadline") || null,
      status: text("status"),
      countries,
      // A detail with no value is dropped rather than rejected.
      fields: rows.filter((r) => r.value.trim() && r.label.trim()).map(({ label, type, value, public: p }) => ({ label, type, value, public: p })),
    };
    if (initial) save("PATCH", `/api/v1/admin/applications/${initial.id}`, payload);
    else save("POST", "/api/v1/admin/applications", payload);
  }

  // Row errors come back as "fields.<index>.<label|value>" for the rows sent, which skip blank ones.
  const sent = rows.filter((r) => r.value.trim() && r.label.trim());
  const bad = (r: Row, part: "label" | "value") => invalid(`fields.${sent.indexOf(r)}.${part}`);

  return (
    <form onSubmit={submit} className="rounded-2xl grid gap-6 border-[1.5px] border-ink bg-stock-lit p-6 md:p-8">
      <Field id="title" label={a.title}>
        <input id="title" name="title" required maxLength={300} defaultValue={initial?.title} className="input" aria-invalid={invalid("title")} />
      </Field>
      <Field id="category" label={a.category} hint={a.categoryHint}>
        <input id="category" name="category" list="categories" maxLength={200} defaultValue={initial?.category ?? ""} className="input" aria-describedby="category-hint" aria-invalid={invalid("category")} />
        <datalist id="categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field id="applyUrl" label={a.applyUrl} hint={a.applyUrlHint}>
        <input id="applyUrl" name="applyUrl" type="url" defaultValue={initial?.applyUrl ?? ""} className="input" aria-describedby="applyUrl-hint" aria-invalid={invalid("applyUrl")} />
      </Field>
      <Field id="deadline" label={a.deadline} hint={a.deadlineHint}>
        <input id="deadline" name="deadline" type="date" defaultValue={initial?.deadline ?? ""} className="input" aria-describedby="deadline-hint" aria-invalid={invalid("deadline")} />
      </Field>
      <Field id="status" label={a.status} hint={a.statusHint}>
        <select id="status" name="status" defaultValue={initial?.status ?? "open"} className="input" aria-describedby="status-hint">
          <option value="open">{a.statuses.open}</option>
          <option value="closed">{a.statuses.closed}</option>
        </select>
      </Field>

      <Field id="countries" label={a.countries}>
        <div className="grid gap-2">
          {countries.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {countries.map((c) => (
                <li key={c}>
                  <button type="button" className="field label" aria-label={`${a.countryRemove}: ${countryName(c, lang)}`} onClick={() => {
                    setCountries((x) => x.filter((y) => y !== c));
                    countryInput.current?.focus();
                  }}>
                    {countryName(c, lang)} ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            id="countries"
            ref={countryInput}
            value={query}
            placeholder={a.countriesPlaceholder}
            className="input"
            autoComplete="off"
            aria-invalid={invalid("countries")}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (matches[0]) pick(matches[0]);
              } else if (e.key === "Backspace" && !query) setCountries((x) => x.slice(0, -1));
            }}
          />
          {matches.length > 0 && (
            <ul aria-live="polite" className="flex flex-wrap gap-2">
              {matches.map((c) => (
                <li key={c}>
                  <button type="button" className="field label" onClick={() => pick(c)}>
                    {countryName(c, lang)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Field>

      <fieldset className="grid gap-4 border-t-[1.5px] border-ink pt-5">
        <legend className="label float-left w-full text-xl text-ink">{a.fields}</legend>
        <p>{a.fieldsHint}</p>
        {rows.length === 0 && <p>{a.noFields}</p>}
        {rows.map((r, i) => (
          <div key={r.key} className="grid gap-3 rounded-2xl border-[1.5px] border-ink p-4 md:grid-cols-[1fr_9rem]">
            <Field id={`f-label-${r.key}`} label={a.fieldLabel}>
              <input id={`f-label-${r.key}`} value={r.label} maxLength={100} onChange={(e) => patch(r.key, { label: e.target.value })} className="input" aria-invalid={bad(r, "label")} />
            </Field>
            <Field id={`f-type-${r.key}`} label={a.fieldType}>
              <select id={`f-type-${r.key}`} value={r.type} onChange={(e) => patch(r.key, { type: e.target.value as FieldType })} className="input">
                {fieldTypes.map((ft) => (
                  <option key={ft} value={ft}>
                    {a.types[ft]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field id={`f-value-${r.key}`} label={a.fieldValue}>
                {r.type === "longtext" ? (
                  <textarea id={`f-value-${r.key}`} value={r.value} rows={4} maxLength={5000} onChange={(e) => patch(r.key, { value: e.target.value })} className="input resize-y" aria-invalid={bad(r, "value")} />
                ) : (
                  <input id={`f-value-${r.key}`} type={inputType[r.type]} inputMode={r.type === "number" ? "decimal" : undefined} value={r.value} maxLength={5000} onChange={(e) => patch(r.key, { value: e.target.value })} className="input" aria-invalid={bad(r, "value")} />
                )}
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:col-span-2">
              <label className="label mr-auto inline-flex min-h-11 items-center gap-2">
                <input type="checkbox" checked={r.public} onChange={(e) => patch(r.key, { public: e.target.checked })} />
                {a.fieldPublic}
              </label>
              <button type="button" className="field label" disabled={i === 0} onClick={() => move(i, -1)}>
                {a.moveUp}
              </button>
              <button type="button" className="field label" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                {a.moveDown}
              </button>
              <button type="button" className="field label" onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))}>
                {a.removeField}
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="field label justify-self-start" onClick={() => setRows((x) => [...x, withKey({ label: "", type: "text", value: "", public: true })])}>
          {a.addField}
        </button>
      </fieldset>

      <SaveBar busy={busy} error={error} t={t} />
    </form>
  );
}
