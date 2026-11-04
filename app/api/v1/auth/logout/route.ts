import { clearSessionCookie, readSessionToken } from "@/lib/auth/cookie";
import { route } from "@/lib/http";
import { deleteSession } from "@/lib/services/auth";

export const POST = route(async () => {
  const token = await readSessionToken();
  if (token) await deleteSession(token);
  await clearSessionCookie();
  return { ok: true };
});
