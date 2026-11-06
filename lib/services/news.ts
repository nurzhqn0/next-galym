import { and, count, desc, eq, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { news, newsTranslations } from "@/lib/db/schema";
import { HttpError, isUniqueViolation } from "@/lib/http";
import { locales, pickTranslation, type Locale } from "@/lib/locale";

const translation = z.object({ title: z.string().trim().min(1).max(300), content: z.string().min(1).max(100_000) });
const optionalTranslations = z.object({
  en: translation.optional(),
  kk: translation.optional(),
  ru: translation.optional(),
});
const status = z.enum(["draft", "published", "archived"]);
const slug = z.string().max(200).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, digits and dashes only");

export const newsCreate = z.object({
  slug,
  status: status.default("draft"),
  coverImageUrl: z.httpUrl().nullish(),
  translations: optionalTranslations.refine((t) => t.en, "An English translation is required"),
});
export const newsUpdate = z.object({
  slug: slug.optional(),
  status: status.optional(),
  coverImageUrl: z.httpUrl().nullish(),
  translations: optionalTranslations.optional(),
});

// `exec` is the open transaction when there is one: reading through `db` would miss uncommitted writes.
async function withTranslations<T extends { id: string }>(rows: T[], exec: Pick<typeof db, "select"> = db) {
  const ids = rows.map((r) => r.id);
  const trs = ids.length ? await exec.select().from(newsTranslations).where(inArray(newsTranslations.newsId, ids)) : [];
  return rows.map((r) => ({ ...r, translations: trs.filter((t) => t.newsId === r.id) }));
}

const publicShape = (n: Awaited<ReturnType<typeof withTranslations<typeof news.$inferSelect>>>[number], lang: Locale) => {
  const t = pickTranslation(n.translations, lang);
  return {
    id: n.id,
    slug: n.slug,
    coverImageUrl: n.coverImageUrl,
    publishedAt: n.publishedAt,
    locale: t?.locale,
    title: t?.title,
    content: t?.content,
  };
};

const isLive = () => and(eq(news.status, "published"), lte(news.publishedAt, new Date()));

export async function listPublicNews(lang: Locale, limit: number, offset: number) {
  const rows = await db.select().from(news).where(isLive()).orderBy(desc(news.publishedAt)).limit(limit).offset(offset);
  return (await withTranslations(rows)).map((n) => publicShape(n, lang));
}

export async function getPublicNews(slugValue: string, lang: Locale) {
  const [row] = await db.select().from(news).where(and(isLive(), eq(news.slug, slugValue)));
  if (!row) throw new HttpError(404, "News not found");
  return publicShape((await withTranslations([row]))[0], lang);
}

export async function listAdminNews(limit: number, offset: number) {
  const [rows, [{ n: total }]] = await Promise.all([
    db.select().from(news).orderBy(desc(news.createdAt)).limit(limit).offset(offset),
    db.select({ n: count() }).from(news),
  ]);
  return { items: await withTranslations(rows), total };
}

export async function getAdminNews(id: string) {
  const [row] = await db.select().from(news).where(eq(news.id, id));
  if (!row) throw new HttpError(404, "News not found");
  return (await withTranslations([row]))[0];
}

async function upsertTranslations(tx: Pick<typeof db, "insert">, newsId: string, t: z.infer<typeof optionalTranslations>) {
  for (const l of locales) {
    const v = t[l];
    if (!v) continue;
    await tx
      .insert(newsTranslations)
      .values({ newsId, locale: l, ...v })
      .onConflictDoUpdate({ target: [newsTranslations.newsId, newsTranslations.locale], set: v });
  }
}

export async function createNews(input: z.infer<typeof newsCreate>, authorId: string) {
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(news)
        .values({
          slug: input.slug,
          status: input.status,
          coverImageUrl: input.coverImageUrl ?? null,
          authorId,
          publishedAt: input.status === "published" ? new Date() : null,
        })
        .returning();
      await upsertTranslations(tx, row.id, input.translations);
      return (await withTranslations([row], tx))[0];
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, "Slug already in use");
    throw e;
  }
}

export async function updateNews(id: string, input: z.infer<typeof newsUpdate>) {
  try {
    return await db.transaction(async (tx) => {
      const [current] = await tx.select().from(news).where(eq(news.id, id));
      if (!current) throw new HttpError(404, "News not found");
      const fields = {
        ...(input.slug !== undefined && { slug: input.slug }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.coverImageUrl !== undefined && { coverImageUrl: input.coverImageUrl }),
        ...(input.status === "published" && !current.publishedAt && { publishedAt: new Date() }),
      };
      // A translations-only edit has no news columns to set; drizzle rejects an empty update.
      const [row] = Object.keys(fields).length
        ? await tx.update(news).set(fields).where(eq(news.id, id)).returning()
        : [current];
      if (input.translations) await upsertTranslations(tx, id, input.translations);
      return (await withTranslations([row], tx))[0];
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, "Slug already in use");
    throw e;
  }
}

export async function deleteNews(id: string) {
  const res = await db.delete(news).where(eq(news.id, id)).returning({ id: news.id });
  if (!res.length) throw new HttpError(404, "News not found");
}
