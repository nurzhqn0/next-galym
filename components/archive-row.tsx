import Image from "next/image";
import { isBlobUrl } from "@/lib/images";

export type ArchiveItem = { id: string; fileUrl: string; imageUrl: string | null; title?: string; description?: string | null };

/** One archive entry, the whole row a link: lettered bubble, title, description, and the photo when it has one. */
export function ArchiveRow({ item, letter, openLabel }: { item: ArchiveItem; letter: string; openLabel: string }) {
  // next/image loads only from the Blob store; anything else is left out rather than breaking the page.
  const photo = item.imageUrl && isBlobUrl(item.imageUrl) ? item.imageUrl : null;
  return (
    <a
      href={item.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`choose grid grid-cols-[auto_1fr] items-center gap-5 border-[2.5px] border-ink bg-stock-lit p-5 hover:bg-stock md:p-6 ${photo ? "md:grid-cols-[auto_1fr_14rem]" : ""}`}
    >
      <span className="bubble" data-filled="false" aria-hidden="true">
        {letter}
      </span>
      <span>
        <span className="block text-xl font-bold md:text-2xl">{item.title}</span>
        {item.description && <span className="mt-1 block max-w-[56ch]">{item.description}</span>}
        <span className="label mt-2 inline-block text-ink underline">{openLabel}</span>
      </span>
      {photo && (
        <span className="relative col-span-2 block aspect-video border-[2.5px] border-ink bg-stock md:col-span-1">
          <Image src={photo} alt="" fill sizes="(min-width: 768px) 14rem, 100vw" className="object-cover" />
        </span>
      )}
    </a>
  );
}
