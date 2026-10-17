import { extensions } from "@wix/astro/builders";
import { LAYOUT } from "@wix/react-component-schema";
import { withEditorElementDefaults } from "@wix/react-component-utils";
import merge from "deepmerge";
import { editorElement } from "./vehicle-inventory.generated";
import { defaultProps } from "./vehicle-inventory.props";
import componentUrl from "./component.tsx?url";
import componentPreviewUrl from "./component.preview.tsx?url";
import { appearanceData, filterData } from "../widget-props";

const editorElementWithDefaults = withEditorElementDefaults(
  editorElement,
  defaultProps,
);

export default extensions.editorReactComponent({
  id: "bc17c1a3-3ab7-48a6-bfe1-59747712dd7f",
  type: "vehicle_listings.VehicleInventory",
  displayName: "vehicle-inventory",
  description:
    "Search vehicle inventory, compare cars, view vehicle details and contact the dealership. Customize the layout and appearance for your site.",
  editorElement: merge(editorElementWithDefaults, {
    // Declared here until `wix generate manifest` can regenerate this component.
    data: {
      ...appearanceData,
      ...filterData,
      layout: {
        displayName: "Layout",
        dataType: "textEnum",
        textEnum: {
          options: [
            { value: "grid", displayName: "Grid" },
            { value: "list", displayName: "List" },
          ],
        },
      },
      columns: {
        displayName: "Columns",
        dataType: "number",
        number: { min: "1", max: "4" },
      },
      radius: {
        displayName: "Corner radius",
        dataType: "number",
        number: { min: "0", max: "32" },
      },
      pagination: {
        displayName: "Pagination",
        dataType: "textEnum",
        textEnum: {
          options: [
            { value: "pages", displayName: "Numbered pages" },
            { value: "infinite", displayName: "Infinite scroll" },
          ],
        },
        defaultValue: "pages",
      },
    },
    layout: {
      resizeDirection: LAYOUT.RESIZE_DIRECTION.horizontal,
      contentResizeDirection: LAYOUT.CONTENT_RESIZE_DIRECTION.vertical,
    },
  }),
  installation: {
    initialSize: {
      width: {
        sizingType: LAYOUT.SIZING_TYPE.pixels,
        pixels: 1000,
      },
      height: {
        sizingType: LAYOUT.SIZING_TYPE.content,
      },
    },
  },
  resources: {
    client: {
      componentUrl,
    },
    editor: {
      componentUrl: componentPreviewUrl,
    },
  },
});
