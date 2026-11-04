import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { body, route } from "@/lib/http";
import { archiveCreate, createArchive } from "@/lib/services/archives";

export const POST = route(async (req) => {
  const admin = await requireAdmin();
  const created = await createArchive(await body(req, archiveCreate), admin.id);
  revalidateTag("archives", "max");
  return created;
}, 201);
