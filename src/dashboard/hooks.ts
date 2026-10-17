import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
type Client = <T>(
  route: string,
  body?: unknown,
  method?: string,
) => Promise<T>;
export function useResource<T>(route: string | null, client: Client = api) {
  const [data, setData] = useState<T | null>(null),
    [loading, setLoading] = useState(Boolean(route)),
    [error, setError] = useState("");
  const generation = useRef(0);
  const reload = useCallback(async () => {
    if (!route) return;
    const n = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const result = await client<T>(route);
      if (n === generation.current) setData(result);
    } catch (e) {
      if (n === generation.current)
        setError(e instanceof Error ? e.message : "Could not load data.");
    } finally {
      if (n === generation.current) setLoading(false);
    }
  }, [route, client]);
  useEffect(() => {
    if (!route) return;
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload, route]);
  return { data, loading, error, reload };
}
