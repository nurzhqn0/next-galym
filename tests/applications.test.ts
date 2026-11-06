import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { applications } from "@/lib/db/schema";
import { applyTo, getListing, listListings, listMySubmissions, updateForm } from "@/lib/services/applications";
import { syncForm, type Cell } from "@/lib/services/sheets";
import { cleanup, grid, makeForm, makeUser } from "./helpers";

afterAll(cleanup);
const H = ["id", "title", "notes"];
const fixture = (rows: Cell[][]) => async () => rows;

async function setup() {
  const admin = await makeUser("admin");
  const form = await makeForm(admin);
  await syncForm(form.id, fixture(grid(H, [["a", "Grant A", "secret-a"], ["b", "Grant B", "secret-b"]])));
  await updateForm(form.id, { publicColumns: ["id", "title"] });
  const rows = await db.select().from(applications).where(eq(applications.formId, form.id));
  const idOf = (key: string) => rows.find((r) => r.externalKey === key)!.id;
  return { admin, form, idOf };
}

describe("applications", () => {
  it("never exposes private columns, in listings, detail or snapshots", async () => {
    const { form, idOf } = await setup();
    const user = await makeUser();
    const list = await listListings(100, 0, form.id);
    expect(list).toHaveLength(2);
    expect(JSON.stringify(list)).not.toContain("secret");
    expect(JSON.stringify(await getListing(idOf("a")))).not.toContain("secret");
    await applyTo(user.id, idOf("a"));
    expect(JSON.stringify(await listMySubmissions(user.id))).not.toContain("secret");
  });

  it("new sheet columns default to private", async () => {
    const { form, idOf } = await setup();
    await syncForm(form.id, fixture(grid([...H, "phone"], [["a", "Grant A", "s", "555"], ["b", "Grant B", "s", "556"]])));
    expect(JSON.stringify(await getListing(idOf("a")))).not.toContain("555");
  });

  it("second apply is 409", async () => {
    const { idOf } = await setup();
    const user = await makeUser();
    await applyTo(user.id, idOf("a"));
    await expect(applyTo(user.id, idOf("a"))).rejects.toMatchObject({ status: 409 });
  });

  it("applying to a listing that left the sheet is 410", async () => {
    const { form, idOf } = await setup();
    const user = await makeUser();
    await syncForm(form.id, fixture(grid(H, [["b", "Grant B", "s"]])));
    await expect(applyTo(user.id, idOf("a"))).rejects.toMatchObject({ status: 410 });
  });

  it("reordered sheet keeps each submission on the right listing", async () => {
    const { form, idOf } = await setup();
    const user = await makeUser();
    const sub = await applyTo(user.id, idOf("b"));
    await syncForm(form.id, fixture(grid(H, [["z", "New", "s"], ["b", "Grant B edited", "s"], ["a", "Grant A", "s"]])));
    expect(sub.applicationId).toBe(idOf("b"));
    const mine = await listMySubmissions(user.id);
    expect(mine).toHaveLength(1);
    expect(mine[0].applicationId).toBe(idOf("b"));
    const [row] = await db.select().from(applications).where(eq(applications.id, idOf("b")));
    expect(row.rowNumber).toBe(3);
    expect(row.data.title).toBe("Grant B edited");
    expect(mine[0].data.title).toBe("Grant B"); // snapshot keeps what the user applied to
  });

  it("deleted sheet row is soft-removed, submission survives, row restores if it returns", async () => {
    const { form, idOf } = await setup();
    const user = await makeUser();
    await applyTo(user.id, idOf("a"));
    const res = await syncForm(form.id, fixture(grid(H, [["b", "Grant B", "s"]])));
    expect(res.removed).toBe(1);
    expect((await listMySubmissions(user.id))[0].listingRemoved).toBe(true);
    expect(await listListings(100, 0, form.id)).toHaveLength(1);
    await syncForm(form.id, fixture(grid(H, [["a", "Grant A", "s"], ["b", "Grant B", "s"]])));
    expect((await listMySubmissions(user.id))[0].listingRemoved).toBe(false);
  });

  it("skips empty and duplicate keys, reports them", async () => {
    const { form } = await setup();
    const res = await syncForm(form.id, fixture(grid(H, [["a", "A", ""], ["", "no key", ""], ["a", "dup", ""]])));
    expect(res.total).toBe(1);
    expect(res.skipped.map((s) => s.row)).toEqual([3, 4]);
  });

  it("refuses to wipe every listing from an empty sheet, and rejects a missing key column", async () => {
    const { form } = await setup();
    await expect(syncForm(form.id, fixture(grid(H, [])))).rejects.toMatchObject({ status: 422 });
    await expect(syncForm(form.id, fixture(grid(["title"], [["x"]])))).rejects.toMatchObject({ status: 422 });
    expect(await listListings(100, 0, form.id)).toHaveLength(2);
  });

  it("returns a submission's snapshot in sheet column order, not jsonb key order", async () => {
    const admin = await makeUser("admin");
    const form = await makeForm(admin, "id");
    // jsonb would sort these as id, name, level; the sheet order is name, level, id.
    await syncForm(form.id, fixture(grid(["name", "level", "id"], [["Grant A", "PhD", "a"]])));
    await updateForm(form.id, { publicColumns: ["name", "level", "id"] });
    const [row] = await db.select().from(applications).where(eq(applications.formId, form.id));
    const user = await makeUser();
    await applyTo(user.id, row.id);
    expect(Object.keys((await listMySubmissions(user.id))[0].data)).toEqual(["name", "level", "id"]);
  });
});
