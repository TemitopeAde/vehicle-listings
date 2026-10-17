import { currentCartV2 } from "@wix/ecom";
import wixConfig from "../../../wix.config.json";
import type { Vehicle } from "../../shared/schemas";
import type { Context } from "../context";
import { AppError } from "../errors";
import { getVehicle } from "./vehicle-service";

/** Identifies this app's vehicles among the cart's line items. */
export const vehicleCatalogAppId = wixConfig.appId;
/** Wix eCommerce rejects a single item priced above this. */
const maxCartPrice = 999_999_999;

type CartLike = {
  _id?: string | null;
  lineItems?: {
    _id?: string | null;
    source?: { catalogReference?: { appId?: string; catalogItemId?: string } };
  }[];
  businessInfo?: { currencyCode?: string };
};

export function vehicleLineItemIds(cart: CartLike | undefined, vehicleId: string) {
  return (cart?.lineItems ?? [])
    .filter(
      (item) =>
        item.source?.catalogReference?.appId === vehicleCatalogAppId &&
        item.source.catalogReference.catalogItemId === vehicleId,
    )
    .map((item) => item._id)
    .filter((id): id is string => Boolean(id));
}

/** Only a listed, priced vehicle can be bought; reserved and sold ones stay inquiry-only. */
export function assertPurchasable(vehicle: Vehicle) {
  if (vehicle.demo || vehicle.status !== "published")
    throw new AppError(
      "NOT_AVAILABLE",
      "This vehicle is no longer available to buy online.",
      409,
    );
  if (!(vehicle.price > 0) || vehicle.price > maxCartPrice)
    throw new AppError(
      "NOT_AVAILABLE",
      "This vehicle can't be bought online. Please contact the dealer.",
      409,
    );
}

export function vehicleCartItem(vehicle: Vehicle) {
  const photo = vehicle.media[0]?.url;
  const detail = (name: string, value: string) => ({
    name: { original: name },
    plainText: { original: value },
  });
  return {
    name: { original: vehicle.title.slice(0, 200) },
    // A vehicle is one of a kind.
    quantityInfo: { requestedQuantity: 1, fixedQuantity: true },
    pricing: { price: { amount: vehicle.price.toFixed(2) } },
    source: {
      catalogReference: {
        appId: vehicleCatalogAppId,
        catalogItemId: vehicle._id,
        options: { slug: vehicle.slug, stockId: vehicle.stockId },
      },
    },
    attributes: {
      itemType: { preset: "PHYSICAL" as const },
      // Vehicles are collected or delivered by the dealer, not shipped by the store.
      physicalProperties: {
        shippable: false,
        sku: (vehicle.stockId || vehicle._id).slice(0, 40),
      },
      ...(photo?.startsWith("https://") ? { image: photo } : {}),
      descriptionLines: [
        detail("Year", String(vehicle.year)),
        detail("Mileage", `${vehicle.mileage.toLocaleString("en-US")} ${vehicle.mileageUnit}`),
        ...(vehicle.vin ? [detail("VIN", vehicle.vin)] : []),
      ],
    },
  };
}

/**
 * Adds a vehicle to the visitor's own cart. The price comes from the inventory, never the
 * request, and the call is not elevated so the cart stays the caller's.
 */
export async function addVehicleToCart(ctx: Context, vehicleId: string) {
  if (ctx.demo)
    throw new AppError(
      "NOT_AVAILABLE",
      "The cart isn't available in the local preview.",
      409,
    );
  const vehicle = await getVehicle(ctx, vehicleId, true, false, "_id");
  assertPurchasable(vehicle);
  // No cart yet is the usual case for a first purchase, so a failed read means "empty".
  const existing = await currentCartV2
    .getCurrentCart()
    .then((r) => r.cart)
    .catch(() => undefined);
  if (vehicleLineItemIds(existing, vehicle._id).length)
    return { added: false, alreadyInCart: true };
  const { cart } = await currentCartV2
    .addLineItemsToCurrentCart({ customItems: [vehicleCartItem(vehicle)] })
    .catch((error: unknown) => {
      console.error("Could not add vehicle to cart", error);
      throw new AppError(
        "CART_UNAVAILABLE",
        "Could not add this vehicle to the cart. Make sure the site's store is set up, then try again.",
        502,
      );
    });
  const storeCurrency = cart?.businessInfo?.currencyCode;
  if (storeCurrency && storeCurrency !== vehicle.currency) {
    // The amount was priced in the vehicle's currency; charging it in another would be wrong.
    await currentCartV2
      .removeLineItemsFromCurrentCart(vehicleLineItemIds(cart, vehicle._id))
      .catch((error: unknown) =>
        console.error("Could not remove mismatched vehicle from cart", error),
      );
    throw new AppError(
      "CURRENCY_MISMATCH",
      `This vehicle is priced in ${vehicle.currency}, but the store checks out in ${storeCurrency}. Please contact the dealer.`,
      409,
    );
  }
  return { added: true, alreadyInCart: false };
}
