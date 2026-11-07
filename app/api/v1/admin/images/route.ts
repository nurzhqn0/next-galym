import { requireAdmin } from "@/lib/auth/guard";
import { HttpError, route } from "@/lib/http";
import { uploadImage } from "@/lib/services/images";

export const POST = route(async (req) => {
  await requireAdmin();
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, 'Send the image as multipart field "file"');
  return uploadImage(file);
}, 201);
