import { extensions } from "@wix/astro/builders";
import { LAYOUT, type EditorElement } from "@wix/react-component-schema";
import { withEditorElementDefaults } from "@wix/react-component-utils";
import merge from "deepmerge";
import { editorElement } from "./vehicle-details.generated";
import { defaultProps } from "./vehicle-details.props";
import componentUrl from "./component.tsx?url";
import componentPreviewUrl from "./component.preview.tsx?url";
import { appearanceData } from "../widget-props";

const display = { display: { displayValues: ["none", "block"] } };
// `wix generate manifest` can't derive parts from the shared storefront markup (nested
// utility classes such as `grid` repeat), so the props and parts are declared here and
// replace the scaffold's placeholder fields.
const declared = {
  ...editorElement,
  displayName: "Vehicle Details",
  data: {
    ...appearanceData,
    radius: {
      displayName: "Corner radius",
      dataType: "number",
      number: { min: "0", max: "32" },
    },
    direction: { displayName: "Direction", dataType: "direction" },
    backLabel: {
      displayName: "Back button accessible label",
      dataType: "text",
      text: {},
    },
  },
  elements: {
    vehicleDetailsDetails: {
      elementType: "inlineElement",
      inlineElement: {
        selector: ".vehicle-details-details",
        displayName: "Details",
        behaviors: { removable: false, selectable: false },
        cssProperties: {
          background: { defaultValue: "#fff" },
          borderTop: { defaultValue: "1px solid #dce4de" },
          borderBottom: { defaultValue: "1px solid #dce4de" },
          borderInlineStart: { defaultValue: "1px solid #dce4de" },
          borderInlineEnd: { defaultValue: "1px solid #dce4de" },
          paddingTop: { defaultValue: "24px" },
          paddingBottom: { defaultValue: "24px" },
          paddingInlineStart: { defaultValue: "24px" },
          paddingInlineEnd: { defaultValue: "24px" },
          borderStartStartRadius: { defaultValue: "12px" },
          borderStartEndRadius: { defaultValue: "12px" },
          borderEndStartRadius: { defaultValue: "12px" },
          borderEndEndRadius: { defaultValue: "12px" },
          boxShadow: {},
          display,
        },
      },
    },
  },
  cssProperties: {
    background: { defaultValue: "#fff" },
    borderTop: {},
    borderBottom: {},
    borderInlineStart: {},
    borderInlineEnd: {},
    paddingTop: { defaultValue: "24px" },
    paddingBottom: { defaultValue: "24px" },
    paddingInlineStart: { defaultValue: "24px" },
    paddingInlineEnd: { defaultValue: "24px" },
    borderStartStartRadius: {},
    borderStartEndRadius: {},
    borderEndStartRadius: {},
    borderEndEndRadius: {},
    boxShadow: {},
  },
} as EditorElement;

const editorElementWithDefaults = withEditorElementDefaults(
  declared,
  defaultProps,
);

export default extensions.editorReactComponent({
  id: "169b7d89-418e-41b7-9779-7bd73b2330d4",
  type: "vehicle_listings.VehicleDetails",
  displayName: "vehicle-details",
  description:
    "Shows the full details of the vehicle a visitor selected from the inventory: photo gallery, specifications, features, payment estimate and dealer contact options.",
  editorElement: merge(editorElementWithDefaults, {
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
