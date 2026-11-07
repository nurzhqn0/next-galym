import { create } from "zustand";
import type { listMySubmissions } from "@/lib/services/applications";
import type { SessionUser } from "@/lib/services/auth";

// Dates arrive as JSON strings.
export type Answer = Omit<Awaited<ReturnType<typeof listMySubmissions>>[number], "createdAt"> & { createdAt: string };

type State = {
  user: SessionUser | null;
  /** null until the first load in this tab. */
  answers: Answer[] | null;
  failed: boolean;
  load: () => Promise<"ok" | "signed-out" | "error">;
  clear: () => void;
};

const empty = { user: null, answers: null, failed: false };

// Bumped by clear(), so a load that started before a logout cannot write the old account back.
let generation = 0;

/**
 * "My answers" kept in this tab's memory: a revisit shows them at once while load() re-checks the server.
 * Never persisted. Call clear() whenever the signed-in account or its answers change.
 */
export const useMyAnswers = create<State>()((set) => ({
  ...empty,
  load: async () => {
    const started = generation;
    try {
      const [me, subs] = await Promise.all([fetch("/api/v1/auth/me"), fetch("/api/v1/me/submissions")]);
      if (started !== generation) return "ok";
      if (me.status === 401 || subs.status === 401) {
        set(empty);
        return "signed-out";
      }
      if (!me.ok || !subs.ok) throw new Error(`HTTP ${me.status}/${subs.status}`);
      const [user, answers] = await Promise.all([me.json(), subs.json()]);
      if (started === generation) set({ user, answers, failed: false });
      return "ok";
    } catch {
      if (started === generation) set({ failed: true });
      return "error";
    }
  },
  clear: () => {
    generation++;
    set(empty);
  },
}));
