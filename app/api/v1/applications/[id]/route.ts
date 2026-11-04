import { route, uuid } from "@/lib/http";
import { getListing } from "@/lib/services/applications";

export const GET = route(async (_req, ctx: RouteContext<"/api/v1/applications/[id]">) =>
  getListing(uuid((await ctx.params).id)),
);
