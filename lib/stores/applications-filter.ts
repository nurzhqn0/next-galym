import { create } from "zustand";

type State = {
  /** An alpha-2 code, "none", or undefined for all listings. */
  country: string | undefined;
  select: (country: string | undefined) => void;
};

/**
 * The country selected on the applications page, kept in memory so chips and map clicks filter without a request.
 * Never persisted; the URL is kept in step by the browser component.
 */
export const useApplicationsFilter = create<State>()((set) => ({
  country: undefined,
  select: (country) => set({ country }),
}));
