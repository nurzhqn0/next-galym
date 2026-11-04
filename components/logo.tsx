// Cropped, inline copies of public/nextGalym-01.svg and -02.svg (the source art sits in a
// 1080 square with empty space). `crimson` suits the gold sheet; `gold` suits the crimson band.
// Paths are read from the files at build time so the artwork stays the single source.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const cache = new Map<string, string>();

function inner(file: string) {
  let svg = cache.get(file);
  if (!svg) {
    const raw = readFileSync(join(process.cwd(), "public", file), "utf8");
    svg = raw
      .replace(/<\?xml[^>]*\?>/, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<svg[^>]*>/, "")
      .replace(/<\/svg>\s*$/, "")
      .replace(/<defs>[\s\S]*?<\/defs>/, "");
    cache.set(file, svg);
  }
  return svg;
}

export function Logo({ tone, className, label }: { tone: "crimson" | "gold"; className?: string; label: string }) {
  const file = tone === "crimson" ? "nextGalym-01.svg" : "nextGalym-02.svg";
  return (
    <svg viewBox="0 350 1080 310" role="img" aria-label={label} className={className}>
      <style>{`.st0{fill:#a8042b}.st1{fill:#ffd576}`}</style>
      <g dangerouslySetInnerHTML={{ __html: inner(file) }} />
    </svg>
  );
}
