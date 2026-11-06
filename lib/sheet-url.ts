/** Accepts a bare Google Sheet id or any docs.google.com/spreadsheets/d/<id>/... URL; returns the id or null. */
export function parseSheetId(input: string): string | null {
  const value = input.trim();
  const fromUrl = value.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})(?:[/?#]|$)/);
  if (fromUrl) return fromUrl[1];
  return /^[A-Za-z0-9_-]{20,}$/.test(value) ? value : null;
}
