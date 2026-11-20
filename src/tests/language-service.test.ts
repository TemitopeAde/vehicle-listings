import { test } from "node:test";
import assert from "node:assert/strict";
import settingsCollection from "../extensions/backend/data-collections/settings";
import {
  getLanguageSettings,
  setLanguageSettings,
  type LanguageDependencies,
} from "../backend/services/language-service";
import type { Context } from "../backend/context";
import { createApiCache } from "../shared/api-cache";

const managerCtx: Context = { siteId: "site-1", actorId: "admin-1", manager: true };
const visitorCtx: Context = { siteId: "site-1", actorId: "visitor-1", manager: false };

test("settings data collection includes language and code fields", () => {
  assert.equal(settingsCollection.idSuffix, "settings");
  assert.equal(settingsCollection.displayName, "Settings");
  const fieldKeys = settingsCollection.fields.map((f) => f.key);
  assert.ok(fieldKeys.includes("language"));
  assert.ok(fieldKeys.includes("code"));
  assert.ok(fieldKeys.includes("theme"));
});

test("reads default language when settings collection has no language record", async () => {
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

test("reads language saved in settings collection language row", async () => {
  const store = new Map<string, any>();
  store.set("settings/language", {
    _id: "language",
    title: "Language settings",
    language: "fr",
    code: "fr",
  });

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

test("reads language from settings collection global row if language row is absent", async () => {
  const store = new Map<string, any>();
  store.set("settings/global", {
    _id: "global",
    title: "Global appearance",
    language: "es",
    code: "es",
    theme: { language: "es" },
  });

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

test("manager can save language to settings collection and syncs global row", async () => {
  const store = new Map<string, any>();
  store.set("settings/global", {
    _id: "global",
    title: "Global appearance",
    theme: { language: "en", accent: "#000000" },
  });
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

  // Stored in settings collection under 'language' row
  const storedLang = store.get("settings/language");
  assert.deepEqual(storedLang, {
    _id: "language",
    title: "Language settings",
    language: "de",
    code: "de",
  });

  // Synced to global row in settings collection
  const storedGlobal = store.get("settings/global");
  assert.equal(storedGlobal.language, "de");
  assert.equal(storedGlobal.code, "de");
  assert.equal(storedGlobal.theme.language, "de");
  assert.equal(storedGlobal.theme.accent, "#000000");

  assert.ok(audits.includes("settings/language:update"));
});

test("setLanguageSettings rejects non-manager callers", async () => {
  const deps: LanguageDependencies = {
    getRow: async () => null as any,
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
    getRow: async () => null as any,
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
