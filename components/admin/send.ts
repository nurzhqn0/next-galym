import type { Dict } from "@/app/[lang]/dictionaries/en";

/** JSON request to an admin route. `fields` holds the invalid inputs as dotted paths, e.g. "translations.en.title". */
export async function send(method: "POST" | "PATCH" | "DELETE", url: string, body?: unknown) {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.ok) return { ok: true, status: res.status, fields: [] as string[] };
    const data = await res.json().catch(() => ({}));
    const fields: string[] = (data.issues ?? []).map((i: { path: (string | number)[] }) => i.path.join("."));
    return { ok: false, status: res.status, fields };
  } catch {
    return { ok: false, status: 0, fields: [] as string[] };
  }
}

export function errorText(status: number, e: Dict["admin"]["errors"]) {
  if (status === 400) return e.input;
  if (status === 401) return e.signedOut;
  if (status === 403) return e.forbidden;
  // The only conflict these forms can hit is a news slug already in use.
  if (status === 409) return e.slugTaken;
  return e.generic;
}

export const alertClass = "border-[2.5px] border-dashed border-ink bg-[#ffd0c8] p-3 font-medium";
