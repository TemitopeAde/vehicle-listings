// This file is the Editor preview entry point for your component.
// Override or extend it when you need Editor-specific behavior or rendering
// (e.g. mock data, Editor-only interactions, or a different visual state).

import React from "react";
import type { ComponentProps, FC } from "react";
import {
  withDefaults,
  withFallbackPlaceholder,
} from "@wix/react-component-utils";
import Component from "./vehicle-inventory";
import { defaultProps } from "./vehicle-inventory.props";

const VehicleInventoryPreview: FC<ComponentProps<typeof Component>> = (
  props,
) => {
  return <Component {...props} />;
};

const VehicleInventoryPreviewWithFallback = withFallbackPlaceholder(
  VehicleInventoryPreview,
  {
    requiredDataFields: ["title"],
    rootClassName: "vehicle-inventory",
  },
);

export default withDefaults(VehicleInventoryPreviewWithFallback, defaultProps);
