import { httpClient } from "@wix/essentials";
import { readResult } from "./api-response";
import { createApiCache } from "./api-cache";
import { samplePhotos } from "./sample-photos";
export { readResult } from "./api-response";
export const apiOrigin = new URL(import.meta.url).origin;
export function apiUrl(route: string) {
  return new URL(`/api/${route}`, apiOrigin).href;
}
/**
 * App-bundled files such as `/media/samples/…` must load from the app, not the merchant's site,
 * where a root-relative path would resolve to a page that doesn't exist.
 */
export function assetUrl(url: string) {
  // During server rendering the module URL is `file://` and its origin is "null".
  if (!url.startsWith("/") || !apiOrigin.startsWith("http")) return url;
  const origin = new URL(apiOrigin);
  // Wix's HTTPS development site can't load app-bundled images from the local
  // HTTP dev server. Use the already credited Commons source for sample photos
  // in that case; deployed apps continue to serve their bundled assets.
  if (
    ["localhost", "127.0.0.1", "::1"].includes(origin.hostname) &&
    /^\/media\/samples\/[a-z0-9-]+\.jpg$/.test(url)
  ) {
    const file = url.split("/").at(-1)?.replace(/\.jpg$/, "");
    const photo = Object.values(samplePhotos).find((item) => item.file === file);
    if (photo?.creditUrl) {
      const path = new URL(photo.creditUrl).pathname;
      const title = path.startsWith("/wiki/File:")
        ? decodeURIComponent(path.slice("/wiki/File:".length))
        : "";
      if (title) {
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(title)}`;
      }
    }
  }
  return new URL(url, origin).href;
}
export function apiInit(
  body: unknown,
  method: string,
  headers?: Record<string, string>,
): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}
export async function api<T>(
  route: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
  headers?: Record<string, string>,
): Promise<T> {
  const url = apiUrl(route);
  const response = await httpClient.fetchWithAuth(
    url,
    apiInit(body, method, headers),
  );
  return readResult<T>(response);
}
/** How long a public storefront read is reused before the API is asked again. */
export const cacheTtl = {
  settings: 60_000,
  languages: 60_000,
  makes: 10 * 60_000,
  listings: 2 * 60_000,
  vehicle: 5 * 60_000,
  dealers: 10 * 60_000,
  places: 60 * 60_000,
};
const storefrontCache = createApiCache((route) => api(route));
/** A GET through the storefront cache; errors are never cached, so a retry calls the API. */
export function cachedApi<T>(route: string, ttlMs: number): Promise<T> {
  return storefrontCache.get<T>(route, ttlMs);
}
export function peekCached<T>(route: string): T | undefined {
  return storefrontCache.peek<T>(route);
}
export function invalidateApiCache(route?: string) {
  if (route) {
    storefrontCache.forget(route);
  } else {
    storefrontCache.clear();
  }
}
export function setCachedApi<T>(route: string, value: T, ttlMs: number) {
  storefrontCache.set(route, value, ttlMs);
}
export function download(
  name: string,
  content: string,
  type = "text/csv;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
