import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { archives, archiveTranslations } from "@/lib/db/schema";
import { HttpError } from "@/lib/http";
import { locales, pickTranslation, type Locale } from "@/lib/locale";

const translation = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().nullish(),
});
const optionalTranslations = z.object({
  en: translation.optional(),
  kk: translation.optional(),
  ru: translation.optional(),
});
const file = {
  fileUrl: z.httpUrl(),
  fileType: z.string().min(1).max(120),
  fileSize: z.number().int().min(0),
};

export const archiveCreate = z.object({
  ...file,
  translations: optionalTranslations.refine((t) => t.en, "An English translation is required"),
});
export const archiveUpdate = z.object({
  fileUrl: file.fileUrl.optional(),
  fileType: file.fileType.optional(),
  fileSize: file.fileSize.optional(),
  translations: optionalTranslations.optional(),
});

async function withTranslations(rows: (typeof archives.$inferSelect)[]) {
  const ids = rows.map((r) => r.id);
  const trs = ids.length
    ? await db.select().from(archiveTranslations).where(inArray(archiveTranslations.archiveId, ids))
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
      fileType: a.fileType,
      fileSize: a.fileSize,
      createdAt: a.createdAt,
      locale: t?.locale,
      title: t?.title,
      description: t?.description,
    };
  });
}

async function upsertTranslations(tx: Pick<typeof db, "insert">, archiveId: string, t: z.infer<typeof optionalTranslations>) {
  for (const l of locales) {
    const v = t[l];
    if (!v) continue;
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
      .values({ fileUrl: input.fileUrl, fileType: input.fileType, fileSize: input.fileSize, uploadedBy })
      .returning();
    await upsertTranslations(tx, row.id, input.translations);
    return (await withTranslations([row]))[0];
  });
}

export async function updateArchive(id: string, input: z.infer<typeof archiveUpdate>) {
  return db.transaction(async (tx) => {
    const { translations, ...fields } = input;
    const [row] = Object.keys(fields).length
      ? await tx.update(archives).set(fields).where(eq(archives.id, id)).returning()
      : await tx.select().from(archives).where(eq(archives.id, id));
    if (!row) throw new HttpError(404, "Archive not found");
    if (translations) await upsertTranslations(tx, id, translations);
    return (await withTranslations([row]))[0];
  });
}

export async function deleteArchive(id: string) {
  const res = await db.delete(archives).where(eq(archives.id, id)).returning({ id: archives.id });
  if (!res.length) throw new HttpError(404, "Archive not found");
}
