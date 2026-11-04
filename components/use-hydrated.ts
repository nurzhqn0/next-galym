import { useSyncExternalStore } from "react";

/** False on the server and until React has attached handlers, true afterwards. */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
