"use client";

import type { Dict } from "@/app/[lang]/dictionaries/en";
import { locales, type Locale } from "@/lib/locale";
import { Field, LocaleFieldset, SaveBar, useSave } from "./form-parts";

const MB = 1024 * 1024;
const fileTypes = ["PDF", "DOCX", "XLSX", "PPTX", "ZIP", "MP4"];

export type ArchiveInitial = {
  id: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  translations: { locale: Locale; title: string; description: string | null }[];
};

export function ArchiveForm({ lang, t, initial }: { lang: string; t: Dict["admin"]; initial?: ArchiveInitial }) {
  const { busy, error, save, invalid } = useSave(t, `/${lang}/admin/archives`);
  const saved = (l: Locale) => initial?.translations.find((x) => x.locale === l);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = (k: string) => String(f.get(k) ?? "").trim();
    const translations: Record<string, { title: string; description: string | null } | null> = {};
    for (const l of locales) {
      const title = text(`translations.${l}.title`);
      const description = text(`translations.${l}.description`);
      if (title || description) translations[l] = { title, description: description || null };
      // Emptied while editing: remove it, so the site falls back to English.
      else if (saved(l)) translations[l] = null;
    }
    const payload = {
      fileUrl: text("fileUrl"),
      fileType: text("fileType"),
      fileSize: Math.round(Number(text("fileSize")) * MB),
      translations,
    };
    if (initial) save("PATCH", `/api/v1/admin/archives/${initial.id}`, payload);
    else save("POST", "/api/v1/admin/archives", payload);
  }

  return (
    <form onSubmit={submit} className="grid gap-6 border-[2.5px] border-ink bg-stock-lit p-6 md:p-8">
      <Field id="fileUrl" label={t.archives.fileUrl} hint={t.archives.fileUrlHint}>
        <input
          id="fileUrl"
          name="fileUrl"
          type="url"
          required
          defaultValue={initial?.fileUrl}
          className="input"
          aria-invalid={invalid("fileUrl")}
          aria-describedby="fileUrl-hint"
        />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="fileType" label={t.archives.fileType} hint={t.archives.fileTypeHint}>
          <input
            id="fileType"
            name="fileType"
            list="file-types"
            required
            maxLength={120}
            defaultValue={initial?.fileType}
            className="input"
            aria-invalid={invalid("fileType")}
            aria-describedby="fileType-hint"
          />
          <datalist id="file-types">
            {fileTypes.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>
        <Field id="fileSize" label={t.archives.fileSize}>
          <input
            id="fileSize"
            name="fileSize"
            type="number"
            inputMode="decimal"
            required
            min={0.01}
            step={0.01}
            defaultValue={initial ? Number((initial.fileSize / MB).toFixed(2)) : undefined}
            className="input"
            aria-invalid={invalid("fileSize")}
          />
        </Field>
      </div>
      <p>{t.translationNote}</p>
      {locales.map((l) => {
        const en = l === "en";
        const title = `translations.${l}.title`;
        const description = `translations.${l}.description`;
        return (
          <LocaleFieldset key={l} legend={`${t.languages[l]} · ${en ? t.required : t.optional}`}>
            <Field id={title} label={t.archives.docTitle}>
              <input id={title} name={title} lang={l} required={en} maxLength={300} defaultValue={saved(l)?.title} className="input" aria-invalid={invalid(title)} />
            </Field>
            <Field id={description} label={t.archives.description}>
              <textarea
                id={description}
                name={description}
                lang={l}
                rows={4}
                maxLength={5000}
                defaultValue={saved(l)?.description ?? undefined}
                className="input resize-y"
                aria-invalid={invalid(description)}
              />
            </Field>
          </LocaleFieldset>
        );
      })}
      <SaveBar busy={busy} error={error} t={t} />
    </form>
  );
}
