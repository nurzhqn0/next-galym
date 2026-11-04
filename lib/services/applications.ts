import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { applicationForms, applications, applicationSubmissions, users } from "@/lib/db/schema";
import { HttpError, isForeignKeyViolation, isUniqueViolation } from "@/lib/http";

type Columns = typeof applicationForms.$inferSelect.schemaDefinition;

/** Only columns an admin explicitly marked public ever leave the server. */
export function publicData(data: Record<string, string>, schema: Columns) {
  const out: Record<string, string> = {};
  for (const c of schema.columns) if (c.public && c.header in data) out[c.header] = data[c.header];
  return out;
}

const liveListing = and(isNull(applications.removedAt), eq(applicationForms.isActive, true));

const listingShape = (r: {
  application: typeof applications.$inferSelect;
  form: typeof applicationForms.$inferSelect;
}) => ({
  id: r.application.id,
  formId: r.form.id,
  formTitle: r.form.title,
  data: publicData(r.application.data, r.form.schemaDefinition),
});

export async function listListings(limit: number, offset: number, formId?: string) {
  const rows = await db
    .select({ application: applications, form: applicationForms })
    .from(applications)
    .innerJoin(applicationForms, eq(applicationForms.id, applications.formId))
    .where(and(liveListing, formId ? eq(applications.formId, formId) : undefined))
    .orderBy(asc(applicationForms.title), asc(applications.rowNumber))
    .limit(limit)
    .offset(offset);
  return rows.map(listingShape);
}

export async function getListing(id: string) {
  const [row] = await db
    .select({ application: applications, form: applicationForms })
    .from(applications)
    .innerJoin(applicationForms, eq(applicationForms.id, applications.formId))
    .where(and(liveListing, eq(applications.id, id)));
  if (!row) throw new HttpError(404, "Application not found");
  return listingShape(row);
}

export async function applyTo(userId: string, applicationId: string) {
  const [row] = await db
    .select({ application: applications, form: applicationForms })
    .from(applications)
    .innerJoin(applicationForms, eq(applicationForms.id, applications.formId))
    .where(eq(applications.id, applicationId));
  if (!row || !row.form.isActive) throw new HttpError(404, "Application not found");
  if (row.application.removedAt) throw new HttpError(410, "This application is no longer available");
  try {
    const [created] = await db
      .insert(applicationSubmissions)
      .values({
        userId,
        applicationId,
        // Snapshot is public columns only: users can read their own submissions back.
        dataSnapshot: publicData(row.application.data, row.form.schemaDefinition),
      })
      .returning();
    return created;
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, "You have already applied");
    throw e;
  }
}

export async function listMySubmissions(userId: string) {
  const rows = await db
    .select({ s: applicationSubmissions, application: applications, form: applicationForms })
    .from(applicationSubmissions)
    .innerJoin(applications, eq(applications.id, applicationSubmissions.applicationId))
    .innerJoin(applicationForms, eq(applicationForms.id, applications.formId))
    .where(eq(applicationSubmissions.userId, userId))
    .orderBy(desc(applicationSubmissions.createdAt));
  return rows.map((r) => ({
    id: r.s.id,
    applicationId: r.s.applicationId,
    formTitle: r.form.title,
    status: r.s.status,
    data: r.s.dataSnapshot,
    listingRemoved: r.application.removedAt !== null,
    createdAt: r.s.createdAt,
  }));
}

export const submissionFilter = z.object({
  status: z.enum(["pending", "reviewed", "accepted", "rejected"]).optional(),
});
export const submissionUpdate = z.object({ status: z.enum(["pending", "reviewed", "accepted", "rejected"]) });

export async function listAllSubmissions(limit: number, offset: number, status?: "pending" | "reviewed" | "accepted" | "rejected") {
  return db
    .select({
      id: applicationSubmissions.id,
      status: applicationSubmissions.status,
      data: applicationSubmissions.dataSnapshot,
      createdAt: applicationSubmissions.createdAt,
      applicationId: applicationSubmissions.applicationId,
      user: { id: users.id, email: users.email, fullName: users.fullName },
    })
    .from(applicationSubmissions)
    .innerJoin(users, eq(users.id, applicationSubmissions.userId))
    .where(status ? eq(applicationSubmissions.status, status) : undefined)
    .orderBy(desc(applicationSubmissions.createdAt))
    .limit(limit)
    .offset(offset);
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

// Forms admin

export const formCreate = z.object({
  title: z.string().trim().min(1).max(300),
  googleSheetId: z.string().trim().regex(/^[A-Za-z0-9_-]{20,}$/, "Not a Google Sheet id"),
  sheetName: z.string().trim().min(1).max(200),
  keyColumn: z.string().trim().min(1).max(200),
});
export const formUpdate = formCreate.partial().extend({
  isActive: z.boolean().optional(),
  /** Replaces the set of public columns; every other column becomes private. */
  publicColumns: z.array(z.string()).optional(),
});

export const listForms = () => db.select().from(applicationForms).orderBy(asc(applicationForms.title));

export async function createForm(input: z.infer<typeof formCreate>, createdBy: string) {
  const [row] = await db.insert(applicationForms).values({ ...input, createdBy }).returning();
  return row;
}

export async function updateForm(id: string, input: z.infer<typeof formUpdate>) {
  const { publicColumns, ...fields } = input;
  const [current] = await db.select().from(applicationForms).where(eq(applicationForms.id, id));
  if (!current) throw new HttpError(404, "Form not found");
  const schemaDefinition = publicColumns
    ? { columns: current.schemaDefinition.columns.map((c) => ({ ...c, public: publicColumns.includes(c.header) })) }
    : undefined;
  const [row] = await db
    .update(applicationForms)
    .set({ ...fields, ...(schemaDefinition && { schemaDefinition }) })
    .where(eq(applicationForms.id, id))
    .returning();
  return row;
}

export async function deleteForm(id: string) {
  try {
    const res = await db.delete(applicationForms).where(eq(applicationForms.id, id)).returning({ id: applicationForms.id });
    if (!res.length) throw new HttpError(404, "Form not found");
  } catch (e) {
    if (isForeignKeyViolation(e)) throw new HttpError(409, "Form has submissions; deactivate it instead");
    throw e;
  }
}
