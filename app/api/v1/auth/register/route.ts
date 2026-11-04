import { setSessionCookie } from "@/lib/auth/cookie";
import { body, clientIp, route } from "@/lib/http";
import { register, registerInput } from "@/lib/services/auth";

export const POST = route(async (req) => {
  const { user, token, expiresAt } = await register(await body(req, registerInput), clientIp(req));
  await setSessionCookie(token, expiresAt);
  return user;
}, 201);
