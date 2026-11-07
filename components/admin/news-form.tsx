"use client";

import { useState } from "react";
import type { Dict } from "@/app/[lang]/dictionaries/en";
import { isBlobUrl } from "@/lib/images";
import { locales, type Locale } from "@/lib/locale";
import { Field, LocaleFieldset, SaveBar, useSave } from "./form-parts";
import { ImageField } from "./image-field";

type Status = "draft" | "published" | "archived";
const statuses: Status[] = ["draft", "published", "archived"];

export type NewsInitial = {
  id: string;
  slug: string;
  status: Status;
  coverImageUrl: string | null;
  translations: { locale: Locale; title: string; content: string }[];
};

export function NewsForm({ lang, t, initial }: { lang: string; t: Dict["admin"]; initial?: NewsInitial }) {
  const { busy, error, save, invalid } = useSave(t, `/${lang}/admin/news`);
  const saved = (l: Locale) => initial?.translations.find((x) => x.locale === l);
  // A cover from outside the Blob store never showed on the site; the form treats it as none.
  const [cover, setCover] = useState(initial?.coverImageUrl && isBlobUrl(initial.coverImageUrl) ? initial.coverImageUrl : null);
  const [uploading, setUploading] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = (k: string) => String(f.get(k) ?? "");
    const translations: Record<string, { title: string; content: string } | null> = {};
    for (const l of locales) {
      const title = text(`translations.${l}.title`).trim();
      const content = text(`translations.${l}.content`);
      if (title || content.trim()) translations[l] = { title, content };
      // Emptied while editing: remove it, so the site falls back to English.
      else if (saved(l)) translations[l] = null;
    }
    const payload = { slug: text("slug").trim(), status: text("status"), coverImageUrl: cover, translations };
    if (initial) save("PATCH", `/api/v1/admin/news/${initial.id}`, payload);
    else save("POST", "/api/v1/admin/news", payload);
  }

  return (
    <form onSubmit={submit} className="grid gap-6 border-[2.5px] border-ink bg-stock-lit p-6 md:p-8">
      <Field id="slug" label={t.news.slug} hint={t.news.slugHint}>
        <input
          id="slug"
          name="slug"
          required
          maxLength={200}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={initial?.slug}
          className="input"
          aria-invalid={invalid("slug")}
          aria-describedby="slug-hint"
        />
      </Field>
      <Field id="status" label={t.news.status} hint={t.news.statusHint}>
        <select id="status" name="status" defaultValue={initial?.status ?? "draft"} className="input" aria-describedby="status-hint">
          {statuses.map((s) => (
            <option key={s} value={s}>
              {t.news.statuses[s]}
            </option>
          ))}
        </select>
      </Field>
      <ImageField
        id="cover"
        label={t.news.cover}
        hint={t.news.coverHint}
        value={cover}
        onChange={(image) => setCover(image?.url ?? null)}
        onUploading={setUploading}
        t={t}
      />
      <p>{t.translationNote}</p>
      {locales.map((l) => {
        const en = l === "en";
        const title = `translations.${l}.title`;
        const content = `translations.${l}.content`;
        return (
          <LocaleFieldset key={l} legend={`${t.languages[l]} · ${en ? t.required : t.optional}`}>
            <Field id={title} label={t.news.postTitle}>
              <input id={title} name={title} lang={l} required={en} maxLength={300} defaultValue={saved(l)?.title} className="input" aria-invalid={invalid(title)} />
            </Field>
            <Field id={content} label={t.news.content} hint={t.news.contentHint}>
              <textarea
                id={content}
                name={content}
                lang={l}
                required={en}
                rows={10}
                maxLength={100_000}
                defaultValue={saved(l)?.content}
                className="input resize-y"
                aria-invalid={invalid(content)}
                aria-describedby={`${content}-hint`}
              />
            </Field>
          </LocaleFieldset>
        );
      })}
      <SaveBar busy={busy} error={error} t={t} disabled={uploading} />
    </form>
  );
}
