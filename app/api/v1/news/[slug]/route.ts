import { z } from "zod";
import { locales } from "@/lib/locale";
import { query, route } from "@/lib/http";
import { getPublicNews } from "@/lib/services/news";

const params = z.object({ lang: z.enum(locales).default("en") });

export const GET = route(async (req, ctx: RouteContext<"/api/v1/news/[slug]">) => {
  const { slug } = await ctx.params;
  return getPublicNews(slug, query(req, params).lang);
});
