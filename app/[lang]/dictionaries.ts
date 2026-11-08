import "server-only";
import { cache } from "react";
import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/lib/locale";
import type { Dict } from "./dictionaries/en";

const dictionaries: Record<Locale, () => Promise<Dict>> = {
  en: () => import("./dictionaries/en").then((m) => m.default),
  kk: () => import("./dictionaries/kk").then((m) => m.default),
  ru: () => import("./dictionaries/ru").then((m) => m.default),
};

export const hasLocale = (v: string): v is Locale =>
  (locales as readonly string[]).includes(v);

export async function getLocale(): Promise<Locale> {
  const l = await lang();
  if (!l || !hasLocale(l)) notFound();
  return l;
}

export const getDictionary = cache(async () =>
  dictionaries[await getLocale()](),
);
