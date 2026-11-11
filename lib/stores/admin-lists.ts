import { create } from "zustand";
import type { listAdminArchives } from "@/lib/services/archives";
import type { listAdminNews } from "@/lib/services/news";

export const PAGE_SIZE = 50;

export type Kind = "news" | "archives";
// Dates arrive as JSON strings from the API; formatDate takes both.
export type AdminList<K extends Kind = Kind> = Awaited<ReturnType<K extends "news" ? typeof listAdminNews : typeof listAdminArchives>>;

type State = {
  /** One list per kind and page, e.g. "news:1". */
  lists: Record<string, AdminList>;
  /** Fills a missing list from the server render. Never overwrites a loaded one. */
  seed: (kind: Kind, page: number, list: AdminList) => void;
  load: (kind: Kind, page: number) => Promise<"ok" | "signed-out" | "error">;
  /** Call after a save or delete: the next visit shows the fresh server render. */
  clear: () => void;
};

const key = (kind: Kind, page: number) => `${kind}:${page}`;

// Bumped by clear() and each load(), so a stale response cannot overwrite newer state.
let generation = 0;

/**
 * The admin news and archives lists kept in this tab's memory: a revisit shows them at once
 * while load() re-checks the server. Never persisted.
 */
export const useAdminLists = create<State>()((set) => ({
  lists: {},
  seed: (kind, page, list) => set((s) => (s.lists[key(kind, page)] ? s : { lists: { ...s.lists, [key(kind, page)]: list } })),
  load: async (kind, page) => {
    const started = ++generation;
    try {
      const res = await fetch(`/api/v1/admin/${kind}?limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}`);
      if (started !== generation) return "ok";
      if (res.status === 401) return "signed-out";
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = await res.json();
      if (started === generation) set((s) => ({ lists: { ...s.lists, [key(kind, page)]: list } }));
      return "ok";
    } catch {
      return "error";
    }
  },
  clear: () => {
    generation++;
    set({ lists: {} });
  },
}));

export const listKey = key;
