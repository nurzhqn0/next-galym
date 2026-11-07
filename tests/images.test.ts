import { describe, expect, it } from "vitest";
import { imageType, isBlobUrl } from "@/lib/images";
import { archiveCreate, archiveUpdate } from "@/lib/services/archives";

const bytes = (...b: number[]) => new Uint8Array(b);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe("imageType", () => {
  it("reads JPEG, PNG and WebP from their first bytes", () => {
    expect(imageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(imageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe("image/png");
    expect(imageType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBPVP8 ")))).toBe("image/webp");
  });

  it("rejects anything else, whatever the file is called", () => {
    expect(imageType(bytes(...ascii("<html><script>")))).toBeNull();
    expect(imageType(bytes(...ascii("GIF89a")))).toBeNull();
    expect(imageType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WAVE")))).toBeNull();
    expect(imageType(bytes())).toBeNull();
  });
});

describe("isBlobUrl", () => {
  it("accepts only files in a Vercel Blob store", () => {
    expect(isBlobUrl("https://abc123.public.blob.vercel-storage.com/news/x.jpg")).toBe(true);
    expect(isBlobUrl("https://example.com/news/x.jpg")).toBe(false);
    expect(isBlobUrl("https://public.blob.vercel-storage.com.evil.test/x.jpg")).toBe(false);
    expect(isBlobUrl("not a url")).toBe(false);
  });
});

describe("archive photo input", () => {
  const blob = "https://abc123.public.blob.vercel-storage.com/images/x.jpg";
  const base = { fileUrl: "https://example.com/doc", translations: { en: { title: "T" } } };

  it("is optional, and a photo comes with the type and size of its upload", () => {
    expect(archiveCreate.safeParse(base).success).toBe(true);
    expect(archiveCreate.safeParse({ ...base, imageUrl: blob, fileType: "image/jpeg", fileSize: 1000 }).success).toBe(true);
    expect(archiveCreate.safeParse({ ...base, imageUrl: blob }).success).toBe(false);
    expect(archiveUpdate.safeParse({ imageUrl: null }).success).toBe(true);
  });

  it("accepts only uploaded images", () => {
    expect(archiveCreate.safeParse({ ...base, imageUrl: "https://example.com/x.jpg", fileType: "image/jpeg", fileSize: 1000 }).success).toBe(false);
    expect(archiveCreate.safeParse({ ...base, imageUrl: blob, fileType: "application/pdf", fileSize: 1000 }).success).toBe(false);
    expect(archiveCreate.safeParse({ ...base, imageUrl: blob, fileType: "image/png", fileSize: 5 * 1024 * 1024 }).success).toBe(false);
  });
});
