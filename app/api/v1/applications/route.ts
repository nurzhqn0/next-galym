import { z } from "zod";
import { pagination, query, route } from "@/lib/http";
import { isCountryCode } from "@/lib/countries";
import { listListings } from "@/lib/services/applications";

const filter = pagination.extend({
  country: z
    .string()
    .transform((c) => c.toUpperCase())
    .refine((c) => c === "NONE" || isCountryCode(c))
    .transform((c) => (c === "NONE" ? "none" : c))
    .optional(),
});

export const GET = route(async (req) => {
  const { limit, offset, country } = query(req, filter);
  return listListings(limit, offset, country);
});
