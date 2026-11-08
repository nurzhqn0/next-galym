import { z } from "zod";
import { locales } from "@/lib/locale";
import { pagination, query, route } from "@/lib/http";
import { latestNews } from "@/lib/data";

const params = pagination.extend({ lang: z.enum(locales).default("en") });

// Cached like the news page: the feed loads its next batches from here.
export const GET = route(async (req) => {
  const { lang, limit, offset } = query(req, params);
  return latestNews(lang, limit, offset);
});
