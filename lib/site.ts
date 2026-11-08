// Public facts taken from the program's Instagram profile (read 2026-11-04).
export const INSTAGRAM_URL = "https://www.instagram.com/nextgalym/";
// The seminar recordings Drive folder from the bio is an archive entry in the database (drizzle/0003_archive_photos.sql).

export function formatDate(value: Date | string, lang: string) {
  return new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(value),
  );
}
