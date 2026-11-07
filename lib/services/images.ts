import { randomUUID } from "node:crypto";
import { BlobError, del, put } from "@vercel/blob";
import { HttpError } from "@/lib/http";
import { MAX_IMAGE_BYTES, imageType, isBlobUrl } from "@/lib/images";

/** Stores a news cover or archive photo in Vercel Blob (BLOB_READ_WRITE_TOKEN): its public URL, type and size. */
export async function uploadImage(file: File) {
  if (file.size > MAX_IMAGE_BYTES) throw new HttpError(413, "Image is larger than 4 MB");
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = imageType(bytes);
  if (!type) throw new HttpError(415, "Use a JPEG, PNG or WebP image");
  const ext = type === "image/jpeg" ? "jpg" : type.slice("image/".length);
  try {
    const { url } = await put(`images/${randomUUID()}.${ext}`, bytes, { access: "public", contentType: type });
    return { url, contentType: type, size: bytes.length };
  } catch (e) {
    // Blob errors name the cause (missing token, private store, ...) and carry no secrets: log the message.
    if (e instanceof BlobError) {
      console.error("blob upload failed", { message: e.message });
      throw new HttpError(503, "Image storage is not available");
    }
    throw e;
  }
}

/** Best effort: a failed delete only leaves an unused file in the store, so it must not fail the save. */
export async function deleteImage(url: string | null | undefined) {
  if (!url || !isBlobUrl(url)) return;
  await del(url).catch((e: unknown) => console.error("blob delete failed", { url, message: (e as Error).message }));
}
