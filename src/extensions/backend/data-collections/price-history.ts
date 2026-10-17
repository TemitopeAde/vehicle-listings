import type { DataCollection } from "@wix/astro/builders";
export const collectionIdSuffix = "price-history";
export default {
  idSuffix: collectionIdSuffix,
  displayName: "Price history",
  displayField: "vehicleId",
  fields: [
    { key: "vehicleId", displayName: "Vehicle", type: "TEXT" },
    { key: "price", displayName: "Price", type: "NUMBER" },
    { key: "currency", displayName: "Currency", type: "TEXT" },
    { key: "recordedAt", displayName: "Recorded at", type: "TEXT" },
  ],
  // Visitors read history through the vehicles API, which only returns a public listing.
  dataPermissions: {
    itemRead: "CMS_EDITOR",
    itemInsert: "CMS_EDITOR",
    itemUpdate: "CMS_EDITOR",
    itemRemove: "CMS_EDITOR",
  },
  // Detail pages load one vehicle's points, oldest first.
  indexes: [
    {
      fields: [{ path: "vehicleId" }, { path: "recordedAt", order: "ASC" }],
    },
  ],
  initialData: [],
} satisfies DataCollection;
