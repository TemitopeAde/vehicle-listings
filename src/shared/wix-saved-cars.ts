import type { SavedCarsRepository } from "./account-saved-cars";
import { parseSavedCars } from "./saved-cars-model";

export const savedCarsCollection = "@admin14744/vehicle-listings/saved-cars";
async function recordId(memberId: string, vehicleId: string) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify([memberId, vehicleId])),
  );
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  )
    .join("")
    .slice(0, 32);
}

export const wixSavedCars: SavedCarsRepository = {
  async memberId() {
    if (
      import.meta.env?.DEV &&
      import.meta.env.PUBLIC_CAR_LISTING_DEMO === "1" &&
      ["localhost", "127.0.0.1"].includes(window.location.hostname)
    )
      return null;
    const { currentMember } = await import("@wix/site-members");
    return (await currentMember.getMember())?._id ?? null;
  },
  async list(memberId) {
    const { items } = await import("@wix/data");
    const result = await items
      .query(savedCarsCollection)
      .eq("_owner", memberId)
      .descending("_createdDate")
      .limit(1000)
      .find({ consistentRead: true });
    return parseSavedCars(
      result.items.map((row) => ({ ...row, id: row.vehicleId })),
    );
  },
  async save(memberId, car) {
    const { items } = await import("@wix/data");
    const { id, ...snapshot } = car;
    await items.save(savedCarsCollection, {
      ...snapshot,
      _id: await recordId(memberId, id),
      vehicleId: id,
    });
  },
  async remove(memberId, id) {
    const { items } = await import("@wix/data");
    await items.remove(savedCarsCollection, await recordId(memberId, id));
  },
};
