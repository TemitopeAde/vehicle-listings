import { extensions } from "@wix/astro/builders";

export default extensions.customElement({
  id: "05d3a2a5-45fd-42a9-8d92-6d1eddbbdcea",
  name: "vehicle-marketplace",
  width: {
    defaultWidth: 1000,
    allowStretch: true,
  },
  height: {
    defaultHeight: 900,
  },
  installation: {
    autoAdd: false,
  },
  presets: [
    {
      id: "199e94bd-55da-477a-bddb-429b057d5efa",
      name: "default",
      thumbnailUrl: "{{BASE_URL}}/media/demo-car.svg",
    },
  ],

  tagName: "vehicle-marketplace",
  element:
    "./extensions/site/widgets/vehicle-marketplace/vehicle-marketplace.tsx",
  settings:
    "./extensions/site/widgets/vehicle-marketplace/vehicle-marketplace.panel.tsx",
});
