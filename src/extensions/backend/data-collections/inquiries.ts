import type { DataCollection } from "@wix/astro/builders";
export const collectionIdSuffix = "inquiries";
export default {
  idSuffix: collectionIdSuffix,
  displayName: "Inquiries",
  displayField: "name",
  fields: [
    { key: "vehicleId", displayName: "vehicleId", type: "TEXT" },
    { key: "dealerId", displayName: "dealerId", type: "TEXT" },
    { key: "name", displayName: "name", type: "TEXT" },
    { key: "email", displayName: "email", type: "TEXT" },
    { key: "phone", displayName: "phone", type: "TEXT" },
    { key: "message", displayName: "message", type: "TEXT" },
    { key: "consent", displayName: "consent", type: "BOOLEAN" },
    { key: "kind", displayName: "kind", type: "TEXT" },
    { key: "preferredDate", displayName: "preferredDate", type: "TEXT" },
    { key: "status", displayName: "status", type: "TEXT" },
    { key: "notes", displayName: "notes", type: "TEXT" },
    {
      key: "confirmationEmailStatus",
      displayName: "Confirmation email status",
      type: "TEXT",
    },
    {
      key: "confirmationTransmissionId",
      displayName: "Confirmation transmission ID",
      type: "TEXT",
    },
    { key: "actorHash", displayName: "actorHash", type: "TEXT" },
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
  initialData: [],
} satisfies DataCollection;
