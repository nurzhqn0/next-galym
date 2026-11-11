import { create } from "zustand";
import type { listUsers } from "@/lib/services/users";

// Dates arrive as JSON strings.
export type Account = Omit<Awaited<ReturnType<typeof listUsers>>["items"][number], "createdAt"> & { createdAt: string };

type State = {
  /** null until the first load in this tab. */
  admins: Account[] | null;
  /** Regular users matching the last search; null when nothing was searched. */
  found: Account[] | null;
  /** The search `found` belongs to. */
  foundQ: string;
  failed: boolean;
  /** Fills an empty store from the server render, so the first paint needs no request. Never overwrites loaded data. */
  seed: (admins: Account[], found: Account[] | null, q: string) => void;
  load: (q: string) => Promise<"ok" | "signed-out" | "error">;
  /** Applies a role change the server accepted, so the lists need no refetch. */
  applyRole: (user: Account, role: "admin" | "user") => void;
  clear: () => void;
};

const empty = { admins: null, found: null, foundQ: "", failed: false };

// Bumped by clear() and by each load(), so a stale response cannot overwrite newer state.
let generation = 0;

/**
 * Admin accounts kept in this tab's memory: a revisit shows them at once while load() re-checks the server.
 * Never persisted. Call clear() on logout.
 */
export const useAdmins = create<State>()((set) => ({
  ...empty,
  seed: (admins, found, q) => set((s) => (s.admins ? s : { admins, found, foundQ: q })),
  load: async (q) => {
    const started = ++generation;
    try {
      const [a, f] = await Promise.all([
        fetch("/api/v1/admin/users?role=admin&limit=100"),
        q ? fetch(`/api/v1/admin/users?role=user&limit=20&q=${encodeURIComponent(q)}`) : null,
      ]);
      if (started !== generation) return "ok";
      if (a.status === 401 || f?.status === 401) {
        set(empty);
        return "signed-out";
      }
      if (!a.ok || (f && !f.ok)) throw new Error(`HTTP ${a.status}/${f?.status}`);
      const [admins, found] = await Promise.all([a.json(), f ? f.json() : null]);
      if (started === generation) set({ admins: admins.items, found: found ? found.items : null, foundQ: q, failed: false });
      return "ok";
    } catch {
      if (started === generation) set({ failed: true });
      return "error";
    }
  },
  applyRole: (user, role) =>
    set((s) => ({
      admins: role === "admin" ? [...(s.admins ?? []).filter((u) => u.id !== user.id), { ...user, role }] : (s.admins ?? []).filter((u) => u.id !== user.id),
      found: role === "admin" ? (s.found ?? []).filter((u) => u.id !== user.id) : s.found,
    })),
  clear: () => {
    generation++;
    set(empty);
  },
}));
