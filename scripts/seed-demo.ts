// Synthetic demo content for looking at real states (rows, stamps, long strings).
// Every title starts with [DEMO] so nothing here can be mistaken for fact.
// Refuses to run against the main database: point DATABASE_URL at a Neon branch.
import { hash } from "@node-rs/argon2";
import { parse } from "dotenv";
import { readFileSync } from "node:fs";
import { eq, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as s from "../lib/db/schema";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL to a non-main Neon branch URL");

const hostOf = (u: string) => new URL(u).hostname.replace("-pooler", "");
const main = parse(readFileSync(".env.local"));
for (const key of ["DATABASE_URL", "DATABASE_URL_UNPOOLED"]) {
  if (main[key] && hostOf(main[key]) === hostOf(url)) {
    throw new Error("Refusing to seed demo data into the main branch. Use a Neon branch URL.");
  }
}

export const DEMO_PASSWORD = "demo-password-123";
const pool = new Pool({ connectionString: url });
const db = drizzle(pool, { schema: s });

async function main_() {
  const passwordHash = await hash(DEMO_PASSWORD, { algorithm: 2 });
  const find = async (email: string) => (await db.select().from(s.users).where(sql`lower(${s.users.email}) = ${email}`))[0];
  const ensureUser = async (email: string, fullName: string, role: "user" | "admin" | "superuser") => {
    const existing = await find(email);
    if (existing) {
      await db.update(s.users).set({ role, fullName, isActive: true, passwordHash }).where(eq(s.users.id, existing.id));
      return existing;
    }
    return (await db.insert(s.users).values({ email, fullName, role, passwordHash }).returning())[0];
  };
  const admin = await ensureUser("demo-admin@example.test", "[DEMO] Admin Aigerim", "admin");
  const student = await ensureUser("demo-student@example.test", "[DEMO] Student Dauren", "user");
  await ensureUser("demo-root@example.test", "[DEMO] Superuser Asel", "superuser");

  // Two forms, four listings. Long values are deliberate: they test wrapping in all locales.
  await db.delete(s.applicationForms).where(like(s.applicationForms.title, "[DEMO]%"))
  const mkForm = async (title: string, columns: { header: string; public: boolean }[]) =>
    (
      await db
        .insert(s.applicationForms)
        .values({
          title,
          googleSheetId: "demo".padEnd(30, "x"),
          sheetName: "Sheet1",
          keyColumn: "id",
          schemaDefinition: { columns },
          createdBy: admin.id,
          lastSyncedAt: new Date(),
        })
        .returning()
    )[0];
  const cols = [
    { header: "id", public: false },
    { header: "Title", public: true },
    { header: "Deadline", public: true },
    { header: "Level", public: true },
    { header: "Notes", public: false },
  ];
  const grants = await mkForm("[DEMO] Research grants", cols);
  const camps = await mkForm("[DEMO] Summer schools", cols);
  const rows = [
    [grants, "g1", "[DEMO] Young scientists research grant, 36 months", "2026-11-11", "Postgraduate", "private note"],
    [grants, "g2", "[DEMO] Ғылыми зерттеулерге арналған қысқа мерзімді шәкіртақы", "2026-12-01", "Undergraduate", "private note"],
    [camps, "c1", "[DEMO] Летняя школа по вычислительной биологии и биоинформатике", "2027-06-15", "Any", "private note"],
    [camps, "c2", "[DEMO] Verylongunbrokenwordtotestoverflowwrapping".repeat(2), "2027-07-01", "Any", "private note"],
  ] as const;
  const apps = [];
  for (const [form, key, title, deadline, level, notes] of rows) {
    apps.push(
      (
        await db
          .insert(s.applications)
          .values({ formId: form.id, externalKey: key, rowNumber: apps.length + 2, data: { id: key, Title: title, Deadline: deadline, Level: level, Notes: notes } })
          .returning()
      )[0],
    );
  }
  await db.insert(s.applicationSubmissions).values({ userId: student.id, applicationId: apps[0].id, status: "reviewed", dataSnapshot: { Title: rows[0][2], Deadline: rows[0][3], Level: rows[0][4] } }).onConflictDoNothing();

  const mkNews = async (slug: string, status: "published" | "draft", tr: Partial<Record<"en" | "kk" | "ru", { title: string; content: string }>>, daysAgo: number) => {
    await db.delete(s.news).where(eq(s.news.slug, slug));
    const [n] = await db.insert(s.news).values({ slug, status, authorId: admin.id, publishedAt: status === "published" ? new Date(Date.now() - daysAgo * 86_400_000) : null }).returning();
    for (const [locale, v] of Object.entries(tr)) await db.insert(s.newsTranslations).values({ newsId: n.id, locale: locale as "en", ...v });
  };
  await mkNews("demo-seminar-recap", "published", {
    en: { title: "[DEMO] Seminar recap: what we covered this month", content: "First paragraph of a synthetic news item.\n\nSecond paragraph, to check spacing between paragraphs." },
    kk: { title: "[DEMO] Семинар қорытындысы: осы айда не талқыладық", content: "Жасанды жаңалықтың бірінші абзацы.\n\nЕкінші абзац." },
    ru: { title: "[DEMO] Итоги семинара: что мы обсудили в этом месяце", content: "Первый абзац синтетической новости.\n\nВторой абзац." },
  }, 2);
  await mkNews("demo-only-english", "published", { en: { title: "[DEMO] A post that exists only in English", content: "Used to check the fallback to English in kk and ru." } }, 9);
  await mkNews("demo-draft", "draft", { en: { title: "[DEMO] Draft, must stay hidden", content: "Never shown publicly." } }, 0);

  await db.delete(s.archives).where(like(s.archives.fileUrl, "https://example.com/demo-%"));
  for (const [i, t] of ["[DEMO] Annual report", "[DEMO] Selection rules"].entries()) {
    const [a] = await db.insert(s.archives).values({ fileUrl: `https://example.com/demo-${i}.pdf`, fileType: "application/pdf", fileSize: 1_200_000 * (i + 1), uploadedBy: admin.id }).returning();
    await db.insert(s.archiveTranslations).values({ archiveId: a.id, locale: "en", title: t, description: i ? null : "A synthetic document used to check archive rows." });
  }
  console.log(`Demo data ready. Logins: demo-admin@example.test / demo-root@example.test (superuser) / demo-student@example.test, password ${DEMO_PASSWORD}`);
}

main_().finally(() => pool.end());
