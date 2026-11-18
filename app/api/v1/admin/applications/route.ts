import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { body, pagination, query, route } from "@/lib/http";
import { applicationCreate, createApplication, listAdminApplications } from "@/lib/services/applications";

export const GET = route(async (req) => {
  await requireAdmin();
  const { limit, offset } = query(req, pagination);
  return listAdminApplications(limit, offset);
});

export const POST = route(async (req) => {
  const admin = await requireAdmin();
  const created = await createApplication(await body(req, applicationCreate), admin.id);
  revalidateTag("applications", { expire: 0 });
  return created;
}, 201);
