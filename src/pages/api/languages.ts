import type { APIRoute } from "astro";
import { context } from "../../backend/context";
import { respond, readJson, methodNotAllowed } from "../../backend/errors";
import {
  getLanguageSettings,
  setLanguageSettings,
} from "../../backend/services/language-service";
import { languageOptions } from "../../shared/languages";

export const GET: APIRoute = () =>
  respond(async () => {
    const current = await getLanguageSettings(await context());
    return {
      ...current,
      languages: languageOptions,
    };
  });

export const PATCH: APIRoute = ({ request }) =>
  respond(async () => {
    const current = await setLanguageSettings(
      await context(true),
      await readJson(request),
    );
    return {
      ...current,
      languages: languageOptions,
    };
  });

export const POST: APIRoute = ({ request }) =>
  respond(async () => {
    const current = await setLanguageSettings(
      await context(true),
      await readJson(request),
    );
    return {
      ...current,
      languages: languageOptions,
    };
  });

export const ALL: APIRoute = () => methodNotAllowed(["GET", "PATCH", "POST"]);
