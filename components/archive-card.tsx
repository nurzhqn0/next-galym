import Image from "next/image";
import { isBlobUrl } from "@/lib/images";
import { formatDate } from "@/lib/site";

export type ArchiveItem = {
  id: string;
  fileUrl: string;
  imageUrl: string | null;
  createdAt?: Date | string | null;
  locale?: string;
  title?: string;
  description?: string | null;
};

export type ArchiveLabels = { openLink: string; newTab: string; kind: { drive: string; video: string; page: string } };

/** What the link opens, read from its host. */
function kindOf(url: string): keyof ArchiveLabels["kind"] {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "drive.google.com") return "drive";
    if (["youtube.com", "m.youtube.com", "youtu.be", "vimeo.com"].includes(host)) return "video";
  } catch {}
  return "page";
}

/**
 * One archive entry as a card, the whole card a link: the photo on top (or the link type on lit stock),
 * then the title and description printed below it on the sheet, not over the picture.
 */
export function ArchiveCard({ item, lang, t }: { item: ArchiveItem; lang: string; t: ArchiveLabels }) {
  // next/image loads only from the Blob store; anything else is left out rather than breaking the page.
  const photo = item.imageUrl && isBlobUrl(item.imageUrl) ? item.imageUrl : null;
  // Set when this language has no text and another translation is shown.
  const kind = t.kind[kindOf(item.fileUrl)];
  const textLang = item.locale && item.locale !== lang ? item.locale : undefined;
  return (
    <a
      href={item.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col overflow-hidden rounded-2xl border-[2.5px] border-ink bg-stock-lit hover:bg-stock"
    >
      <span className="relative block aspect-video border-b-[2.5px] border-ink bg-stock-lit">
        {photo ? (
          <Image src={photo} alt="" fill sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw" className="object-cover" />
        ) : (
          <span aria-hidden="true" className="display absolute inset-0 grid place-items-center text-4xl text-ink">
            {kind}
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-2 p-5">
        <span lang={textLang} className="text-xl font-bold leading-snug group-hover:underline md:text-2xl">
          {item.title}
        </span>
        {item.description && (
          <span lang={textLang} className="line-clamp-3">
            {item.description}
          </span>
        )}
        <span className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-ink">
          <span className="label">{kind}</span>
          {item.createdAt && (
            <time dateTime={new Date(item.createdAt).toISOString()} className="label">
              {formatDate(item.createdAt, lang)}
            </time>
          )}
          <span className="label ml-auto underline">
            {t.openLink} <span aria-hidden="true">↗</span>
            <span className="sr-only"> ({t.newTab})</span>
          </span>
        </span>
      </span>
    </a>
  );
}
