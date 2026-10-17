// This file wires your component with its default props and exports it for use by the extension.
// Please do not modify the structure or logic of this file

import { withDefaults } from '@wix/react-component-utils';
import Component from './vehicle-details';
import { defaultProps } from './vehicle-details.props';

const VehicleDetails = withDefaults(
  Component,
  defaultProps
);

export default VehicleDetails;
