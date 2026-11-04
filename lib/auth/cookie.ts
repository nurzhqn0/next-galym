import "server-only";
import { cookies } from "next/headers";

const NAME = "session";

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(NAME);
}

export async function readSessionToken() {
  return (await cookies()).get(NAME)?.value;
}
