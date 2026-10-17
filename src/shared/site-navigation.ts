type SiteLocation = {
  baseUrl(): Promise<string>;
  url(): Promise<string>;
  to(url: string): Promise<void>;
};

/** A site path Wix Location can open, such as `/vehicles-detail?slug=camry`. */
function sitePath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//"))
    throw new Error("Choose a page on this site.");
  const pathname = path.split(/[?#]/, 1)[0];
  for (const segment of pathname.split("/")) {
    let decoded = segment;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      throw new Error("Choose a page on this site.");
    }
    if (decoded === "." || decoded === "..")
      throw new Error("Choose a page on this site.");
  }
  return path;
}

function pageUrl(baseUrl: string, path: string) {
  path = sitePath(path);
  const base = new URL(baseUrl);
  if (
    !["https:", "http:"].includes(base.protocol) ||
    base.username ||
    base.password
  )
    throw new Error("Wix did not return a valid site URL.");
  base.search = "";
  base.hash = "";
  base.pathname = `${base.pathname.replace(/\/+$/, "")}/`;
  // A free Wix site's base includes its site name, which a root-relative URL drops.
  const target = new URL(path.slice(1), base);
  if (
    target.origin !== base.origin ||
    !target.pathname.startsWith(base.pathname)
  )
    throw new Error("Choose a page on this site.");
  return target.href;
}

type BrowserSession = {
  history: { back(): void; length: number };
  storage: Pick<Storage, "getItem" | "setItem"> | null;
};

const cameFromSiteKey = "vehicle-listings:came-from-site";

function browserSession(): BrowserSession {
  let storage: BrowserSession["storage"] = null;
  try {
    storage = window.sessionStorage;
  } catch {
    // Storage can be blocked; back navigation then falls back to the home page.
  }
  return { history: window.history, storage };
}

export function createSiteNavigation(
  location: SiteLocation,
  session: () => BrowserSession = browserSession,
) {
  return {
    /** Marks that the visitor is moving between this site's pages in this tab. */
    rememberSitePage: () => {
      try {
        session().storage?.setItem(cameFromSiteKey, "1");
      } catch {
        // Without the mark, back navigation falls back to `fallback`.
      }
    },
    /**
     * Returns to the visitor's previous page, like the browser's Back button. Wix sites
     * are single page apps, so `document.referrer` can't tell where they came from; a
     * session mark set before leaving the inventory does. A visitor who opened the
     * page directly has no previous site page and is sent to `fallback` instead.
     */
    back: async (fallback = "/") => {
      const { history, storage } = session();
      let cameFromSite = false;
      try {
        cameFromSite = storage?.getItem(cameFromSiteKey) === "1";
      } catch {
        // Treat unreadable storage as a direct visit.
      }
      if (cameFromSite && history.length > 1) history.back();
      else await location.to(sitePath(fallback));
    },
    pageUrl: async (path: string) => pageUrl(await location.baseUrl(), path),
    // Wix Location opens another page from a site path. An absolute URL built from
    // the browser drops a free site's prefix and is not a local page link.
    to: async (path: string) => location.to(sitePath(path)),
    vehicleLink: async (slug: string) => {
      const current = new URL(await location.url());
      const hash = new URLSearchParams(current.hash.slice(1));
      hash.set("car", slug);
      current.hash = hash.toString();
      return current.href;
    },
  };
}

async function hostLocation(): Promise<SiteLocation> {
  // Only the isolated localhost development fixture uses browser URLs.
  if (
    import.meta.env?.DEV &&
    import.meta.env.PUBLIC_CAR_LISTING_DEMO === "1" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ) {
    return {
      baseUrl: async () => window.location.origin,
      url: async () => window.location.href,
      to: async (url) => window.location.assign(url),
    };
  }
  return (await import("@wix/site-location")).location;
}
export const siteNavigation = createSiteNavigation({
  baseUrl: async () => (await hostLocation()).baseUrl(),
  url: async () => (await hostLocation()).url(),
  to: async (url) => (await hostLocation()).to(url),
});
/**
 * A link back to a vehicle for the saved-cars list. If Wix can't provide the site URL, it falls
 * back to the current page, so saving a vehicle never fails just because a link couldn't be built.
 */
export async function vehicleLinkWithFallback(
  build: () => Promise<string>,
  slug: string,
  currentUrl: string,
) {
  try {
    return await build();
  } catch (error) {
    console.warn(
      "Could not build the vehicle link; using the current page",
      error,
    );
    const url = new URL(currentUrl);
    const hash = new URLSearchParams(url.hash.slice(1));
    hash.set("car", slug);
    url.hash = hash.toString();
    return url.href;
  }
}
