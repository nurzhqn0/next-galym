import { z } from "zod";
import { pagination, query, route } from "@/lib/http";
import { listListings } from "@/lib/services/applications";

const params = pagination.extend({ formId: z.uuid().optional() });

export const GET = route(async (req) => {
  const { limit, offset, formId } = query(req, params);
  return listListings(limit, offset, formId);
});
