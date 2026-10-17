import type { DataCollection } from "@wix/astro/builders";
export const collectionIdSuffix = "audit-logs";
export default {
  idSuffix: collectionIdSuffix,
  displayName: "Audit Logs",
  displayField: "entity",
  fields: [
    { key: "siteId", displayName: "siteId", type: "TEXT" },
    { key: "actorId", displayName: "actorId", type: "TEXT" },
    { key: "entity", displayName: "entity", type: "TEXT" },
    { key: "entityId", displayName: "entityId", type: "TEXT" },
    { key: "action", displayName: "action", type: "TEXT" },
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
