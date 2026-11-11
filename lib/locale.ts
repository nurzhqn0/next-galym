export const locales = ["en", "kk", "ru"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
/** The language the visitor last picked with the EN/KK/RU switch. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Pick the requested translation, fall back to the default locale. */
export function pickTranslation<T extends { locale: Locale }>(rows: T[], lang: Locale): T | undefined {
  return rows.find((r) => r.locale === lang) ?? rows.find((r) => r.locale === defaultLocale);
}
