// This file is the Editor preview entry point for your component.
// Override or extend it when you need Editor-specific behavior or rendering
// (e.g. mock data, Editor-only interactions, or a different visual state).

import React from 'react';
import type { ComponentProps, FC } from 'react';
import {
  withDefaults,
  withFallbackPlaceholder,
} from '@wix/react-component-utils';
import Component from './add-a-vehicle';
import { defaultProps } from './add-a-vehicle.props';

const AddAVehiclePreview: FC<ComponentProps<typeof Component>> = (props) => {
  return <Component {...props} />;
};

const AddAVehiclePreviewWithFallback = withFallbackPlaceholder(AddAVehiclePreview, {
  requiredDataFields: ['title'],
  rootClassName: 'add-a-vehicle',
});

export default withDefaults(
  AddAVehiclePreviewWithFallback,
  defaultProps
);
