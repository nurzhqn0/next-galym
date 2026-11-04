import { afterAll, describe, expect, it } from "vitest";
import { createNews, getPublicNews, listPublicNews, newsCreate, updateNews } from "@/lib/services/news";
import { cleanup, makeUser, PREFIX } from "./helpers";

afterAll(cleanup);
const tr = (title: string) => ({ title, content: "body" });

describe("news", () => {
  it("requires an English translation", () => {
    expect(newsCreate.safeParse({ slug: "x", translations: { ru: tr("x") } }).success).toBe(false);
  });

  it("hides drafts, publishes on update, falls back to English", async () => {
    const admin = await makeUser("admin");
    const slug = `${PREFIX}-${Date.now()}`;
    await createNews({ slug, status: "draft", translations: { en: tr("English"), ru: tr("Русский") } }, admin.id);
    await expect(getPublicNews(slug, "en")).rejects.toMatchObject({ status: 404 });
    const published = await updateNews((await createNews({ slug: `${slug}-b`, status: "draft", translations: { en: tr("EN only") } }, admin.id)).id, {
      status: "published",
    });
    expect(published.publishedAt).not.toBeNull();
    const kk = await getPublicNews(`${slug}-b`, "kk");
    expect([kk.locale, kk.title]).toEqual(["en", "EN only"]);
    const list = await listPublicNews("en", 100, 0);
    expect(list.map((n) => n.slug)).toContain(`${slug}-b`);
    expect(list.map((n) => n.slug)).not.toContain(slug);
  });

  it("duplicate slug is 409", async () => {
    const admin = await makeUser("admin");
    const slug = `${PREFIX}-dup-${Date.now()}`;
    await createNews({ slug, status: "draft", translations: { en: tr("a") } }, admin.id);
    await expect(createNews({ slug, status: "draft", translations: { en: tr("b") } }, admin.id)).rejects.toMatchObject({ status: 409 });
  });
});
