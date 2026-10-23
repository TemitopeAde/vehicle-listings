import type { DataCollection } from "@wix/astro/builders";
export const collectionIdSuffix = "dealers";
export default {
  idSuffix: collectionIdSuffix,
  displayName: "Dealers",
  displayField: "businessName",
  fields: [
    { key: "businessName", displayName: "businessName", type: "TEXT" },
    { key: "email", displayName: "email", type: "TEXT" },
    { key: "phone", displayName: "phone", type: "TEXT" },
    { key: "whatsapp", displayName: "whatsapp", type: "TEXT" },
    { key: "address", displayName: "address", type: "TEXT" },
    { key: "location", displayName: "location", type: "TEXT" },
    { key: "website", displayName: "website", type: "TEXT" },
    { key: "description", displayName: "description", type: "TEXT" },
    { key: "hours", displayName: "hours", type: "TEXT" },
    { key: "approvalState", displayName: "approvalState", type: "TEXT" },
    { key: "accessToken", displayName: "accessToken", type: "TEXT" },
    { key: "memberId", displayName: "memberId", type: "TEXT" },
    { key: "createdAt", displayName: "createdAt", type: "TEXT" },
    { key: "updatedAt", displayName: "updatedAt", type: "TEXT" },
  ],
  dataPermissions: {
    itemRead: "CMS_EDITOR",
    itemInsert: "CMS_EDITOR",
    itemUpdate: "CMS_EDITOR",
    itemRemove: "CMS_EDITOR",
  },
  indexes: [],
} satisfies DataCollection;
