import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { body, pagination, query, route } from "@/lib/http";
import { createNews, listAdminNews, newsCreate } from "@/lib/services/news";

export const GET = route(async (req) => {
  await requireAdmin();
  const { limit, offset } = query(req, pagination);
  return listAdminNews(limit, offset);
});

export const POST = route(async (req) => {
  const admin = await requireAdmin();
  const created = await createNews(await body(req, newsCreate), admin.id);
  revalidateTag("news", "max");
  return created;
}, 201);
