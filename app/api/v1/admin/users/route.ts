import { requireAdmin } from "@/lib/auth/guard";
import { pagination, query, route } from "@/lib/http";
import { listUsers } from "@/lib/services/users";

export const GET = route(async (req) => {
  await requireAdmin();
  const { limit, offset } = query(req, pagination);
  return listUsers(limit, offset);
});
