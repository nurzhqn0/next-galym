import { unstable_rethrow } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Postgres unique violation, whether or not drizzle wrapped the driver error. */
export function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23505" || err?.cause?.code === "23505";
}

/** Postgres foreign key violation (a restrict delete, for example). */
export function isForeignKeyViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23503" || err?.cause?.code === "23503";
}

/** Escapes LIKE wildcards so a search for "50%" matches the text, not everything. */
export const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, "\\$&")}%`;

export async function body<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  const json = await req.json().catch(() => {
    throw new HttpError(400, "Invalid JSON body");
  });
  return schema.parse(json);
}

export function query<S extends z.ZodType>(req: NextRequest, schema: S): z.infer<S> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams));
}

export const uuid = (v: string) => z.uuid().parse(v);

export const pagination = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/** Browsers always send Origin on cross-site writes; reject when it is not our host. */
function checkOrigin(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  // Sandboxed and file:// pages send the literal "null", which is not a URL.
  let host: string | null = null;
  try {
    host = new URL(origin).host;
  } catch {}
  if (host !== req.headers.get("host")) throw new HttpError(403, "Cross-origin request blocked");
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/**
 * Only what is needed to find the failure. Never the error itself: a failed drizzle query
 * carries its parameters in the message, which can include emails and password hashes.
 */
export function logFields(req: Request, e: unknown) {
  const err = e as { name?: string; code?: string; cause?: { code?: string } };
  return {
    method: req.method,
    path: new URL(req.url).pathname,
    error: err?.name ?? "unknown",
    code: err?.code ?? err?.cause?.code,
  };
}

/** Wraps a handler: origin check, JSON output, uniform error responses. */
export function route<C = unknown>(handler: (req: NextRequest, ctx: C) => Promise<unknown>, status = 200) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    try {
      checkOrigin(req);
      const out = await handler(req, ctx);
      return out instanceof Response ? out : NextResponse.json(out, { status });
    } catch (e) {
      // Next throws internal errors to stop a prerender or redirect; swallowing them would freeze a 500.
      unstable_rethrow(e);
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) {
        return NextResponse.json({ error: "Invalid input", issues: e.issues }, { status: 400 });
      }
      console.error("api error", logFields(req, e));
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  };
}
