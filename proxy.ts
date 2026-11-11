import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, defaultLocale, locales } from "@/lib/locale";

function preferredLocale(req: NextRequest) {
  // The language picked with the switch wins over the browser's setting.
  const picked = locales.find((l) => l === req.cookies.get(LOCALE_COOKIE)?.value);
  if (picked) return picked;
  const header = req.headers.get("accept-language") ?? "";
  for (const part of header.split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase().slice(0, 2);
    const hit = locales.find((l) => l === tag);
    if (hit) return hit;
  }
  return defaultLocale;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;
  req.nextUrl.pathname = `/${preferredLocale(req)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(req.nextUrl);
}

// Skip the API, Next internals, and any file with an extension (logos, favicon).
export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
