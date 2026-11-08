"use client";

import Image from "next/image";
import { useState } from "react";
import type { Dict } from "@/app/[lang]/dictionaries/en";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/images";
import { Field } from "./form-parts";
import { toWebp } from "./to-webp";
import { alertClass, errorText } from "./send";

export type UploadedImage = { url: string; contentType: string; size: number };

/**
 * An optional image that uploads on choose (POST /api/v1/admin/images), so the preview is the stored file;
 * the browser shrinks it to WebP first (to-webp.ts) and the server checks the type from the bytes. `onUploading` lets the form hold Save until the upload ends.
 */
export function ImageField({
  id,
  label,
  hint,
  value,
  onChange,
  onUploading,
  t,
}: {
  id: string;
  label: string;
  hint: string;
  value: string | null;
  onChange: (image: UploadedImage | null) => void;
  onUploading: (uploading: boolean) => void;
  t: Dict["admin"];
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function busy(on: boolean) {
    setUploading(on);
    onUploading(on);
  }

  async function upload(file: File) {
    setError(null);
    busy(true);
    try {
      const small = await toWebp(file);
      if (small.size > MAX_IMAGE_BYTES) return setError(t.image.error);
      const body = new FormData();
      body.append("file", small);
      const res = await fetch("/api/v1/admin/images", { method: "POST", body });
      if (res.ok) onChange(await res.json());
      // 413 and 415 are the file's fault; anything else (signed out, storage down) is not.
      else setError(res.status === 413 || res.status === 415 ? t.image.error : errorText(res.status, t.errors));
    } catch {
      setError(t.image.error);
    } finally {
      busy(false);
    }
  }

  return (
    <Field id={id} label={label} hint={hint}>
      <div className="grid gap-3">
        {value && (
          <div className="relative aspect-video border-[2.5px] border-ink bg-stock">
            <Image src={value} alt="" fill sizes="(min-width: 48rem) 45rem, 100vw" className="object-cover" />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {/* The real file input is visually hidden inside the printed field; the field shows its focus. */}
          <label className="field label cursor-pointer hover:bg-ink hover:text-stock has-disabled:pointer-events-none has-disabled:opacity-70 has-focus-visible:outline-solid has-focus-visible:outline-[3px] has-focus-visible:outline-offset-[3px] has-focus-visible:outline-ink-deep">
            {uploading ? t.image.uploading : t.image.choose}
            <input
              id={id}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              disabled={uploading}
              className="sr-only"
              aria-describedby={`${id}-hint`}
              onChange={(e) => {
                const file = e.currentTarget.files?.[0];
                e.currentTarget.value = ""; // so choosing the same file again still uploads
                if (file) upload(file);
              }}
            />
          </label>
          {value && !uploading && (
            <button type="button" className="field label" onClick={() => onChange(null)}>
              {t.image.remove}
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className={alertClass}>
            {error}
          </p>
        )}
      </div>
    </Field>
  );
}
