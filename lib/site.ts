// Public facts taken from the program's Instagram profile (read 2026-11-04).
export const INSTAGRAM_URL = "https://www.instagram.com/nextgalym/";
export const DRIVE_URL = "https://drive.google.com/drive/folders/1J3BJJuPv-uovWnG4IUEjy-ZcWCPNYHCs?usp=sharing";

export function formatDate(value: Date | string, lang: string) {
  return new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(value),
  );
}

export function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
