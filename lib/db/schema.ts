import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { AppField, Snapshot } from "@/lib/application-fields";

export const userRole = pgEnum("user_role", ["superuser", "admin", "user"]);
export const newsStatus = pgEnum("news_status", ["draft", "published", "archived"]);
export const submissionStatus = pgEnum("submission_status", [
  "pending",
  "reviewed",
  "accepted",
  "rejected",
]);
export const locale = pgEnum("locale", ["en", "kk", "ru"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    role: userRole("role").notNull().default("user"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_uq").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // SHA-256 hash of the cookie value; the raw token is never stored.
    token: varchar("token", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

export const authAttempts = pgTable("auth_attempts", {
  key: varchar("key", { length: 400 }).primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
  count: integer("count").notNull().default(0),
});

export const news = pgTable(
  "news",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 200 }).notNull().unique(),
    coverImageUrl: text("cover_image_url"),
    status: newsStatus("status").notNull().default("draft"),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("news_status_published_idx").on(t.status, t.publishedAt)],
);

export const newsTranslations = pgTable(
  "news_translations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    newsId: uuid("news_id")
      .notNull()
      .references(() => news.id, { onDelete: "cascade" }),
    locale: locale("locale").notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    content: text("content").notNull(),
  },
  (t) => [uniqueIndex("news_translations_uq").on(t.newsId, t.locale)],
);

export const archives = pgTable("archives", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileUrl: text("file_url").notNull(),
  // The optional photo shown with the link (Vercel Blob), and its type and size from the upload.
  imageUrl: text("image_url"),
  fileType: varchar("file_type", { length: 120 }),
  fileSize: integer("file_size"),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  ...timestamps,
});

export const archiveTranslations = pgTable(
  "archive_translations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    archiveId: uuid("archive_id")
      .notNull()
      .references(() => archives.id, { onDelete: "cascade" }),
    locale: locale("locale").notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),
  },
  (t) => [uniqueIndex("archive_translations_uq").on(t.archiveId, t.locale)],
);

export const applicationStatus = pgEnum("application_status", ["open", "closed"]);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 300 }).notNull(),
    // Free text group label shown under the title.
    category: varchar("category", { length: 200 }),
    // An external apply link: the student opens it, then marks "I applied" themselves.
    applyUrl: text("apply_url"),
    // yyyy-mm-dd. A listing past its deadline (Asia/Almaty) is no longer shown.
    deadline: date("deadline", { mode: "string" }),
    status: applicationStatus("status").notNull().default("open"),
    // Ordered custom fields; only those marked public ever leave the server.
    fields: jsonb("fields").$type<AppField[]>().notNull().default([]),
    // ISO 3166-1 alpha-2 codes the listing applies to; empty means online or any country.
    countries: varchar("countries", { length: 2 }).array().notNull().default(sql`'{}'::varchar[]`),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("applications_status_deadline_idx").on(t.status, t.deadline),
    index("applications_countries_idx").using("gin", t.countries),
  ],
);

export const applicationSubmissions = pgTable(
  "application_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Restrict: a listing with submissions is soft-removed, never hard-deleted.
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "restrict" }),
    status: submissionStatus("status").notNull().default("pending"),
    // true: the student applied on an external site and marked it themselves, so it is never confirmed.
    external: boolean("external").notNull().default(false),
    dataSnapshot: jsonb("data_snapshot").$type<Snapshot>().notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("submissions_user_application_uq").on(t.userId, t.applicationId),
    index("submissions_status_idx").on(t.status),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  news: many(news),
  archives: many(archives),
  applications: many(applications),
  submissions: many(applicationSubmissions),
}));
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
export const newsRelations = relations(news, ({ one, many }) => ({
  author: one(users, { fields: [news.authorId], references: [users.id] }),
  translations: many(newsTranslations),
}));
export const newsTranslationsRelations = relations(newsTranslations, ({ one }) => ({
  news: one(news, { fields: [newsTranslations.newsId], references: [news.id] }),
}));
export const archivesRelations = relations(archives, ({ one, many }) => ({
  uploader: one(users, { fields: [archives.uploadedBy], references: [users.id] }),
  translations: many(archiveTranslations),
}));
export const archiveTranslationsRelations = relations(archiveTranslations, ({ one }) => ({
  archive: one(archives, { fields: [archiveTranslations.archiveId], references: [archives.id] }),
}));
export const applicationsRelations = relations(applications, ({ one, many }) => ({
  creator: one(users, { fields: [applications.createdBy], references: [users.id] }),
  submissions: many(applicationSubmissions),
}));
export const submissionsRelations = relations(applicationSubmissions, ({ one }) => ({
  user: one(users, { fields: [applicationSubmissions.userId], references: [users.id] }),
  application: one(applications, {
    fields: [applicationSubmissions.applicationId],
    references: [applications.id],
  }),
}));
