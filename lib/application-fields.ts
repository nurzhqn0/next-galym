export const fieldTypes = ["text", "longtext", "url", "date", "number", "email"] as const;
export type FieldType = (typeof fieldTypes)[number];
export type AppField = { label: string; type: FieldType; value: string; public: boolean };
/** What a student's submission keeps: the public fields as they were when they applied. */
export type Snapshot = {
  title: string;
  category: string | null;
  fields: { label: string; type: FieldType; value: string }[];
};

const TIME_ZONE = "Asia/Almaty";

/** Today in Almaty as yyyy-mm-dd, so a deadline "today" stays open until the day ends there. */
export function todayAlmaty(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

function validDate(y: number, mo: number, d: number): string | null {
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

/** dd.mm.yyyy or yyyy-mm-dd to yyyy-mm-dd, or null when the text is not a real date. */
export function parseDate(text: string): string | null {
  const t = text.trim();
  let m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return validDate(Number(m[3]), Number(m[2]), Number(m[1]));
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? validDate(Number(m[1]), Number(m[2]), Number(m[3])) : null;
}

export const toDmy = (iso: string) => iso.split("-").reverse().join(".");

export function httpUrl(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
export const isNumber = (v: string) => /^-?\d+([.,]\d+)?$/.test(v.trim());

/** Whether a value fits its declared type. */
export function valueFits(type: FieldType, value: string): boolean {
  if (type === "url") return httpUrl(value) !== null;
  if (type === "email") return isEmail(value);
  if (type === "date") return parseDate(value) !== null;
  if (type === "number") return isNumber(value);
  return true;
}

export function inferType(value: string): FieldType {
  const v = value.trim();
  if (httpUrl(v)) return "url";
  if (isEmail(v)) return "email";
  if (parseDate(v)) return "date";
  if (isNumber(v)) return "number";
  return v.length > 200 || v.includes("\n") ? "longtext" : "text";
}

/** Live = open and not past its deadline. */
export const isLive = (a: { status: string; deadline: string | null }, today = todayAlmaty()) =>
  a.status === "open" && (a.deadline === null || a.deadline >= today);
