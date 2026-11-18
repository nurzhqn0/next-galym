import { describe, expect, it } from "vitest";
import { inferType, parseDate } from "@/lib/application-fields";
import { csvRows, parseCsv, parseImport, parseMarkdown, toCsv, toDrafts } from "@/lib/application-import";

describe("csv", () => {
  it("handles quotes, doubled quotes, newlines in cells, CRLF and BOM", () => {
    const t = parseCsv('﻿Title,Notes\r\n"A, B","say ""hi""\nline2"\r\nC,d\r\n');
    expect(t).toEqual([["Title", "Notes"], ["A, B", 'say "hi"\nline2'], ["C", "d"]]);
  });

  it("detects the semicolon delimiter", () => {
    expect(parseCsv("Title;Level\nA;PhD")[1]).toEqual(["A", "PhD"]);
  });
});

describe("markdown", () => {
  it("reads sections, plain and bold keys, and a description", () => {
    const md = "intro\n\n## Erasmus\n- Category: Internships\n- **Deadline**: 31.12.2026\n- Level: PhD\n\nFree text\n\nmore\n\n## DAAD\n- Link: https://daad.de";
    const { rows, warnings } = parseMarkdown(md);
    expect(warnings).toHaveLength(1);
    expect(rows).toHaveLength(2);
    const [a, b] = toDrafts(rows).map((d) => d.item!);
    expect(a).toMatchObject({ title: "Erasmus", category: "Internships", deadline: "2026-12-31" });
    expect(a.fields.map((f) => f.label)).toEqual(["Level", "Description"]);
    expect(a.fields[1]).toMatchObject({ type: "longtext" });
    expect(b.applyUrl).toBe("https://daad.de/");
  });
});

describe("drafts", () => {
  const draft = (csv: string) => toDrafts(csvRows(parseCsv(csv)));

  it("maps aliases, status, deadline formats and field types", () => {
    const [d] = draft("Название,Категория,Срок,Ссылка,Статус,Level,Site,Cost\nГрант,Гранты,01.02.2027,https://x.org,закрыт,PhD,https://s.org,100");
    expect(d.item).toMatchObject({ title: "Грант", category: "Гранты", deadline: "2027-02-01", applyUrl: "https://x.org/", status: "closed" });
    expect(d.item!.fields.map((f) => [f.label, f.type])).toEqual([["Level", "text"], ["Site", "url"], ["Cost", "number"]]);
  });

  it("accepts yyyy-mm-dd and 'no deadline'; warns on junk and keeps it as text", () => {
    expect(draft("Title,Deadline\nA,2027-03-04")[0].item!.deadline).toBe("2027-03-04");
    const none = draft("Title,Deadline\nA,no deadline")[0];
    expect(none.item!.deadline).toBeNull();
    expect(none.warnings).toHaveLength(0);
    const bad = draft("Title,Deadline\nA,soon")[0];
    expect(bad.warnings).toHaveLength(1);
    expect(bad.item!.fields[0].value).toBe("soon");
  });

  it("warns on an invalid link and keeps it as text", () => {
    const d = draft("Title,Link\nA,not a url")[0];
    expect(d.item!.applyUrl).toBeNull();
    expect(d.warnings).toHaveLength(1);
  });

  it("parses a Country column and warns on unknown names", () => {
    const d = draft("Title,Country\nA,Singapore & Japan; Narnia")[0];
    expect(d.item!.countries).toEqual(["SG", "JP"]);
    expect(d.item!.unknownCountries).toEqual(["Narnia"]);
  });

  it("derives countries from Location and keeps it as a field", () => {
    const it = draft("Title,Location\nA,Switzerland")[0].item!;
    expect(it.countries).toEqual(["CH"]);
    expect(it.fields).toEqual([{ label: "Location", type: "text", value: "Switzerland", public: true }]);
  });

  it("a Country column wins over Location", () => {
    expect(draft("Title,Country,Location\nA,Japan,Switzerland")[0].item!.countries).toEqual(["JP"]);
  });

  it("a row without a title is an error with no item", () => {
    const [d] = draft("Title,Level\n,PhD");
    expect(d.item).toBeNull();
    expect(d.errors).toHaveLength(1);
  });

  it("(private) columns are not public; empty values are dropped", () => {
    const f = draft("Title,Phone (private),Level,Empty\nA,555,PhD,")[0].item!.fields;
    expect(f).toEqual([
      { label: "Phone", type: "number", value: "555", public: false },
      { label: "Level", type: "text", value: "PhD", public: true },
    ]);
  });

  it("export then import gives the same applications", () => {
    const apps = [
      { title: "A, one", category: "Grants", applyUrl: "https://a.org/", deadline: "2027-01-05", status: "open", countries: ["SG", "JP"], fields: [{ label: "Level", type: "text" as const, value: "PhD", public: true }, { label: "Phone", type: "text" as const, value: "x y", public: false }] },
      { title: "B", category: null, applyUrl: null, deadline: null, status: "closed", countries: [] as string[], fields: [{ label: "Level", type: "text" as const, value: "MSc", public: true }] },
    ];
    const back = parseImport(toCsv(apps), "a.csv").drafts.map((d) => d.item!);
    expect(back.map((b) => [b.title, b.category, b.applyUrl, b.deadline, b.status])).toEqual(apps.map((a) => [a.title, a.category, a.applyUrl, a.deadline, a.status]));
    expect(back.map((b) => b.countries)).toEqual([["SG", "JP"], []]);
    expect(back[0].fields).toEqual(apps[0].fields);
    expect(back[1].fields).toEqual(apps[1].fields);
  });
});

describe("field helpers", () => {
  it("rejects impossible dates and infers types", () => {
    expect(parseDate("31.02.2026")).toBeNull();
    expect(inferType("a@b.co")).toBe("email");
    expect(inferType("2026-01-02")).toBe("date");
    expect(inferType("x".repeat(250))).toBe("longtext");
  });
});
