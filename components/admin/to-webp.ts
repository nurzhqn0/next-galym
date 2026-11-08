// Shrinks a chosen photo in the browser before upload, so the store keeps a small file and big phone
// photos fit under Vercel's 4.5 MB request limit.

const MAX_WIDTH = 1600;
const QUALITY = 0.8;

/** At most 1600px wide, as WebP. Safari cannot encode WebP and hands back a PNG instead: then a JPEG. */
export async function toWebp(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file); // applies the photo's EXIF rotation
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const encode = (type: string) => new Promise<Blob | null>((done) => canvas.toBlob(done, type, QUALITY));
  let blob = await encode("image/webp");
  if (blob?.type !== "image/webp") blob = await encode("image/jpeg");
  if (!blob) throw new Error("Could not encode the image");
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `image.${ext}`, { type: blob.type });
}
