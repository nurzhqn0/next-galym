import { timingSafeEqual } from "node:crypto";
import { HttpError, route } from "@/lib/http";
import { purgeExpired } from "@/lib/services/auth";

export const GET = route(async (req) => {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const ok = !!secret && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) throw new HttpError(401, "Unauthorized");
  return { purged: await purgeExpired() };
});
