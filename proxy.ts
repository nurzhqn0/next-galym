import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, locales } from "@/lib/locale";

function preferredLocale(req: NextRequest) {
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
