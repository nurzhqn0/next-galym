// Shared by the upload route, the news form and tests: no server-only imports here.

/** Vercel functions reject request bodies over 4.5 MB, so uploads stop below that. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

/** The type read from the file's first bytes. The name and the browser's claimed type are not trusted. */
export function imageType(bytes: Uint8Array): ImageType | null {
  const at = (offset: number, ...expected: number[]) => expected.every((b, i) => bytes[offset + i] === b);
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp"; // RIFF....WEBP
  return null;
}

/** Files in Vercel Blob are the only ones the app stored, so the only ones it may delete. */
export function isBlobUrl(url: string) {
  try {
    return new URL(url).hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Images pages may show. In dev, the picsum.photos placeholders from `npm run db:photos` show too. */
export function isShownImageUrl(url: string) {
  if (isBlobUrl(url)) return true;
  if (process.env.NODE_ENV !== "development") return false;
  try {
    return new URL(url).hostname === "picsum.photos";
  } catch {
    return false;
  }
}
