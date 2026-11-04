import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { createSession, deleteSession, getSessionUser, login, register } from "@/lib/services/auth";
import { assertCanModify } from "@/lib/services/users";
import { cleanup, freshIp, makeUser, PASSWORD, PREFIX } from "./helpers";

afterAll(cleanup);

describe("auth", () => {
  it("registers, stores only a hash of the token, and resolves the session", async () => {
    const u = await makeUser();
    expect((await getSessionUser(u.token))?.id).toBe(u.id);
    const rows = await db.select().from(sessions).where(eq(sessions.userId, u.id));
    expect(rows.map((r) => r.token)).not.toContain(u.token);
  });

  it("rejects a duplicate email with 409", async () => {
    const u = await makeUser();
    await expect(
      register({ email: u.email.toUpperCase(), password: PASSWORD, fullName: "x" }, freshIp()),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("logs in with the right password only; unknown email and wrong password look the same", async () => {
    const u = await makeUser();
    const ok = await login({ email: u.email, password: PASSWORD }, freshIp());
    expect(ok.user.id).toBe(u.id);
    const wrong = await login({ email: u.email, password: "nope-nope-nope" }, freshIp()).catch((e) => e);
    const unknown = await login({ email: `${PREFIX}-none@example.test`, password: PASSWORD }, freshIp()).catch((e) => e);
    expect([wrong.status, unknown.status]).toEqual([401, 401]);
    expect(wrong.message).toBe(unknown.message);
  });

  it("logout invalidates the session", async () => {
    const u = await makeUser();
    await deleteSession(u.token);
    expect(await getSessionUser(u.token)).toBeNull();
  });

  it("expired session is rejected", async () => {
    const u = await makeUser();
    await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(sessions.userId, u.id));
    expect(await getSessionUser(u.token)).toBeNull();
  });

  it("inactive user loses access immediately and cannot log in", async () => {
    const u = await makeUser();
    await db.update(users).set({ isActive: false }).where(eq(users.id, u.id));
    expect(await getSessionUser(u.token)).toBeNull();
    await expect(login({ email: u.email, password: PASSWORD }, freshIp())).rejects.toMatchObject({ status: 401 });
  });

  it("rate-limits repeated login attempts for one email with 429", async () => {
    const email = `${PREFIX}-rl-${Date.now()}@example.test`;
    const results: number[] = [];
    for (let i = 0; i < 12; i++) {
      results.push(await login({ email, password: "x" }, freshIp()).catch((e) => e.status));
    }
    expect(results.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(results.slice(10)).toEqual([429, 429]);
  });
});

describe("role rules", () => {
  const actor = (role: "superuser" | "admin" | "user") => ({ id: "a", email: "", fullName: "", role });
  it("only the superuser changes roles", () => {
    expect(() => assertCanModify(actor("admin"), { id: "b", role: "user" }, { role: "admin" })).toThrow();
    expect(() => assertCanModify(actor("superuser"), { id: "b", role: "user" }, { role: "admin" })).not.toThrow();
  });
  it("admins deactivate regular users but not admins, the superuser, or themselves", () => {
    expect(() => assertCanModify(actor("admin"), { id: "b", role: "user" }, { isActive: false })).not.toThrow();
    expect(() => assertCanModify(actor("admin"), { id: "b", role: "admin" }, { isActive: false })).toThrow();
    expect(() => assertCanModify(actor("admin"), { id: "b", role: "superuser" }, { isActive: false })).toThrow();
    expect(() => assertCanModify(actor("superuser"), { id: "a", role: "admin" }, { isActive: false })).toThrow();
  });
});

it("createSession gives distinct tokens", async () => {
  const u = await makeUser();
  const [a, b] = await Promise.all([createSession(u.id), createSession(u.id)]);
  expect(a.token).not.toBe(b.token);
});
