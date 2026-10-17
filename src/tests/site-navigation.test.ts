import { test } from "node:test";
import assert from "node:assert/strict";
import { createSiteNavigation } from "../shared/site-navigation";
import { vehicleDetailsUrl } from "../shared/utils";

function fixture(base: string) {
  const navigations: string[] = [];
  let reads = 0;
  const navigation = createSiteNavigation({
    baseUrl: async () => {
      reads++;
      return base;
    },
    url: async () =>
      `${base.replace(/\/$/, "")}/inventory?category=used#sort=price`,
    to: async (url) => {
      navigations.push(url);
    },
  });
  return { navigation, navigations, reads: () => reads };
}
test("vehicle pages are opened with a Wix Location site path", async () => {
  const { navigation, navigations, reads } = fixture(
    "https://dealer.wixsite.com/showroom/",
  );
  await navigation.to(vehicleDetailsUrl("camry & hybrid"));
  assert.equal(reads(), 0);
  assert.deepEqual(navigations, [
    "/vehicles-detail?slug=camry%20%26%20hybrid",
  ]);
  await navigation.to("/");
  assert.equal(navigations[1], "/");
});
test("custom-domain saved links resolve using Wix's base URL with or without a trailing slash", async () => {
  for (const base of [
    "https://cars.example.com",
    "https://cars.example.com/",
  ]) {
    const { navigation } = fixture(base);
    assert.equal(
      await navigation.pageUrl(
        vehicleDetailsUrl("civic", "/inventory/details"),
      ),
      "https://cars.example.com/inventory/details?slug=civic",
    );
  }
});
test("an inline saved vehicle uses Wix's current page URL and preserves its query and hash values", async () => {
  const { navigation } = fixture("https://dealer.wixsite.com/showroom/");
  const url = new URL(await navigation.vehicleLink("civic--123"));
  assert.equal(url.pathname, "/showroom/inventory");
  assert.equal(url.search, "?category=used");
  assert.equal(new URLSearchParams(url.hash.slice(1)).get("sort"), "price");
  assert.equal(
    new URLSearchParams(url.hash.slice(1)).get("car"),
    "civic--123",
  );
});
test("navigation does not build a browser URL when Wix cannot provide the site address", async () => {
  const navigations: string[] = [];
  const navigation = createSiteNavigation({
    baseUrl: async () => {
      throw new Error("Wix URL unavailable");
    },
    url: async () => "https://host.example.com/",
    to: async (url) => {
      navigations.push(url);
    },
  });
  await navigation.to("/vehicles-detail?slug=camry");
  assert.deepEqual(navigations, ["/vehicles-detail?slug=camry"]);
});
test("site navigation rejects external paths and paths escaping a free site's root", async () => {
  const { navigation } = fixture("https://dealer.wixsite.com/showroom/");
  for (const path of [
    "//evil.example.com",
    "https://evil.example.com",
    "/../another-site",
    "/%2e%2e/another-site",
  ]) {
    await assert.rejects(navigation.to(path), /page on this site/);
  }
});

function backFixture(stored: string | null, historyLength = 3) {
  const navigations: string[] = [];
  let backs = 0;
  const storage = new Map<string, string>();
  if (stored) storage.set("vehicle-listings:came-from-site", stored);
  const navigation = createSiteNavigation(
    {
      baseUrl: async () => "https://dealer.wixsite.com/showroom/",
      url: async () => "https://dealer.wixsite.com/showroom/inventory",
      to: async (url) => {
        navigations.push(url);
      },
    },
    () => ({
      history: { back: () => backs++, length: historyLength },
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
      },
    }),
  );
  return { navigation, navigations, backs: () => backs };
}
test("back returns to the previous site page after moving within the site", async () => {
  const { navigation, navigations, backs } = backFixture(null);
  navigation.rememberSitePage();
  await navigation.back("/");
  assert.equal(backs(), 1);
  assert.deepEqual(navigations, []);
});
test("back opens the fallback page when the visitor arrived directly", async () => {
  const direct = backFixture(null);
  await direct.navigation.back("/");
  assert.equal(direct.backs(), 0);
  assert.deepEqual(direct.navigations, ["/"]);
  const newTab = backFixture("1", 1);
  await newTab.navigation.back("/inventory");
  assert.equal(newTab.backs(), 0);
  assert.deepEqual(newTab.navigations, ["/inventory"]);
});
