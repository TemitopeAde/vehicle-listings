import type { DataCollection } from "@wix/astro/builders";

export const collectionIdSuffix = "saved-cars";

export default {
  idSuffix: collectionIdSuffix,
  displayName: "Member Saved Cars",
  fields: [
    {
      type: "TEXT",
      displayName: "Title",
      key: "title",
    },
    {
      type: "TEXT",
      displayName: "Image",
      key: "image",
    },
    { type: "TEXT", displayName: "Vehicle ID", key: "vehicleId" },
    { type: "NUMBER", displayName: "Price", key: "price" },
    { type: "TEXT", displayName: "Currency", key: "currency" },
    { type: "TEXT", displayName: "Vehicle link", key: "href" },
  ],
  displayField: "title",
  dataPermissions: {
    itemInsert: "SITE_MEMBER_AUTHOR",
    itemRead: "SITE_MEMBER_AUTHOR",
    itemRemove: "SITE_MEMBER_AUTHOR",
    itemUpdate: "SITE_MEMBER_AUTHOR",
  },
  indexes: [
    { fields: [{ path: "_owner" }, { path: "vehicleId" }], unique: true },
  ],
  initialData: [],
} satisfies DataCollection;
