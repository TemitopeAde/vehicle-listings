import { extensions } from "@wix/astro/builders";

export default extensions.customElement({
  id: "28f262f2-a37b-4db7-a79a-724e67c1428f",
  name: "vehicle-details",
  width: {
    defaultWidth: 1000,
    allowStretch: true,
  },
  height: {
    defaultHeight: 1200,
  },
  installation: {
    autoAdd: false,
  },
  presets: [
    {
      id: "3fbe7793-144b-4e11-ae67-5ab2c9e949fb",
      name: "default",
      thumbnailUrl: "{{BASE_URL}}/media/demo-car.svg",
    },
  ],

  tagName: "vehicle-details",
  element: "./extensions/site/widgets/vehicle-details/vehicle-details.tsx",
  settings:
    "./extensions/site/widgets/vehicle-details/vehicle-details.panel.tsx",
});
