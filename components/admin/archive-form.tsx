"use client";

import { useState } from "react";
import type { Dict } from "@/app/[lang]/dictionaries/en";
import { isBlobUrl } from "@/lib/images";
import { locales, type Locale } from "@/lib/locale";
import { Field, LocaleFieldset, SaveBar, useSave } from "./form-parts";
import { ImageField } from "./image-field";

export type ArchiveInitial = {
  id: string;
  fileUrl: string;
  imageUrl: string | null;
  fileType: string | null;
  fileSize: number | null;
  translations: { locale: Locale; title: string; description: string | null }[];
};

type Photo = { url: string; contentType: string | null; size: number | null };

export function ArchiveForm({ lang, t, initial }: { lang: string; t: Dict["admin"]; initial?: ArchiveInitial }) {
  const { busy, error, save, invalid } = useSave(t, `/${lang}/admin/archives`);
  const saved = (l: Locale) => initial?.translations.find((x) => x.locale === l);
  const [photo, setPhoto] = useState<Photo | null>(
    initial?.imageUrl && isBlobUrl(initial.imageUrl) ? { url: initial.imageUrl, contentType: initial.fileType, size: initial.fileSize } : null,
  );
  const [uploading, setUploading] = useState(false);

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
      imageUrl: photo?.url ?? null,
      fileType: photo?.contentType ?? null,
      fileSize: photo?.size ?? null,
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
      <ImageField id="photo" label={t.archives.photo} hint={t.archives.photoHint} value={photo?.url ?? null} onChange={setPhoto} onUploading={setUploading} t={t} />
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
      <SaveBar busy={busy} error={error} t={t} disabled={uploading} />
    </form>
  );
}
