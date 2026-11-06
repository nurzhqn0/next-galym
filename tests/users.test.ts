import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { logFields, route } from "@/lib/http";
import { changePassword, getSessionUser, login } from "@/lib/services/auth";
import { createNews, updateNews } from "@/lib/services/news";
import { createUser, deleteUser, listUsers, updateUser } from "@/lib/services/users";
import { cleanup, freshIp, makeUser, PASSWORD, PREFIX } from "./helpers";

afterAll(cleanup);
const email = () => `${PREFIX}-${crypto.randomUUID()}@example.test`;

describe("admin users", () => {
  it("lets admins create users and only the superuser create admins", async () => {
    const admin = await makeUser("admin");
    const root = await makeUser("superuser");
    const input = { password: PASSWORD, fullName: "New", role: "user" as const };
    expect((await createUser(admin, { ...input, email: email() })).role).toBe("user");
    await expect(createUser(admin, { ...input, role: "admin", email: email() })).rejects.toMatchObject({ status: 403 });
    expect((await createUser(root, { ...input, role: "admin", email: email() })).role).toBe("admin");
    const dup = email();
    await createUser(admin, { ...input, email: dup });
    await expect(createUser(admin, { ...input, email: dup })).rejects.toMatchObject({ status: 409 });
  });

  it("a created user can sign in", async () => {
    const admin = await makeUser("admin");
    const e = email();
    await createUser(admin, { email: e, password: PASSWORD, fullName: "Can Login", role: "user" });
    expect((await login({ email: e, password: PASSWORD }, freshIp())).user.email).toBe(e);
  });

  it("changing a password or deactivating signs the user out; email clash is 409", async () => {
    const admin = await makeUser("admin");
    const a = await makeUser();
    const b = await makeUser();
    expect(await getSessionUser(a.token)).not.toBeNull();
    await updateUser(admin, a.id, { password: "another-long-password" });
    expect(await getSessionUser(a.token)).toBeNull();
    await login({ email: a.email, password: "another-long-password" }, freshIp());
    await updateUser(admin, b.id, { isActive: false });
    expect(await getSessionUser(b.token)).toBeNull();
    await expect(updateUser(admin, b.id, { email: a.email })).rejects.toMatchObject({ status: 409 });
  });

  it("only the superuser deletes, never itself or another superuser", async () => {
    const admin = await makeUser("admin");
    const root = await makeUser("superuser");
    const target = await makeUser();
    await expect(deleteUser(admin, target.id)).rejects.toMatchObject({ status: 403 });
    await expect(deleteUser(root, root.id)).rejects.toMatchObject({ status: 403 });
    await deleteUser(root, target.id);
    expect(await db.select().from(users).where(eq(users.id, target.id))).toHaveLength(0);
    await expect(deleteUser(root, target.id)).rejects.toMatchObject({ status: 404 });
  });

  it("filters the list by search and role and returns a total", async () => {
    const admin = await makeUser("admin");
    const hit = await makeUser();
    const res = await listUsers(20, 0, { q: hit.email.slice(0, 30), role: "user" });
    expect(res.items.map((u) => u.id)).toContain(hit.id);
    expect(res.total).toBeGreaterThanOrEqual(1);
    expect((await listUsers(20, 0, { q: "100%" })).total).toBe(0);
    expect((await listUsers(20, 0, { role: "admin" })).items.map((u) => u.id)).toContain(admin.id);
  });
});

describe("own password", () => {
  it("needs the current password and keeps only the current session", async () => {
    const me = await makeUser();
    const other = (await login({ email: me.email, password: PASSWORD }, freshIp())).token;
    await expect(changePassword(me.id, { currentPassword: "wrong-password!", newPassword: "brand-new-password" }, me.token)).rejects.toMatchObject({ status: 403 });
    await changePassword(me.id, { currentPassword: PASSWORD, newPassword: "brand-new-password" }, me.token);
    expect(await getSessionUser(me.token)).not.toBeNull();
    expect(await getSessionUser(other)).toBeNull();
  });
});

describe("news transaction reads", () => {
  it("create and update return the translations just written", async () => {
    const admin = await makeUser("admin");
    const created = await createNews({ slug: `${PREFIX}-tx-${Date.now()}`, status: "draft", translations: { en: { title: "One", content: "c" } } }, admin.id);
    expect(created.translations.map((t) => t.title)).toEqual(["One"]);
    const updated = await updateNews(created.id, { translations: { en: { title: "Two", content: "c" } } });
    expect(updated.translations.map((t) => t.title)).toEqual(["Two"]);
  });
});

describe("route wrapper", () => {
  const post = (origin: string) =>
    new NextRequest("http://localhost/api/x", { method: "POST", headers: { origin, host: "localhost" } });
  const ok = route(async () => ({ ok: true }));

  it("treats Origin: null as cross-origin (403), not a crash", async () => {
    expect((await ok(post("null"), {})).status).toBe(403);
    expect((await ok(post("http://evil.example"), {})).status).toBe(403);
    expect((await ok(post("http://localhost"), {})).status).toBe(200);
  });

  it("logs the method, path and error name, never the message", () => {
    const e = Object.assign(new Error("Failed query: insert ... params: a@b.c,$argon2id$secret"), { code: "23505" });
    const fields = logFields(post("http://localhost"), e);
    expect(JSON.stringify(fields)).not.toContain("secret");
    expect(fields).toMatchObject({ method: "POST", path: "/api/x", code: "23505" });
  });
});
