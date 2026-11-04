import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { body, route } from "@/lib/http";
import { createForm, formCreate, listForms } from "@/lib/services/applications";

export const GET = route(async () => {
  await requireAdmin();
  return listForms();
});

export const POST = route(async (req) => {
  const admin = await requireAdmin();
  const created = await createForm(await body(req, formCreate), admin.id);
  revalidateTag("applications", "max");
  return created;
}, 201);
