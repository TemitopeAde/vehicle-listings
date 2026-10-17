import type { DataCollection } from "@wix/astro/builders";
export const collectionIdSuffix = "events";
export default {
  idSuffix: collectionIdSuffix,
  displayName: "Events",
  displayField: "eventType",
  fields: [
    { key: "siteId", displayName: "siteId", type: "TEXT" },
    { key: "vehicleId", displayName: "vehicleId", type: "TEXT" },
    { key: "eventType", displayName: "eventType", type: "TEXT" },
    { key: "date", displayName: "date", type: "TEXT" },
    { key: "createdAt", displayName: "createdAt", type: "TEXT" },
  ],
  dataPermissions: {
    itemRead: "CMS_EDITOR",
    itemInsert: "CMS_EDITOR",
    itemUpdate: "CMS_EDITOR",
    itemRemove: "CMS_EDITOR",
  },
  indexes: [],
  initialData: [],
} satisfies DataCollection;
