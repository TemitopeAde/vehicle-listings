// This file wires your component with its default props and exports it for use by the extension.
// Please do not modify the structure or logic of this file

import { withDefaults } from '@wix/react-component-utils';
import Component from './dealer-application';
import { defaultProps } from './dealer-application.props';

const DealerApplication = withDefaults(
  Component,
  defaultProps
);

export default DealerApplication;
