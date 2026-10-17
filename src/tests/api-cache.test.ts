import assert from "node:assert/strict";
import { test } from "node:test";
import { createApiCache, type CacheStorage } from "../shared/api-cache";

function memoryStorage(): CacheStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

test("fresh reads come from cache and expire after their TTL", async () => {
  let time = 0;
  const calls: string[] = [];
  const cache = createApiCache(
    async (route) => {
      calls.push(route);
      return { route, n: calls.length };
    },
    { storage: memoryStorage(), now: () => time },
  );
  assert.deepEqual(await cache.get("settings", 1000), { route: "settings", n: 1 });
  time = 999;
  assert.deepEqual(await cache.get("settings", 1000), { route: "settings", n: 1 });
  time = 1000;
  assert.deepEqual(await cache.get("settings", 1000), { route: "settings", n: 2 });
  assert.equal(calls.length, 2);
});

test("concurrent reads share one request and failures are not cached", async () => {
  let calls = 0;
  let fail = true;
  const cache = createApiCache(
    async () => {
      calls++;
      if (fail) throw new Error("offline");
      return "ok";
    },
    { storage: memoryStorage() },
  );
  const results = await Promise.allSettled([
    cache.get("vehicles", 1000),
    cache.get("vehicles", 1000),
  ]);
  assert.equal(calls, 1);
  assert.ok(results.every((r) => r.status === "rejected"));
  fail = false;
  assert.equal(await cache.get("vehicles", 1000), "ok");
  assert.equal(calls, 2);
});

test("entries persist in storage across cache instances", async () => {
  const storage = memoryStorage();
  let calls = 0;
  const load = async () => ++calls;
  await createApiCache(load, { storage }).get("dealers", 60_000);
  const reloaded = createApiCache(load, { storage });
  assert.equal(reloaded.peek("dealers"), 1);
  assert.equal(await reloaded.get("dealers", 60_000), 1);
  assert.equal(calls, 1);
  storage.data.set("car-listing:api:broken", "{");
  assert.equal(await reloaded.get("broken", 60_000), 2);
});
