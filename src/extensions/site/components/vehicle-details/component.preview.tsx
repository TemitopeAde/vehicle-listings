// This file is the Editor preview entry point for your component.
// Override or extend it when you need Editor-specific behavior or rendering
// (e.g. mock data, Editor-only interactions, or a different visual state).

import React from "react";
import type { ComponentProps, FC } from "react";
import {
  withDefaults,
  withFallbackPlaceholder,
} from "@wix/react-component-utils";
import Component from "./vehicle-details";
import { defaultProps } from "./vehicle-details.props";

const VehicleDetailsPreview: FC<ComponentProps<typeof Component>> = (props) => {
  return <Component {...props} />;
};

const VehicleDetailsPreviewWithFallback = withFallbackPlaceholder(
  VehicleDetailsPreview,
  {
    requiredDataFields: ["backLabel"],
    rootClassName: "vehicle-details",
  },
);

export default withDefaults(VehicleDetailsPreviewWithFallback, defaultProps);
