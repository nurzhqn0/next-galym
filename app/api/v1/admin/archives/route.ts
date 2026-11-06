import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { body, pagination, query, route } from "@/lib/http";
import { archiveCreate, createArchive, listAdminArchives } from "@/lib/services/archives";

export const GET = route(async (req) => {
  await requireAdmin();
  const { limit, offset } = query(req, pagination);
  return listAdminArchives(limit, offset);
});

export const POST = route(async (req) => {
  const admin = await requireAdmin();
  const created = await createArchive(await body(req, archiveCreate), admin.id);
  revalidateTag("archives", { expire: 0 });
  return created;
}, 201);
