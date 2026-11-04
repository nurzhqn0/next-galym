import { z } from "zod";
import { locales } from "@/lib/locale";
import { pagination, query, route } from "@/lib/http";
import { listPublicNews } from "@/lib/services/news";

const params = pagination.extend({ lang: z.enum(locales).default("en") });

export const GET = route(async (req) => {
  const { lang, limit, offset } = query(req, params);
  return listPublicNews(lang, limit, offset);
});
