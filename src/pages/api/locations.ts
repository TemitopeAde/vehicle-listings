import type { APIRoute } from "astro";
import { z } from "zod";
import { respond, methodNotAllowed } from "../../backend/errors";
import {
  listCities,
  listStates,
} from "../../backend/services/location-service";
import { countryCodes } from "../../shared/countries";

const code = z.string().trim().toUpperCase().max(10);

/** States for `?country=US`, or cities for `?country=US&state=CA`. */
export const GET: APIRoute = ({ request }) =>
  respond(async () => {
    const p = new URL(request.url).searchParams;
    const country = code
      .refine((c) => countryCodes.has(c), "Choose a country from the list.")
      .parse(p.get("country") ?? "");
    const state = p.get("state");
    return state
      ? listCities(country, code.min(1).parse(state))
      : listStates(country);
  });

export const ALL: APIRoute = () => methodNotAllowed(["GET"]);
