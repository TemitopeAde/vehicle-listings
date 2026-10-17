import type { DataCollection } from "@wix/astro/builders";
export const collectionIdSuffix = "settings";
export default {
  idSuffix: collectionIdSuffix,
  displayName: "Settings",
  displayField: "title",
  fields: [
    { key: "title", displayName: "title", type: "TEXT" },
    {
      key: "theme",
      displayName: "theme",
      type: "OBJECT",
      objectOptions: { fields: [] },
    },
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
