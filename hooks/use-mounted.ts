"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * False during SSR, true once running on the client. The store hydrates from
 * localStorage synchronously in the browser but is empty on the server, so
 * data-driven UI waits for this to flip — avoiding a hydration mismatch
 * without a setState-in-effect.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
