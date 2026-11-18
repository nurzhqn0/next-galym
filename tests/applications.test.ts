import { afterAll, describe, expect, it } from "vitest";
import { todayAlmaty } from "@/lib/application-fields";
import {
  applicationCreate,
  countryCounts,
  applicationImport,
  applicationUpdate,
  applyTo,
  deleteApplication,
  getListing,
  importApplications,
  listListings,
  listMySubmissions,
  updateApplication,
} from "@/lib/services/applications";
import { cleanup, makeApplication, makeUser, PREFIX } from "./helpers";

afterAll(cleanup);

const inDays = (days: number) => {
  const [y, m, d] = todayAlmaty().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

const fields = [
  { label: "Level", type: "text" as const, value: "PhD", public: true },
  { label: "Phone", type: "text" as const, value: "secret-555", public: false },
];

async function setup() {
  const admin = await makeUser("admin");
  const app = await makeApplication(admin, { title: `${PREFIX} Grant ${Math.random()}`, category: "Grants", fields });
  return { admin, app };
}

describe("applications", () => {
  it("never exposes private fields, in listings, detail or snapshots", async () => {
    const { app } = await setup();
    const user = await makeUser();
    expect(JSON.stringify(await listListings(100, 0))).not.toContain("secret");
    expect(JSON.stringify(await getListing(app.id))).not.toContain("secret");
    await applyTo(user.id, app.id);
    expect(JSON.stringify(await listMySubmissions(user.id))).not.toContain("secret");
  });

  it("second apply is 409", async () => {
    const { app } = await setup();
    const user = await makeUser();
    await applyTo(user.id, app.id);
    await expect(applyTo(user.id, app.id)).rejects.toMatchObject({ status: 409 });
  });

  it("closed and past-deadline listings are hidden and 410; due today stays open", async () => {
    const { admin } = await setup();
    const user = await makeUser();
    const closed = await makeApplication(admin, { status: "closed" });
    const past = await makeApplication(admin, { deadline: inDays(-1) });
    const today = await makeApplication(admin, { deadline: inDays(0) });
    await expect(applyTo(user.id, closed.id)).rejects.toMatchObject({ status: 410 });
    await expect(applyTo(user.id, past.id)).rejects.toMatchObject({ status: 410 });
    await expect(getListing(past.id)).rejects.toMatchObject({ status: 404 });
    await applyTo(user.id, today.id);
    const ids = (await listListings(100, 0)).map((l) => l.id);
    expect(ids).toContain(today.id);
    expect(ids).not.toContain(closed.id);
    expect(ids).not.toContain(past.id);
  });

  it("a submission keeps what the user applied to, and shows as removed once closed", async () => {
    const { app } = await setup();
    const user = await makeUser();
    await applyTo(user.id, app.id);
    await updateApplication(app.id, { title: `${PREFIX} renamed`, status: "closed" });
    const [mine] = await listMySubmissions(user.id);
    expect(mine.title).toBe(app.title);
    expect(mine.fields.map((f) => f.label)).toEqual(["Level"]);
    expect(mine.listingRemoved).toBe(true);
  });

  it("an external link makes the answer self-reported", async () => {
    const { admin } = await setup();
    const user = await makeUser();
    const app = await makeApplication(admin, { applyUrl: "https://example.org/apply" });
    expect((await applyTo(user.id, app.id)).external).toBe(true);
  });

  it("delete is refused with submissions, allowed without", async () => {
    const { admin, app } = await setup();
    const user = await makeUser();
    await applyTo(user.id, app.id);
    await expect(deleteApplication(app.id)).rejects.toMatchObject({ status: 409 });
    const lone = await makeApplication(admin);
    await deleteApplication(lone.id);
    await expect(deleteApplication(lone.id)).rejects.toMatchObject({ status: 404 });
  });

  it("import creates every item in one go, and the schema rejects bad field values", async () => {
    const admin = await makeUser("admin");
    const ok = applicationImport.parse({ items: [{ title: `${PREFIX} i1` }, { title: `${PREFIX} i2`, fields }] });
    expect(await importApplications(ok.items, admin.id)).toEqual({ created: 2 });
    expect(applicationCreate.safeParse({ title: "x", fields: [{ label: "Site", type: "url", value: "nope", public: true }] }).success).toBe(false);
    expect(applicationCreate.safeParse({ title: "x", fields: [{ label: "A", type: "text", value: "1", public: true }, { label: "a", type: "text", value: "2", public: true }] }).success).toBe(false);
    expect(applicationCreate.safeParse({ title: "x", applyUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  it("filters by country and by none, and leaves closed or expired listings out", async () => {
    const { admin } = await setup();
    const ch = await makeApplication(admin, { countries: ["CH"] });
    const both = await makeApplication(admin, applicationCreate.parse({ title: `${PREFIX} both`, countries: ["sg", "JP", "jp"] }));
    const online = await makeApplication(admin, {});
    const closed = await makeApplication(admin, { countries: ["CH"], status: "closed" });
    const past = await makeApplication(admin, { countries: ["CH"], deadline: inDays(-1) });
    const closedNone = await makeApplication(admin, { status: "closed" });
    const chIds = (await listListings(100, 0, "CH")).map((l) => l.id);
    expect(chIds).toContain(ch.id);
    expect(chIds).not.toContain(both.id);
    expect(chIds).not.toContain(closed.id);
    expect(chIds).not.toContain(past.id);
    expect((await listListings(100, 0, "XX")).map((l) => l.id)).toContain(online.id);
    expect(both.countries).toEqual(["SG", "JP"]);
    const noneIds = (await listListings(100, 0, "none")).map((l) => l.id);
    expect(noneIds).toContain(online.id);
    expect(noneIds).not.toContain(ch.id);
    expect(noneIds).not.toContain(closedNone.id);
  });

  it("counts live listings per country", async () => {
    const { admin } = await setup();
    const before = await countryCounts();
    const get = (c: Awaited<ReturnType<typeof countryCounts>>, code: string) =>
      c.countries.find((x) => x.code === code)?.count ?? 0;
    await makeApplication(admin, { countries: ["NZ", "FJ"] });
    await makeApplication(admin, { countries: ["NZ"] });
    await makeApplication(admin, {});
    await makeApplication(admin, { countries: ["NZ"], status: "closed" });
    await makeApplication(admin, { countries: ["NZ"], deadline: inDays(-1) });
    await makeApplication(admin, { status: "closed" });
    const after = await countryCounts();
    expect(get(after, "NZ") - get(before, "NZ")).toBe(2);
    expect(get(after, "FJ") - get(before, "FJ")).toBe(1);
    expect(after.none - before.none).toBe(1);
    const sorted = [...after.countries].sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
    expect(after.countries).toEqual(sorted);
  });

  it("dedupes countries on update", async () => {
    const { app } = await setup();
    const input = applicationUpdate.parse({ countries: ["jp", "JP"] });
    const row = await updateApplication(app.id, input);
    expect(row.countries).toEqual(["JP"]);
  });

  it("rejects an invalid country code on create", () => {
    expect(applicationCreate.safeParse({ title: "x", countries: ["ZZ"] }).success).toBe(false);
    expect(applicationCreate.safeParse({ title: "x", countries: ["ch"] }).success).toBe(true);
  });
});
