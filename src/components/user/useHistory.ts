"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/queues";
import { historyApi } from "@/lib/api/history";
import type { HistoryRecord } from "@/server/history/types";

type HistoryState = {
  records: HistoryRecord[] | null;
  error: string | null;
  needsSignIn: boolean;
};

/** Mounted only for the active account; backend responses are the sole history authority. */
export function useHistory() {
  const [state, setState] = useState<HistoryState>({
    records: null,
    error: null,
    needsSignIn: false,
  });
  const [attempt, setAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let disposed = false;
    let sequence = 0;
    let controller: AbortController | undefined;
    async function load() {
      const started = ++sequence;
      controller?.abort();
      controller = new AbortController();
      try {
        const records = await historyApi.list(controller.signal);
        if (!disposed && sequence === started)
          setState({ records, error: null, needsSignIn: false });
      } catch (error) {
        if (disposed || sequence !== started) return;
        const needsSignIn = error instanceof ApiError && error.status === 401;
        setState((previous) => ({
          records: needsSignIn ? null : previous.records,
          needsSignIn,
          error:
            error instanceof ApiError
              ? error.message
              : "History could not be loaded. Please try again.",
        }));
      } finally {
        if (!disposed && sequence === started) setRetrying(false);
      }
    }
    void load();
    const interval = setInterval(() => void load(), 4000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      disposed = true;
      controller?.abort();
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [attempt]);

  function retry() {
    setRetrying(true);
    setAttempt((value) => value + 1);
  }

  return { ...state, retry, retrying };
}
