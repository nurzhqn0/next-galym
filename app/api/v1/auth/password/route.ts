import { requireUser } from "@/lib/auth/guard";
import { readSessionToken } from "@/lib/auth/cookie";
import { body, route } from "@/lib/http";
import { changePassword, passwordChangeInput } from "@/lib/services/auth";

export const POST = route(async (req) => {
  const user = await requireUser();
  const token = (await readSessionToken()) as string; // requireUser passed, so the cookie exists
  await changePassword(user.id, await body(req, passwordChangeInput), token);
  return { ok: true };
});
