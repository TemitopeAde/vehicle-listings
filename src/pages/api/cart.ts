import type { APIRoute } from "astro";
import { z } from "zod";
import { context } from "../../backend/context";
import { respond, readJson, methodNotAllowed } from "../../backend/errors";
import { addVehicleToCart } from "../../backend/services/cart-service";

// Only the vehicle is accepted; name and price are read from the inventory.
const addRequest = z.object({ vehicleId: z.string().trim().min(1).max(100) }).strict();

export const POST: APIRoute = ({ request }) =>
  respond(async () => {
    const { vehicleId } = addRequest.parse(await readJson(request));
    return addVehicleToCart(await context(), vehicleId);
  });

export const ALL: APIRoute = () => methodNotAllowed(["POST"]);
