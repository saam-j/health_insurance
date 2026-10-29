import { useEffect, useState } from "react";
import { getJson } from "../services/api";

export interface ApiState<T> { data: T | null; loading: boolean; error: string | null; reload: () => void }

/** Fetches `path` with params; refetches when params change; cancels stale requests. */
export function useApi<T>(path: string, params: Record<string, string | number | undefined | null>): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify(params);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true); setError(null);
    getJson<T>(path, params, ctrl.signal)
      .then((d) => { setData(d); setLoading(false); })
      .catch((e: Error) => { if (e.name === "AbortError") return; setError(e.message); setLoading(false); });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key, nonce]);

  return { data, loading, error, reload: () => setNonce((n) => n + 1) };
}
