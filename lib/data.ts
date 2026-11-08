import { cacheLife, cacheTag } from "next/cache";
import { HttpError } from "@/lib/http";
import type { Locale } from "@/lib/locale";
import { getAdminArchive, listAdminArchives, listArchives } from "@/lib/services/archives";
import { listListings } from "@/lib/services/applications";
import { getAdminNews, listAdminNews, listPublicNews } from "@/lib/services/news";

// Cached reads for pages. Admin mutations call revalidateTag with the same tags.

export async function openApplications(limit: number, offset = 0) {
  "use cache";
  cacheTag("applications");
  cacheLife("minutes");
  return listListings(limit, offset);
}

export async function latestNews(lang: Locale, limit: number, offset = 0) {
  "use cache";
  cacheTag("news");
  cacheLife("minutes");
  return listPublicNews(lang, limit, offset);
}

export async function latestArchives(lang: Locale, limit: number, offset = 0) {
  "use cache";
  cacheTag("archives");
  cacheLife("minutes");
  return listArchives(lang, limit, offset);
}

// Admin reads share the public tags, so a save clears them as well. The news and archive routes
// expire their tag at once ({ expire: 0 }), so the next load, the admin's own included, shows the change.
// These reads include drafts: call them only after adminPage() has checked the role, never from a public page.

const nullIf404 = (e: unknown) => {
  if (e instanceof HttpError && e.status === 404) return null;
  throw e;
};

export async function adminNewsList(limit: number, offset: number) {
  "use cache";
  cacheTag("news");
  cacheLife("minutes");
  return listAdminNews(limit, offset);
}

export async function adminNewsPost(id: string) {
  "use cache";
  cacheTag("news");
  cacheLife("minutes");
  return getAdminNews(id).catch(nullIf404);
}

export async function adminArchiveList(limit: number, offset: number) {
  "use cache";
  cacheTag("archives");
  cacheLife("minutes");
  return listAdminArchives(limit, offset);
}

export async function adminArchive(id: string) {
  "use cache";
  cacheTag("archives");
  cacheLife("minutes");
  return getAdminArchive(id).catch(nullIf404);
}
