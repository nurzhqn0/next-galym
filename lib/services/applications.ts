import { and, asc, count, desc, eq, gte, ilike, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { applications, applicationSubmissions, users } from "@/lib/db/schema";
import { HttpError, isForeignKeyViolation, isUniqueViolation, likePattern } from "@/lib/http";
import {
  type AppField,
  type Snapshot,
  fieldTypes,
  httpUrl,
  isLive,
  todayAlmaty,
  valueFits,
} from "@/lib/application-fields";
import { toCsv } from "@/lib/application-import";

type Application = typeof applications.$inferSelect;

/** Only fields an admin marked public ever leave the server. */
const publicFields = (fields: AppField[]) =>
  fields.filter((f) => f.public).map(({ label, type, value }) => ({ label, type, value }));

const publicShape = (a: Application) => ({
  id: a.id,
  title: a.title,
  category: a.category,
  applyUrl: a.applyUrl,
  deadline: a.deadline,
  fields: publicFields(a.fields),
});

const liveWhere = () =>
  and(eq(applications.status, "open"), or(isNull(applications.deadline), gte(applications.deadline, todayAlmaty())));

export async function listListings(limit: number, offset: number) {
  const rows = await db
    .select()
    .from(applications)
    .where(liveWhere())
    .orderBy(sql`${applications.deadline} asc nulls last`, asc(applications.title))
    .limit(limit)
    .offset(offset);
  return rows.map(publicShape);
}

export async function getListing(id: string) {
  const [row] = await db.select().from(applications).where(and(liveWhere(), eq(applications.id, id)));
  if (!row) throw new HttpError(404, "Application not found");
  return publicShape(row);
}

export async function applyTo(userId: string, applicationId: string) {
  const [row] = await db.select().from(applications).where(eq(applications.id, applicationId));
  if (!row) throw new HttpError(404, "Application not found");
  if (!isLive(row)) throw new HttpError(410, "This application is no longer available");
  const snapshot: Snapshot = { title: row.title, category: row.category, fields: publicFields(row.fields) };
  try {
    const [created] = await db
      .insert(applicationSubmissions)
      .values({
        userId,
        applicationId,
        // A listing with an external link is applied to elsewhere; this records the student's own claim.
        external: row.applyUrl !== null,
        // Snapshot is public fields only: users can read their own submissions back.
        dataSnapshot: snapshot,
      })
      .returning();
    return created;
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, "You have already applied");
    throw e;
  }
}

/** Takes the answer back. Works on a closed listing too: the answer is the user's to remove. */
export async function withdrawFrom(userId: string, applicationId: string) {
  const res = await db
    .delete(applicationSubmissions)
    .where(and(eq(applicationSubmissions.userId, userId), eq(applicationSubmissions.applicationId, applicationId)))
    .returning({ id: applicationSubmissions.id });
  if (!res.length) throw new HttpError(404, "You have not applied");
}

export async function listMySubmissions(userId: string) {
  const rows = await db
    .select({ s: applicationSubmissions, application: applications })
    .from(applicationSubmissions)
    .innerJoin(applications, eq(applications.id, applicationSubmissions.applicationId))
    .where(eq(applicationSubmissions.userId, userId))
    .orderBy(desc(applicationSubmissions.createdAt));
  return rows.map((r) => ({
    id: r.s.id,
    applicationId: r.s.applicationId,
    title: r.s.dataSnapshot.title,
    category: r.s.dataSnapshot.category,
    fields: r.s.dataSnapshot.fields,
    status: r.s.status,
    external: r.s.external,
    listingRemoved: !isLive(r.application),
    createdAt: r.s.createdAt,
  }));
}

const statuses = ["pending", "reviewed", "accepted", "rejected"] as const;
export const submissionFilter = z.object({
  status: z.enum(statuses).optional(),
  applicationId: z.uuid().optional(),
  q: z.string().trim().min(1).max(100).optional(),
});
export const submissionUpdate = z.object({ status: z.enum(statuses) });

export async function listAllSubmissions(limit: number, offset: number, filter: z.infer<typeof submissionFilter> = {}) {
  const where = and(
    filter.status ? eq(applicationSubmissions.status, filter.status) : undefined,
    filter.applicationId ? eq(applicationSubmissions.applicationId, filter.applicationId) : undefined,
    filter.q ? or(ilike(users.email, likePattern(filter.q)), ilike(users.fullName, likePattern(filter.q))) : undefined,
  );
  const joined = db
    .select({ n: count() })
    .from(applicationSubmissions)
    .innerJoin(users, eq(users.id, applicationSubmissions.userId))
    .where(where);
  const [items, [{ n: total }]] = await Promise.all([
    db
      .select({
        id: applicationSubmissions.id,
        status: applicationSubmissions.status,
        external: applicationSubmissions.external,
        data: applicationSubmissions.dataSnapshot,
        createdAt: applicationSubmissions.createdAt,
        applicationId: applicationSubmissions.applicationId,
        user: { id: users.id, email: users.email, fullName: users.fullName },
      })
      .from(applicationSubmissions)
      .innerJoin(users, eq(users.id, applicationSubmissions.userId))
      .where(where)
      .orderBy(desc(applicationSubmissions.createdAt))
      .limit(limit)
      .offset(offset),
    joined,
  ]);
  return { items, total };
}

export async function setSubmissionStatus(id: string, status: z.infer<typeof submissionUpdate>["status"]) {
  const [row] = await db
    .update(applicationSubmissions)
    .set({ status })
    .where(eq(applicationSubmissions.id, id))
    .returning();
  if (!row) throw new HttpError(404, "Submission not found");
  return row;
}

// Admin

const field = z.object({
  label: z.string().trim().min(1).max(100),
  type: z.enum(fieldTypes),
  value: z.string().trim().min(1).max(5000),
  public: z.boolean(),
});

const fieldList = z
  .array(field)
  .max(50)
  .superRefine((fields, ctx) => {
    const seen = new Set<string>();
    fields.forEach((f, i) => {
      const key = f.label.toLowerCase();
      if (seen.has(key)) ctx.addIssue({ code: "custom", path: [i, "label"], message: "Duplicate label" });
      seen.add(key);
      if (!valueFits(f.type, f.value)) ctx.addIssue({ code: "custom", path: [i, "value"], message: `Not a valid ${f.type}` });
    });
  });

const emptyToNull = (v: unknown) => (typeof v === "string" && !v.trim() ? null : v);

const base = z.object({
  title: z.string().trim().min(1).max(300),
  category: z.preprocess(emptyToNull, z.string().trim().max(200).nullish()),
  applyUrl: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .nullish()
      .transform((v, ctx) => {
        if (v == null) return null;
        const url = httpUrl(v);
        if (!url) ctx.addIssue({ code: "custom", message: "Not an http(s) URL" });
        return url ?? z.NEVER;
      }),
  ),
  deadline: z.preprocess(emptyToNull, z.iso.date().nullish()),
  status: z.enum(["open", "closed"]),
  fields: fieldList,
});

export const applicationCreate = base.partial({ category: true, applyUrl: true, deadline: true, status: true, fields: true });
export const applicationUpdate = base.partial();
export const applicationImport = z.object({ items: z.array(applicationCreate).min(1).max(500) });

type Create = z.infer<typeof applicationCreate>;

const values = (input: Create, createdBy: string) => ({
  title: input.title,
  category: input.category ?? null,
  applyUrl: input.applyUrl ?? null,
  deadline: input.deadline ?? null,
  status: input.status ?? ("open" as const),
  fields: input.fields ?? [],
  createdBy,
});

export async function listAdminApplications(limit: number, offset: number) {
  const [items, [{ n: total }]] = await Promise.all([
    db
      .select({
        id: applications.id,
        title: applications.title,
        category: applications.category,
        deadline: applications.deadline,
        status: applications.status,
        updatedAt: applications.updatedAt,
        submissions: sql<number>`(select count(*)::int from ${applicationSubmissions} where ${applicationSubmissions.applicationId} = ${applications.id})`,
      })
      .from(applications)
      .orderBy(desc(applications.createdAt), asc(applications.title))
      .limit(limit)
      .offset(offset),
    db.select({ n: count() }).from(applications),
  ]);
  const today = todayAlmaty();
  return { items: items.map((i) => ({ ...i, live: isLive(i, today) })), total };
}

export async function getAdminApplication(id: string) {
  const [row] = await db.select().from(applications).where(eq(applications.id, id));
  if (!row) throw new HttpError(404, "Application not found");
  return row;
}

/** Distinct categories, for the form's suggestions. */
export async function listCategories() {
  const rows = await db
    .selectDistinct({ category: applications.category })
    .from(applications)
    .orderBy(asc(applications.category));
  return rows.flatMap((r) => (r.category ? [r.category] : []));
}

export async function createApplication(input: Create, createdBy: string) {
  const [row] = await db.insert(applications).values(values(input, createdBy)).returning();
  return row;
}

/** All or nothing: one transaction, so a failure never leaves half a file imported. */
export async function importApplications(items: Create[], createdBy: string) {
  await db.transaction(async (tx) => {
    for (let i = 0; i < items.length; i += 100) {
      await tx.insert(applications).values(items.slice(i, i + 100).map((it) => values(it, createdBy)));
    }
  });
  return { created: items.length };
}

export async function updateApplication(id: string, input: z.infer<typeof applicationUpdate>) {
  const [row] = await db.update(applications).set(input).where(eq(applications.id, id)).returning();
  if (!row) throw new HttpError(404, "Application not found");
  return row;
}

export async function deleteApplication(id: string) {
  try {
    const res = await db.delete(applications).where(eq(applications.id, id)).returning({ id: applications.id });
    if (!res.length) throw new HttpError(404, "Application not found");
  } catch (e) {
    if (isForeignKeyViolation(e)) throw new HttpError(409, "Application has submissions; close it instead");
    throw e;
  }
}

export async function exportApplications() {
  const rows = await db.select().from(applications).orderBy(asc(applications.createdAt), asc(applications.title));
  return toCsv(rows);
}
