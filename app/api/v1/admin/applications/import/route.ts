import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { body, route } from "@/lib/http";
import { applicationImport, importApplications } from "@/lib/services/applications";

export const POST = route(async (req) => {
  const admin = await requireAdmin();
  const { items } = await body(req, applicationImport);
  const result = await importApplications(items, admin.id);
  revalidateTag("applications", { expire: 0 });
  return result;
}, 201);
