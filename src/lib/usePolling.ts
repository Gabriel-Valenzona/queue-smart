"use client";

import { useEffect } from "react";

/**
 * Runs an async loader now and then on an interval, so the page stays in step
 * with the queue API. The loader updates state after its request resolves.
 */
export function usePolling(load: () => Promise<void>, intervalMs: number) {
  useEffect(() => {
    void load();
    const timer = setInterval(load, intervalMs);
    return () => clearInterval(timer);
  }, [load, intervalMs]);
}
