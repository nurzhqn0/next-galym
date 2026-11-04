import { cacheLife, cacheTag } from "next/cache";
import type { Locale } from "@/lib/locale";
import { listArchives } from "@/lib/services/archives";
import { listListings } from "@/lib/services/applications";
import { listPublicNews } from "@/lib/services/news";

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
