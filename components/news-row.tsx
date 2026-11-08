import Image from "next/image";
import Link from "next/link";
import { isBlobUrl } from "@/lib/images";
import { formatDate } from "@/lib/site";

export type NewsItem = { id: string; slug: string; coverImageUrl: string | null; publishedAt: Date | string | null; title?: string };

/** One post on the news page: the photo above the date on the left, the title on the right. */
export function NewsRow({ item: n, lang, className = "", style }: { item: NewsItem; lang: string; className?: string; style?: React.CSSProperties }) {
  return (
    <li style={style} className={`grid gap-1 border-t-[2.5px] border-ink py-5 md:grid-cols-[14rem_1fr] md:gap-8 ${className}`}>
      {/* Left column: the photo, with the date under it. */}
      <div className="grid content-start gap-3">
        {n.coverImageUrl && isBlobUrl(n.coverImageUrl) && (
          <Link href={`/${lang}/news/${n.slug}`} tabIndex={-1} aria-hidden="true" className="relative block aspect-[4/3] w-40 border-[2.5px] border-ink bg-stock-lit">
            <Image src={n.coverImageUrl} alt="" fill sizes="10rem" className="object-cover" />
          </Link>
        )}
        <time dateTime={new Date(n.publishedAt ?? 0).toISOString()} className="label text-ink">
          {n.publishedAt ? formatDate(n.publishedAt, lang) : ""}
        </time>
      </div>
      <Link href={`/${lang}/news/${n.slug}`} className="inline-block py-2 text-xl font-bold leading-snug hover:underline md:text-2xl">
        {n.title}
      </Link>
    </li>
  );
}
