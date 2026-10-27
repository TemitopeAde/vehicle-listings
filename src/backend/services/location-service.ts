import { AppError } from "../errors";

/** CountriesNow is free and keyless; it names countries its own way, so codes are matched first. */
const baseUrl = "https://countriesnow.space/api/v0.1";

export type State = { code: string; name: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

// Places rarely change, so lookups are kept for the life of the server instance.
const cache = new Map<string, Promise<unknown>>();
function cached<T>(key: string, load: () => Promise<T>) {
  if (!cache.has(key))
    cache.set(
      key,
      load().catch((error) => {
        cache.delete(key);
        throw error;
      }),
    );
  return cache.get(key) as Promise<T>;
}

async function countriesNow(path: string, init?: RequestInit) {
  let payload: unknown;
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
      signal: AbortSignal.timeout(8000),
    });
    payload = await response.json();
    if (!response.ok || !isRecord(payload) || payload.error === true)
      throw new Error(
        `CountriesNow ${response.status}: ${isRecord(payload) ? text(payload.msg) : ""}`,
      );
  } catch (error) {
    console.error(
      "Location lookup failed",
      error instanceof Error ? `${error.name}: ${error.message}` : "unknown",
    );
    throw new AppError(
      "LOCATION_UNAVAILABLE",
      "Places could not be loaded. Type them in instead.",
      502,
    );
  }
  return payload.data;
}

const countryNames = () =>
  cached("countries", async () => {
    const data = await countriesNow("/countries/iso");
    return new Map(
      (Array.isArray(data) ? data : [])
        .filter(isRecord)
        .map((c) => [text(c.Iso2 ?? c.iso2).toUpperCase(), text(c.name)]),
    );
  });

async function countryName(code: string) {
  const name = (await countryNames()).get(code.toUpperCase());
  if (!name) throw new AppError("NOT_FOUND", "Country not found.", 404);
  return name;
}

export const listStates = (country: string): Promise<State[]> =>
  cached(`states:${country}`, async () => {
    const data = await countriesNow(
      `/countries/states/q?country=${encodeURIComponent(await countryName(country))}`,
    );
    const states =
      isRecord(data) && Array.isArray(data.states) ? data.states : [];
    return states
      .filter(isRecord)
      .map((s) => ({
        code: text(s.state_code).toUpperCase(),
        name: text(s.name),
      }))
      .filter((s) => s.code && s.name);
  });

export const listCities = (country: string, state: string): Promise<string[]> =>
  cached(`cities:${country}:${state}`, async () => {
    const match = (await listStates(country)).find((s) => s.code === state);
    if (!match) throw new AppError("NOT_FOUND", "State not found.", 404);
    const data = await countriesNow("/countries/state/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country: await countryName(country),
        state: match.name,
      }),
    });
    return (Array.isArray(data) ? data : [])
      .map((city) => text(isRecord(city) ? city.name : city))
      .filter(Boolean);
  });
