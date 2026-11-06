import Link from "next/link";

export const PAGE_SIZE = 50;

/** `?page=` as a positive integer; anything else is the first page. */
export const pageOf = (v: string | string[] | undefined) => Math.max(1, Math.floor(Number(v)) || 1);

export function Pager({ base, page, total, newer, older }: { base: string; page: number; total: number; newer: string; older: string }) {
  if (page === 1 && total <= PAGE_SIZE) return null;
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {page > 1 && (
        <Link href={`${base}?page=${page - 1}`} className="field label">
          {newer}
        </Link>
      )}
      {page * PAGE_SIZE < total && (
        <Link href={`${base}?page=${page + 1}`} className="field label">
          {older}
        </Link>
      )}
    </div>
  );
}
