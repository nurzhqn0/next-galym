import { parse } from "csv-parse/sync";
import { and, eq, isNull, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { applicationForms, applications } from "@/lib/db/schema";
import { HttpError } from "@/lib/http";

export type CsvFetcher = (sheetId: string, sheetName: string) => Promise<string>;

/** Reads a sheet shared as "anyone with the link can view" through Google's CSV endpoint. */
export const fetchSheetCsv: CsvFetcher = async (sheetId, sheetName) => {
  const url =
    `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq` +
    `?tqx=out:csv&headers=1&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.includes("csv")) {
    throw new HttpError(502, "Could not read the Google Sheet. Is it shared as 'anyone with the link can view'?");
  }
  return res.text();
};

export type SyncResult = {
  total: number;
  skipped: { row: number; reason: string }[];
  removed: number;
};

export async function syncForm(formId: string, fetchCsv: CsvFetcher = fetchSheetCsv): Promise<SyncResult> {
  const [form] = await db.select().from(applicationForms).where(eq(applicationForms.id, formId));
  if (!form) throw new HttpError(404, "Form not found");

  const records: string[][] = parse(await fetchCsv(form.googleSheetId, form.sheetName), {
    skip_empty_lines: true,
    relax_column_count: true,
  });
  const header = (records[0] ?? []).map((h) => h.trim());
  if (!header.includes(form.keyColumn)) {
    throw new HttpError(422, `Key column "${form.keyColumn}" not found in the sheet header`);
  }

  const keyIdx = header.indexOf(form.keyColumn);
  const seen = new Set<string>();
  const skipped: SyncResult["skipped"] = [];
  const rows: (typeof applications.$inferInsert)[] = [];
  records.slice(1).forEach((cells, i) => {
    const rowNumber = i + 2; // sheet row number, header is row 1
    const key = (cells[keyIdx] ?? "").trim();
    if (!key) return void skipped.push({ row: rowNumber, reason: "empty key" });
    if (seen.has(key)) return void skipped.push({ row: rowNumber, reason: `duplicate key "${key}"` });
    seen.add(key);
    const data: Record<string, string> = {};
    header.forEach((h, c) => {
      if (h) data[h] = cells[c] ?? "";
    });
    rows.push({ formId, externalKey: key, rowNumber, data });
  });

  // A bad fetch or cleared sheet must not wipe every listing.
  if (!rows.length) {
    const [live] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(applications)
      .where(and(eq(applications.formId, formId), isNull(applications.removedAt)));
    if (live.n > 0) throw new HttpError(422, "Sheet has no rows; refusing to remove all existing listings");
  }

  const known = new Map(form.schemaDefinition.columns.map((c) => [c.header, c.public]));
  const columns = header.filter(Boolean).map((h) => ({ header: h, public: known.get(h) ?? false }));

  return db.transaction(async (tx) => {
    for (let i = 0; i < rows.length; i += 500) {
      await tx
        .insert(applications)
        .values(rows.slice(i, i + 500))
        .onConflictDoUpdate({
          target: [applications.formId, applications.externalKey],
          set: {
            rowNumber: sql`excluded.row_number`,
            data: sql`excluded.data`,
            removedAt: null,
            parsedAt: sql`now()`,
            updatedAt: sql`now()`,
          },
        });
    }
    const gone = await tx
      .update(applications)
      .set({ removedAt: new Date() })
      .where(
        and(
          eq(applications.formId, formId),
          isNull(applications.removedAt),
          rows.length ? notInArray(applications.externalKey, [...seen]) : undefined,
        ),
      )
      .returning({ id: applications.id });
    await tx
      .update(applicationForms)
      .set({ schemaDefinition: { columns }, lastSyncedAt: new Date() })
      .where(eq(applicationForms.id, formId));
    return { total: rows.length, skipped, removed: gone.length };
  });
}

/** Used by the cron route: one failing sheet must not stop the others. */
export async function syncAllForms() {
  const forms = await db.select({ id: applicationForms.id }).from(applicationForms).where(eq(applicationForms.isActive, true));
  const results: Record<string, SyncResult | { error: string }> = {};
  for (const f of forms) {
    results[f.id] = await syncForm(f.id).catch((e: unknown) => ({
      error: e instanceof Error ? e.message : "sync failed",
    }));
  }
  return results;
}
