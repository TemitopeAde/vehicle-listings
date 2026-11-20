import type { DataCollection } from "@wix/astro/builders";

export const collectionIdSuffix = "languages";

export default {
  idSuffix: collectionIdSuffix,
  displayName: "Language Settings",
  displayField: "language",
  fields: [
    { key: "language", displayName: "Language", type: "TEXT" },
    { key: "code", displayName: "Language Code", type: "TEXT" },
  ],
  dataPermissions: {
    itemRead: "ANYONE",
    itemInsert: "CMS_EDITOR",
    itemUpdate: "CMS_EDITOR",
    itemRemove: "CMS_EDITOR",
  },
  indexes: [],
  initialData: [
    {
      _id: "global",
      language: "en",
      code: "en",
    },
  ],
} satisfies DataCollection;
