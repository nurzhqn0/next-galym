import { afterAll, describe, expect, it } from "vitest";
import { archiveUpdate, createArchive, getAdminArchive, listAdminArchives, updateArchive } from "@/lib/services/archives";
import { cleanup, makeUser, PREFIX } from "./helpers";

afterAll(cleanup);

describe("archives", () => {
  it("null removes a translation on edit; English cannot be removed", async () => {
    const admin = await makeUser("admin");
    const a = await createArchive(
      {
        fileUrl: `https://example.com/${PREFIX}-${Date.now()}.pdf`,
        fileType: "PDF",
        fileSize: 1000,
        translations: { en: { title: "EN" }, kk: { title: "KK", description: "d" } },
      },
      admin.id,
    );
    expect(a.translations.map((x) => x.locale).sort()).toEqual(["en", "kk"]);
    const updated = await updateArchive(a.id, { translations: { kk: null } });
    expect(updated.translations.map((x) => x.locale)).toEqual(["en"]);
    expect((await getAdminArchive(a.id)).translations.map((x) => x.title)).toEqual(["EN"]);
    const listed = (await listAdminArchives(100, 0)).items.find((x) => x.id === a.id);
    expect(listed?.translations.map((x) => x.locale)).toEqual(["en"]);
    expect(archiveUpdate.safeParse({ translations: { en: null } }).success).toBe(false);
  });
});
