import ExcelJS from "exceljs";
import { and, eq, isNull, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { applicationForms, applications } from "@/lib/db/schema";
import { HttpError } from "@/lib/http";

export type Cell = { text: string; url?: string };
export type SheetFetcher = (sheetId: string, sheetName: string) => Promise<Cell[][]>;

const MAX_BYTES = 10 * 1024 * 1024;
const TIME_ZONE = "Asia/Almaty";

/** exceljs hands back strings, numbers, dates, rich text and hyperlink objects; reduce any of them to text. */
export function cellText(value: ExcelJS.CellValue | undefined): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if ("richText" in value) return value.richText.map((r) => r.text).join("");
  if ("text" in value) return cellText(value.text as ExcelJS.CellValue);
  if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
  return "";
}

/**
 * Reads a sheet shared as "anyone with the link can view" through Google's xlsx export.
 * CSV drops hyperlink targets (a linked cell exports as its display text), xlsx keeps them.
 */
export const fetchSheetRows: SheetFetcher = async (sheetId, sheetName) => {
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/export?format=xlsx`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || type.includes("text/html")) {
    throw new HttpError(502, "Could not read the Google Sheet. Is it shared as 'anyone with the link can view'?");
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_BYTES) throw new HttpError(502, "The Google Sheet is too large to sync");

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new HttpError(502, "Google returned a file that is not a spreadsheet");
  }
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) throw new HttpError(422, `Tab "${sheetName}" not found in the Google Sheet`);

  const grid: Cell[][] = [];
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const cells: Cell[] = [];
    for (let c = 1; c <= sheet.columnCount; c++) {
      const cell = row.getCell(c);
      const link = typeof cell.hyperlink === "string" ? cell.hyperlink : undefined;
      cells.push({ text: cellText(cell.value).trim(), url: link });
    }
    grid.push(cells);
  }
  return grid;
};

export type SyncResult = {
  total: number;
  closed: number;
  skipped: { row: number; reason: string }[];
  warnings: { row: number; reason: string }[];
  removed: number;
};

/** Today in Almaty as yyyy-mm-dd, so a deadline "today" stays open until the day ends there. */
export function todayAlmaty(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

/** dd.mm.yyyy to yyyy-mm-dd, or null when the text is not a real date. */
export function parseDeadline(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

function httpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function syncForm(formId: string, fetchRows: SheetFetcher = fetchSheetRows): Promise<SyncResult> {
  const [form] = await db.select().from(applicationForms).where(eq(applicationForms.id, formId));
  if (!form) throw new HttpError(404, "Form not found");

  const grid = await fetchRows(form.googleSheetId, form.sheetName);
  const header = (grid[0] ?? []).map((c) => c.text.trim());
  const indexOf = (label: string, column: string | null) => {
    if (!column) return -1;
    const i = header.indexOf(column);
    if (i < 0) throw new HttpError(422, `${label} column "${column}" not found in the sheet header`);
    return i;
  };
  const keyIdx = indexOf("Key", form.keyColumn);
  const linkIdx = indexOf("Link", form.linkColumn);
  const statusIdx = indexOf("Status", form.statusColumn);
  const deadlineIdx = indexOf("Deadline", form.deadlineColumn);

  const today = todayAlmaty();
  const seen = new Set<string>();
  const skipped: SyncResult["skipped"] = [];
  const warnings: SyncResult["warnings"] = [];
  const rows: (typeof applications.$inferInsert)[] = [];
  let closed = 0;

  grid.slice(1).forEach((cells, i) => {
    const rowNumber = i + 2; // sheet row number, header is row 1
    if (cells.every((c) => !c.text && !c.url)) return; // blank rows are not worth reporting
    const key = (cells[keyIdx]?.text ?? "").trim();
    if (!key) return void skipped.push({ row: rowNumber, reason: "empty key" });
    if (seen.has(key)) return void skipped.push({ row: rowNumber, reason: `duplicate key "${key}"` });
    // A row with no status is a note under the table, not a listing.
    const status = statusIdx >= 0 ? (cells[statusIdx]?.text ?? "").trim().toLowerCase() : "";
    if (statusIdx >= 0 && !status) return void skipped.push({ row: rowNumber, reason: "empty status" });
    seen.add(key);

    const data: Record<string, string> = {};
    header.forEach((h, c) => {
      if (h) data[h] = cells[c]?.text ?? "";
    });

    if (linkIdx >= 0) {
      const cell = cells[linkIdx];
      const url = httpUrl(cell?.url) ?? httpUrl(cell?.text);
      if (!url && (cell?.text || cell?.url)) warnings.push({ row: rowNumber, reason: "link is not a valid http(s) URL" });
      data[header[linkIdx]] = url ?? "";
    }

    let isClosed = status === "expired";
    if (deadlineIdx >= 0) {
      const text = (cells[deadlineIdx]?.text ?? "").trim();
      const date = parseDeadline(text);
      if (date) isClosed ||= date < today;
      else if (text && text.toLowerCase() !== "no deadline") warnings.push({ row: rowNumber, reason: `deadline "${text}" is not dd.mm.yyyy` });
    }
    if (isClosed) closed++;
    rows.push({ formId, externalKey: key, rowNumber, data, removedAt: isClosed ? new Date() : null });
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
            removedAt: sql`excluded.removed_at`,
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
    return { total: rows.length, closed, skipped, warnings, removed: gone.length };
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
