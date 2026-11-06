import { afterAll, describe, expect, it } from "vitest";
import { getListing, listListings, applyTo, listMySubmissions, updateForm } from "@/lib/services/applications";
import { parseDeadline, syncForm, todayAlmaty, type Cell } from "@/lib/services/sheets";
import { parseSheetId } from "@/lib/sheet-url";
import { cleanup, grid, makeForm, makeUser } from "./helpers";

afterAll(cleanup);

const H = ["Status", "Name", "Link", "Deadline", "Notes"];
const fixture = (rows: Cell[][]) => async () => rows;
const link = (text: string, url?: string): Cell => ({ text, url });

/** dd.mm.yyyy for today in Almaty plus `days`, so these tests do not rot. */
function inDays(days: number) {
  const [y, m, d] = todayAlmaty().split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(date.getUTCDate())}.${p(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`;
}

async function setup() {
  const admin = await makeUser("admin");
  const form = await makeForm(admin, "Name", { linkColumn: "Link", statusColumn: "Status", deadlineColumn: "Deadline" });
  return { admin, form };
}

describe("sheet parsing", () => {
  it("reads sheet ids from bare ids and urls only", () => {
    const id = "1H93qo7bIrw2kATiSSXYacg39P3S4yU3ySIOG-HV_e5g";
    expect(parseSheetId(id)).toBe(id);
    expect(parseSheetId(`https://docs.google.com/spreadsheets/d/${id}/edit?gid=0#gid=0`)).toBe(id);
    expect(parseSheetId("https://evil.example/spreadsheets/d/" + id)).toBeNull();
    expect(parseSheetId("short")).toBeNull();
  });

  it("parses dd.mm.yyyy and rejects impossible dates", () => {
    expect(parseDeadline("04.11.2026")).toBe("2026-11-04");
    expect(parseDeadline("31.02.2026")).toBeNull();
    expect(parseDeadline("no deadline")).toBeNull();
  });
});

describe("sheet sync with status, link and deadline columns", () => {
  it("lists open rows, closes expired and past-deadline ones, skips notes under the table", async () => {
    const { form } = await setup();
    const res = await syncForm(
      form.id,
      fixture(
        grid(H, [
          ["no deadline", "KAUST", link("Internships", "https://admissions.kaust.edu.sa/study/internships"), "no deadline", ""],
          ["expired", "OIST", link("Apply", "https://www.oist.jp/apply"), inDays(-100), ""],
          ["open", "Stale open row", link("x", "https://example.org/stale"), inDays(-1), ""],
          ["open", "Due today", link("x", "https://example.org/today"), inDays(0), ""],
          ["open", "No link row", "", inDays(30), ""],
          ["", "", "", "", ""],
          ["", "Полезные сайты", "", "", ""],
          ["", "Bright Scholarship", link("Bright", "https://brightscholarship.com/"), "", ""],
        ]),
      ),
    );
    expect(res).toMatchObject({ total: 5, closed: 2, removed: 0 });
    expect(res.skipped).toEqual([
      { row: 8, reason: "empty status" },
      { row: 9, reason: "empty status" },
    ]);
    await updateForm(form.id, { publicColumns: ["Name", "Link", "Deadline"] });
    const names = (await listListings(100, 0, form.id)).map((l) => l.data.Name);
    expect(names).toEqual(["KAUST", "Due today", "No link row"]);
  });

  it("exposes the link as applyUrl only, even when the column is marked public", async () => {
    const { form } = await setup();
    await syncForm(form.id, fixture(grid(H, [["open", "Grant", link("click", "https://example.org/apply"), inDays(10), ""]])));
    await updateForm(form.id, { publicColumns: ["Name", "Link"] });
    const [listing] = await listListings(100, 0, form.id);
    expect(listing.applyUrl).toBe("https://example.org/apply");
    expect(listing.data).toEqual({ Name: "Grant" });
  });

  it("warns on a link that is not http(s) and falls back to link text that is a URL", async () => {
    const { form } = await setup();
    const res = await syncForm(
      form.id,
      fixture(
        grid(H, [
          ["open", "Bad", link("javascript:alert(1)", "javascript:alert(1)"), "", ""],
          ["open", "Text url", link("https://example.org/plain"), "", ""],
          ["open", "Odd deadline", "", "soon", ""],
        ]),
      ),
    );
    expect(res.warnings.map((w) => w.row)).toEqual([2, 4]);
    await updateForm(form.id, { publicColumns: ["Name"] });
    const byName = Object.fromEntries((await listListings(100, 0, form.id)).map((l) => [l.data.Name, l.applyUrl]));
    expect(byName).toEqual({ Bad: null, "Text url": "https://example.org/plain", "Odd deadline": null });
  });

  it("records external only for rows with a link, and a closed row answers 410", async () => {
    const { form } = await setup();
    const user = await makeUser();
    await syncForm(
      form.id,
      fixture(
        grid(H, [
          ["open", "External", link("x", "https://example.org/e"), "", ""],
          ["open", "Onsite", "", "", ""],
          ["open", "Soon closed", link("x", "https://example.org/c"), inDays(5), ""],
        ]),
      ),
    );
    await updateForm(form.id, { publicColumns: ["Name"] });
    const id = Object.fromEntries((await listListings(100, 0, form.id)).map((l) => [l.data.Name, l.id]));
    expect((await applyTo(user.id, id.External)).external).toBe(true);
    expect((await applyTo(user.id, id.Onsite)).external).toBe(false);
    const mine = await listMySubmissions(user.id);
    expect(mine.map((m) => m.external).sort()).toEqual([false, true]);
    await syncForm(
      form.id,
      fixture(grid(H, [["expired", "Soon closed", link("x", "https://example.org/c"), "", ""], ["open", "External", link("x", "https://example.org/e"), "", ""], ["open", "Onsite", "", "", ""]])),
    );
    await expect(applyTo(user.id, id["Soon closed"])).rejects.toMatchObject({ status: 410 });
    await expect(getListing(id["Soon closed"])).rejects.toMatchObject({ status: 404 });
  });

  it("rejects a configured column that is missing from the header", async () => {
    const { form } = await setup();
    await expect(syncForm(form.id, fixture(grid(["Status", "Name"], [["open", "x"]])))).rejects.toMatchObject({ status: 422 });
  });
});
