import { pagination, query, route } from "@/lib/http";
import { listListings } from "@/lib/services/applications";

export const GET = route(async (req) => {
  const { limit, offset } = query(req, pagination);
  return listListings(limit, offset);
});
