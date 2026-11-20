import { test } from "node:test";
import assert from "node:assert/strict";
import languagesCollection from "../extensions/backend/data-collections/languages";
import {
  getLanguageSettings,
  setLanguageSettings,
  type LanguageDependencies,
} from "../backend/services/language-service";
import type { Context } from "../backend/context";
import { createApiCache } from "../shared/api-cache";

const managerCtx: Context = { siteId: "site-1", actorId: "admin-1", manager: true };
const visitorCtx: Context = { siteId: "site-1", actorId: "visitor-1", manager: false };

test("languages data collection is configured correctly", () => {
  assert.equal(languagesCollection.idSuffix, "languages");
  assert.equal(languagesCollection.displayName, "Language Settings");
  assert.equal(languagesCollection.displayField, "language");
  const fieldKeys = languagesCollection.fields.map((f) => f.key);
  assert.ok(fieldKeys.includes("language"));
  assert.ok(fieldKeys.includes("code"));
  assert.equal(languagesCollection.dataPermissions.itemRead, "ANYONE");
});

test("reads default language when collection is empty", async () => {
  const store = new Map<string, any>();
  const deps: LanguageDependencies = {
    getRow: async (_ctx, coll, id) => store.get(`${coll}/${id}`) ?? null,
    saveRow: async (_ctx, coll, row) => {
      store.set(`${coll}/${row._id}`, row);
      return row;
    },
    audit: async () => {},
  };

  const result = await getLanguageSettings(visitorCtx, deps);
  assert.deepEqual(result, { language: "en", code: "en" });
});

test("reads language saved in languages collection", async () => {
  const store = new Map<string, any>();
  store.set("languages/global", { _id: "global", language: "fr", code: "fr" });

  const deps: LanguageDependencies = {
    getRow: async (_ctx, coll, id) => store.get(`${coll}/${id}`) ?? null,
    saveRow: async (_ctx, coll, row) => {
      store.set(`${coll}/${row._id}`, row);
      return row;
    },
    audit: async () => {},
  };

  const result = await getLanguageSettings(visitorCtx, deps);
  assert.deepEqual(result, { language: "fr", code: "fr" });
});

test("falls back to settings collection if languages collection has no record", async () => {
  const store = new Map<string, any>();
  store.set("settings/global", { _id: "global", theme: { language: "es" } });

  const deps: LanguageDependencies = {
    getRow: async (_ctx, coll, id) => store.get(`${coll}/${id}`) ?? null,
    saveRow: async (_ctx, coll, row) => {
      store.set(`${coll}/${row._id}`, row);
      return row;
    },
    audit: async () => {},
  };

  const result = await getLanguageSettings(visitorCtx, deps);
  assert.deepEqual(result, { language: "es", code: "es" });
});

test("manager can save language to collection and syncs settings", async () => {
  const store = new Map<string, any>();
  store.set("settings/global", { _id: "global", theme: { language: "en", accent: "#000000" } });
  const audits: string[] = [];

  const deps: LanguageDependencies = {
    getRow: async (_ctx, coll, id) => store.get(`${coll}/${id}`) ?? null,
    saveRow: async (_ctx, coll, row) => {
      store.set(`${coll}/${row._id}`, row);
      return row;
    },
    audit: async (_ctx, coll, id, action) => {
      audits.push(`${coll}/${id}:${action}`);
    },
  };

  const result = await setLanguageSettings(managerCtx, { code: "de" }, deps);
  assert.deepEqual(result, { language: "de", code: "de" });

  // Stored in languages collection
  const storedLang = store.get("languages/global");
  assert.deepEqual(storedLang, { _id: "global", language: "de", code: "de" });

  // Synced to settings collection
  const storedSettings = store.get("settings/global");
  assert.equal(storedSettings.theme.language, "de");
  assert.equal(storedSettings.theme.accent, "#000000");

  assert.ok(audits.includes("languages/global:update"));
});

test("setLanguageSettings rejects non-manager callers", async () => {
  const deps: LanguageDependencies = {
    getRow: async () => null,
    saveRow: async (_ctx, _coll, row) => row,
    audit: async () => {},
  };

  await assert.rejects(
    async () => setLanguageSettings(visitorCtx, { code: "es" }, deps),
    { status: 403, code: "FORBIDDEN" },
  );
});

test("setLanguageSettings rejects invalid language codes", async () => {
  const deps: LanguageDependencies = {
    getRow: async () => null,
    saveRow: async (_ctx, _coll, row) => row,
    audit: async () => {},
  };

  await assert.rejects(
    async () => setLanguageSettings(managerCtx, { code: "invalid-code" }, deps),
    { status: 400, code: "VALIDATION_ERROR" },
  );
});

test("API cache caches responses and allows invalidation so we do not call always", async () => {
  let apiCalls = 0;
  const mockFetcher = async (_route: string) => {
    apiCalls++;
    return { language: "en", code: "en" };
  };

  const cache = createApiCache(mockFetcher);

  // First call invokes fetcher
  const res1 = await cache.get("languages", 60_000);
  assert.deepEqual(res1, { language: "en", code: "en" });
  assert.equal(apiCalls, 1);

  // Subsequent call hits cache, no API call
  const res2 = await cache.get("languages", 60_000);
  assert.deepEqual(res2, { language: "en", code: "en" });
  assert.equal(apiCalls, 1);

  // Concurrent calls share the in-flight promise
  const [resA, resB] = await Promise.all([
    cache.get("languages", 60_000),
    cache.get("languages", 60_000),
  ]);
  assert.deepEqual(resA, { language: "en", code: "en" });
  assert.deepEqual(resB, { language: "en", code: "en" });
  assert.equal(apiCalls, 1);

  // Invalidate cache
  cache.forget("languages");

  // Call after invalidation fetches again
  const res3 = await cache.get("languages", 60_000);
  assert.deepEqual(res3, { language: "en", code: "en" });
  assert.equal(apiCalls, 2);
});
