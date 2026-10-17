/**
 * Short-lived cache for public storefront reads, so widgets and components that remount,
 * refocus or appear on several pages reuse a recent answer instead of calling the API again.
 * Entries live in memory and, when available, in sessionStorage so they survive page loads.
 */
type Entry = { value: unknown; expires: number };

export type CacheStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const prefix = "car-listing:api:";

function browserStorage(): CacheStorage | undefined {
  try {
    return typeof sessionStorage === "undefined" ? undefined : sessionStorage;
  } catch {
    // Blocked site data or a sandboxed frame.
    return undefined;
  }
}

export function createApiCache(
  load: (route: string) => Promise<unknown>,
  {
    storage = browserStorage(),
    now = () => Date.now(),
  }: { storage?: CacheStorage; now?: () => number } = {},
) {
  const memory = new Map<string, Entry>();
  const pending = new Map<string, Promise<unknown>>();

  function read(route: string): Entry | undefined {
    const entry = memory.get(route);
    if (entry) return entry;
    try {
      const raw = storage?.getItem(prefix + route);
      if (!raw) return undefined;
      const stored = JSON.parse(raw) as Entry;
      if (typeof stored?.expires !== "number") return undefined;
      memory.set(route, stored);
      return stored;
    } catch {
      return undefined;
    }
  }

  function write(route: string, entry: Entry) {
    memory.set(route, entry);
    try {
      storage?.setItem(prefix + route, JSON.stringify(entry));
    } catch {
      // Storage full or unavailable; the in-memory copy still serves this page.
    }
  }

  function forget(route: string) {
    memory.delete(route);
    try {
      storage?.removeItem(prefix + route);
    } catch {
      // Ignore unavailable storage.
    }
  }

  return {
    /** Resolves from cache while fresh; concurrent callers for one route share a single request. */
    get<T>(route: string, ttlMs: number): Promise<T> {
      const entry = read(route);
      if (entry && entry.expires > now()) return Promise.resolve(entry.value as T);
      if (entry) forget(route);
      const inFlight = pending.get(route);
      if (inFlight) return inFlight as Promise<T>;
      const request = load(route)
        .then((value) => {
          write(route, { value, expires: now() + ttlMs });
          return value;
        })
        .finally(() => pending.delete(route));
      pending.set(route, request);
      return request as Promise<T>;
    },
    /** The fresh cached value, if any, for rendering without a loading state. */
    peek<T>(route: string): T | undefined {
      const entry = read(route);
      return entry && entry.expires > now() ? (entry.value as T) : undefined;
    },
    clear() {
      for (const route of memory.keys()) forget(route);
      memory.clear();
    },
  };
}
