"use client";
import { useEffect, useState } from "react";

type PollState<T> =
  | { status: "polling"; data: T | null }
  | { status: "done"; data: T }
  | { status: "timeout"; data: T | null }
  | { status: "error"; data: null };

/**
 * Calls `fetcher` every `intervalMs` until `isDone(result)` or `maxMs` has passed. A failing first call ends in
 * "error" (e.g. an invalid link); later failures are retried silently.
 */
export function usePollStatus<T>(
  fetcher: (() => Promise<T>) | null,
  isDone: (data: T) => boolean,
  { intervalMs, maxMs }: { intervalMs: number; maxMs: number },
): PollState<T> {
  const [state, setState] = useState<PollState<T>>({ status: "polling", data: null });

  useEffect(() => {
    if (!fetcher) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();
    let succeededOnce = false;

    const tick = async () => {
      try {
        const data = await fetcher();
        if (cancelled) return;
        succeededOnce = true;
        if (isDone(data)) return setState({ status: "done", data });
        if (Date.now() - startedAt >= maxMs) return setState({ status: "timeout", data });
        setState({ status: "polling", data });
      } catch {
        if (cancelled) return;
        if (!succeededOnce) return setState({ status: "error", data: null });
        if (Date.now() - startedAt >= maxMs) return setState((s) => ({ status: "timeout", data: s.data }));
      }
      timer = setTimeout(tick, intervalMs);
    };
    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // The fetcher identity decides when polling restarts; isDone is read fresh on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, intervalMs, maxMs]);

  return fetcher ? state : { status: "error", data: null };
}
