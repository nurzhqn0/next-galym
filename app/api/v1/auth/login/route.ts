import { setSessionCookie } from "@/lib/auth/cookie";
import { body, clientIp, route } from "@/lib/http";
import { login, loginInput } from "@/lib/services/auth";

export const POST = route(async (req) => {
  const { user, token, expiresAt } = await login(await body(req, loginInput), clientIp(req));
  await setSessionCookie(token, expiresAt);
  return user;
});
