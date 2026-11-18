import {
  type AppField,
  httpUrl,
  inferType,
  parseDate,
} from "./application-fields";
import { isCountryCode, parseCountries } from "./countries";

export type ApplicationDraftInput = {
  title: string;
  category: string | null;
  applyUrl: string | null;
  deadline: string | null;
  status: "open" | "closed";
  fields: AppField[];
  countries: string[];
  unknownCountries: string[];
};
export type Draft = { item: ApplicationDraftInput | null; errors: string[]; warnings: string[] };
export type Row = { pairs: [string, string][]; line: string };

/** RFC 4180 CSV: quotes, doubled quotes, newlines inside quotes, CRLF, BOM. Delimiter `,` or `;`. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === delim) {
      row.push(cell);
      cell = "";
    }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

/** Header row + data rows to key/value rows. */
export function csvRows(table: string[][]): Row[] {
  const [header = [], ...data] = table;
  const names = header.map((h) => h.trim());
  return data.map((cells, i) => ({
    line: `row ${i + 2}`,
    pairs: names.flatMap((h, c): [string, string][] => (h ? [[h, (cells[c] ?? "").trim()]] : [])),
  }));
}

/** `## Title` sections; `- Key: value` lines are fields; other text is the description. */
export function parseMarkdown(input: string): { rows: Row[]; warnings: string[] } {
  const warnings: string[] = [];
  const rows: Row[] = [];
  let cur: { title: string; pairs: [string, string][]; text: string[] } | null = null;
  const flush = () => {
    if (!cur) return;
    const pairs: [string, string][] = [["Title", cur.title], ...cur.pairs];
    const desc = cur.text.join("\n").trim();
    if (desc) pairs.push(["Description", desc]);
    rows.push({ pairs, line: `"${cur.title}"` });
  };
  let stray = false;
  for (const raw of input.replace(/^﻿/, "").split(/\r?\n/)) {
    const h = raw.match(/^##\s+(.+?)\s*#*\s*$/);
    if (h) {
      flush();
      cur = { title: h[1], pairs: [], text: [] };
      continue;
    }
    if (!cur) {
      if (raw.trim() && !/^#\s/.test(raw)) stray = true;
      continue;
    }
    const kv = raw.match(/^\s*[-*]\s+(?:\*\*(.+?)\*\*|([^:]+?))\s*:\s*(.*)$/);
    if (kv) cur.pairs.push([(kv[1] ?? kv[2]).replace(/:$/, "").trim(), kv[3].trim()]);
    else cur.text.push(raw);
  }
  flush();
  if (stray) warnings.push("Text before the first ## heading was ignored");
  return { rows, warnings };
}

const ALIASES: Record<string, string[]> = {
  title: ["title", "name", "название", "наименование"],
  category: ["category", "категория"],
  deadline: ["deadline", "дедлайн", "срок"],
  link: ["link", "url", "apply link", "ссылка"],
  status: ["status", "статус"],
  countries: ["country", "countries", "страна", "страны", "ел"],
};
const reservedOf = (key: string) =>
  Object.entries(ALIASES).find(([, names]) => names.includes(key.trim().toLowerCase()))?.[0];

const CLOSED = ["closed", "expired", "закрыт", "закрыто"];
const NO_DEADLINE = ["", "no deadline", "none", "-", "нет", "без дедлайна"];

/** Like parseCountries, but a bare uppercase alpha-2 code (what the export writes) is accepted too. */
function countriesOf(text: string) {
  const parts = text.split(/[;,]/).map((p) => p.trim());
  if (parts.every(isCountryCode)) return { codes: [...new Set(parts)], unknown: [] };
  return parseCountries(text);
}

/** Turns parsed rows into applications; a row without a title is an error and has no item. */
export function toDrafts(rows: Row[]): Draft[] {
  return rows.map((row) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let title = "";
    let category: string | null = null;
    let applyUrl: string | null = null;
    let deadline: string | null = null;
    let status: "open" | "closed" = "open";
    const fields: AppField[] = [];
    let hasCountry = false;
    let countries: string[] = [];
    let unknownCountries: string[] = [];
    const labels = new Set<string>();
    const addField = (label: string, value: string, isPublic = true) => {
      if (!value.trim()) return;
      let l = label;
      for (let n = 2; labels.has(l.toLowerCase()); n++) l = `${label} ${n}`;
      labels.add(l.toLowerCase());
      fields.push({ label: l, type: inferType(value), value: value.trim(), public: isPublic });
    };
    for (const [rawKey, value] of row.pairs) {
      const reserved = reservedOf(rawKey);
      if (reserved === "title" && !title) title = value;
      else if (reserved === "category" && category === null) category = value || null;
      else if (reserved === "countries") {
        hasCountry = true;
        const r = countriesOf(value);
        countries = [...new Set([...countries, ...r.codes])];
        unknownCountries = [...new Set([...unknownCountries, ...r.unknown])];
      } else if (reserved === "status") status = CLOSED.includes(value.trim().toLowerCase()) ? "closed" : "open";
      else if (reserved === "link" && applyUrl === null) {
        const url = httpUrl(value);
        if (url) applyUrl = url;
        else if (value) {
          warnings.push(`Link "${value}" is not a valid http(s) URL; kept as a text field`);
          addField(rawKey, value);
        }
      } else if (reserved === "deadline" && deadline === null) {
        const d = parseDate(value);
        if (d) deadline = d;
        else if (!NO_DEADLINE.includes(value.trim().toLowerCase())) {
          warnings.push(`Deadline "${value}" is not dd.mm.yyyy or yyyy-mm-dd; kept as a text field`);
          addField(rawKey, value);
        }
      } else {
        const priv = /\s*\(private\)\s*$/i;
        const isPrivate = priv.test(rawKey);
        addField(rawKey.replace(priv, "").trim() || rawKey, value, !isPrivate);
      }
    }
    if (!hasCountry) {
      const loc = row.pairs.find(([k]) => k.trim().toLowerCase() === "location");
      if (loc) ({ codes: countries, unknown: unknownCountries } = countriesOf(loc[1]));
    }
    if (!title.trim()) errors.push(`${row.line}: no title`);
    return {
      item: errors.length ? null : { title: title.trim(), category, applyUrl, deadline, status, fields, countries, unknownCountries },
      errors,
      warnings,
    };
  });
}

/** Picks the parser from the file name or the content. */
export function parseImport(text: string, filename = ""): { drafts: Draft[]; warnings: string[] } {
  const md = /\.(md|markdown)$/i.test(filename) || (!/\.(csv|txt)$/i.test(filename) && /^\s*#/.test(text));
  if (md) {
    const { rows, warnings } = parseMarkdown(text);
    return { drafts: toDrafts(rows), warnings };
  }
  return { drafts: toDrafts(csvRows(parseCsv(text))), warnings: [] };
}

const csvCell = (v: string) => (/[",;\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function toCsv(
  apps: {
    title: string;
    category: string | null;
    applyUrl: string | null;
    deadline: string | null;
    status: string;
    fields: AppField[];
    countries: string[];
  }[],
): string {
  const labels: string[] = [];
  const header = (f: AppField) => (f.public ? f.label : `${f.label} (private)`);
  for (const a of apps) for (const f of a.fields) if (!labels.includes(header(f))) labels.push(header(f));
  const lines = [["Title", "Category", "Deadline", "Link", "Status", "Country", ...labels]];
  for (const a of apps) {
    const byHeader = new Map(a.fields.map((f) => [header(f), f.value]));
    lines.push([
      a.title,
      a.category ?? "",
      a.deadline ? a.deadline.split("-").reverse().join(".") : "",
      a.applyUrl ?? "",
      a.status,
      a.countries.join("; "),
      ...labels.map((l) => byHeader.get(l) ?? ""),
    ]);
  }
  return "﻿" + lines.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
