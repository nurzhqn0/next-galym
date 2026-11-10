import Image from "next/image";
import Link from "next/link";
import { isBlobUrl } from "@/lib/images";
import { formatDate } from "@/lib/site";

export type NewsItem = { id: string; slug: string; coverImageUrl: string | null; publishedAt: Date | string | null; title?: string; locale?: string };

/**
 * One post as a photo card: the cover fills the card, the title and date sit on an ink scrim at the bottom.
 * Without a usable cover the card stays crimson. `lead` makes it the wide first card of the news list.
 */
export function NewsCard({ item: n, lang, sizes, lead = false }: { item: NewsItem; lang: string; sizes: string; lead?: boolean }) {
  const photo = n.coverImageUrl && isBlobUrl(n.coverImageUrl) ? n.coverImageUrl : null;
  return (
    <Link
      href={`/${lang}/news/${n.slug}`}
      className={`group relative block aspect-[4/5] overflow-hidden border-[2.5px] border-ink bg-ink ${lead ? "sm:aspect-[3/2] lg:aspect-[2/1]" : ""}`}
    >
      {photo && (
        <Image
          src={photo}
          alt=""
          fill
          sizes={sizes}
          className="object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]"
        />
      )}
      <span
        className={`absolute inset-x-0 bottom-0 grid gap-2 bg-gradient-to-t from-ink-deep/90 via-ink-deep/60 to-transparent p-5 pt-24 text-stock ${lead ? "lg:p-8 lg:pt-32" : ""}`}
      >
        {/* A post without this language's text falls back to another translation: mark it for screen readers. */}
        <span
          lang={n.locale && n.locale !== lang ? n.locale : undefined}
          className={`line-clamp-2 text-xl font-bold leading-snug group-hover:underline md:text-2xl ${lead ? "lg:max-w-[30ch] lg:text-4xl" : ""}`}
        >
          {n.title}
        </span>
        {n.publishedAt && (
          <time dateTime={new Date(n.publishedAt).toISOString()} className="label text-stock-lit">
            {formatDate(n.publishedAt, lang)}
          </time>
        )}
      </span>
    </Link>
  );
}
