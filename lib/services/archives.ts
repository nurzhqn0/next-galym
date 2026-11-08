import { and, count, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { archives, archiveTranslations } from "@/lib/db/schema";
import { HttpError } from "@/lib/http";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, isBlobUrl } from "@/lib/images";
import { locales, pickTranslation, type Locale } from "@/lib/locale";
import { deleteImage } from "@/lib/services/images";

const translation = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().max(5000).nullish(),
});
const optionalTranslations = z.object({
  en: translation.optional(),
  kk: translation.optional(),
  ru: translation.optional(),
});
// On edit, null removes a translation. English cannot be removed: it is the fallback.
const editTranslations = optionalTranslations.extend({ kk: translation.nullish(), ru: translation.nullish() });
// The optional photo: a file uploaded with POST /admin/images, with the type and size that upload returned.
const photo = {
  imageUrl: z.httpUrl().refine(isBlobUrl, "Upload the image with POST /api/v1/admin/images first").nullish(),
  fileType: z.enum(IMAGE_TYPES).nullish(),
  fileSize: z.number().int().min(1).max(MAX_IMAGE_BYTES).nullish(),
};
const photoComplete = (p: { imageUrl?: string | null; fileType?: string | null; fileSize?: number | null }) =>
  !p.imageUrl || (p.fileType != null && p.fileSize != null);
const photoIssue = { message: "A photo needs the fileType and fileSize its upload returned", path: ["fileType"] };

// An entry is a link (file, folder, video or page) with a title, a description and an optional photo.
export const archiveCreate = z
  .object({
    fileUrl: z.httpUrl(),
    ...photo,
    translations: optionalTranslations.refine((t) => t.en, "An English translation is required"),
  })
  .refine(photoComplete, photoIssue);
export const archiveUpdate = z
  .object({
    fileUrl: z.httpUrl().optional(),
    ...photo,
    translations: editTranslations.optional(),
  })
  .refine(photoComplete, photoIssue);

// `exec` is the open transaction when there is one: reading through `db` would miss uncommitted writes.
async function withTranslations(rows: (typeof archives.$inferSelect)[], exec: Pick<typeof db, "select"> = db) {
  const ids = rows.map((r) => r.id);
  const trs = ids.length
    ? await exec.select().from(archiveTranslations).where(inArray(archiveTranslations.archiveId, ids))
    : [];
  return rows.map((r) => ({ ...r, translations: trs.filter((t) => t.archiveId === r.id) }));
}

export async function listArchives(lang: Locale, limit: number, offset: number) {
  const rows = await db.select().from(archives).orderBy(desc(archives.createdAt)).limit(limit).offset(offset);
  return (await withTranslations(rows)).map((a) => {
    const t = pickTranslation(a.translations, lang);
    return {
      id: a.id,
      fileUrl: a.fileUrl,
      imageUrl: a.imageUrl,
      createdAt: a.createdAt,
      locale: t?.locale,
      title: t?.title,
      description: t?.description,
    };
  });
}

export async function countArchives() {
  const [{ n }] = await db.select({ n: count() }).from(archives);
  return n;
}

// Admin reads load each document with its translations in one query: one database round trip, not two.
export async function listAdminArchives(limit: number, offset: number) {
  const [items, [{ n: total }]] = await Promise.all([
    db.query.archives.findMany({ orderBy: desc(archives.createdAt), limit, offset, with: { translations: true } }),
    db.select({ n: count() }).from(archives),
  ]);
  return { items, total };
}

export async function getAdminArchive(id: string) {
  const row = await db.query.archives.findFirst({ where: eq(archives.id, id), with: { translations: true } });
  if (!row) throw new HttpError(404, "Archive not found");
  return row;
}

async function upsertTranslations(tx: Pick<typeof db, "insert" | "delete">, archiveId: string, t: z.infer<typeof editTranslations>) {
  for (const l of locales) {
    const v = t[l];
    if (v === undefined) continue;
    if (v === null) {
      await tx.delete(archiveTranslations).where(and(eq(archiveTranslations.archiveId, archiveId), eq(archiveTranslations.locale, l)));
      continue;
    }
    await tx
      .insert(archiveTranslations)
      .values({ archiveId, locale: l, title: v.title, description: v.description ?? null })
      .onConflictDoUpdate({
        target: [archiveTranslations.archiveId, archiveTranslations.locale],
        set: { title: v.title, description: v.description ?? null },
      });
  }
}

export async function createArchive(input: z.infer<typeof archiveCreate>, uploadedBy: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(archives)
      .values({
        fileUrl: input.fileUrl,
        imageUrl: input.imageUrl ?? null,
        fileType: input.imageUrl ? input.fileType : null,
        fileSize: input.imageUrl ? input.fileSize : null,
        uploadedBy,
      })
      .returning();
    await upsertTranslations(tx, row.id, input.translations);
    return (await withTranslations([row], tx))[0];
  });
}

export async function updateArchive(id: string, input: z.infer<typeof archiveUpdate>) {
  let replacedPhoto: string | null = null;
  const updated = await db.transaction(async (tx) => {
    const { translations, imageUrl, fileType, fileSize, ...rest } = input;
    const fields = {
      ...rest,
      // The photo's type and size change with it; null removes all three.
      ...(imageUrl !== undefined && { imageUrl, fileType: imageUrl ? (fileType ?? null) : null, fileSize: imageUrl ? (fileSize ?? null) : null }),
    };
    const [current] = await tx.select().from(archives).where(eq(archives.id, id));
    if (!current) throw new HttpError(404, "Archive not found");
    if (imageUrl !== undefined && imageUrl !== current.imageUrl) replacedPhoto = current.imageUrl;
    const [row] = Object.keys(fields).length ? await tx.update(archives).set(fields).where(eq(archives.id, id)).returning() : [current];
    if (translations) await upsertTranslations(tx, id, translations);
    return (await withTranslations([row], tx))[0];
  });
  // Only after the commit: a rolled-back save must keep its old photo.
  await deleteImage(replacedPhoto);
  return updated;
}

export async function deleteArchive(id: string) {
  const res = await db.delete(archives).where(eq(archives.id, id)).returning({ id: archives.id, imageUrl: archives.imageUrl });
  if (!res.length) throw new HttpError(404, "Archive not found");
  await deleteImage(res[0].imageUrl);
}
