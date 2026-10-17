import { extensions } from '@wix/astro/builders'
import { LAYOUT, type EditorElement } from '@wix/react-component-schema';
import { withEditorElementDefaults } from '@wix/react-component-utils';
import merge from 'deepmerge';
import { editorElement } from './add-a-vehicle.generated';
import { defaultProps } from './add-a-vehicle.props';
import componentUrl from './component.tsx?url';
import componentPreviewUrl from './component.preview.tsx?url';

const display = { display: { displayValues: ['none', 'block'] } };
// The vehicle form is shared with the dashboard, so its utility classes are not editor parts.
const declared = {
  ...editorElement,
  displayName: 'Add a vehicle',
  data: {
    direction: { displayName: 'Direction', dataType: 'direction' },
    title: {
      displayName: 'Heading',
      dataType: 'text',
      text: {},
    },
  },
  elements: {
    addAVehicleForm: {
      elementType: 'inlineElement',
      inlineElement: {
        selector: '.add-a-vehicle-form',
        displayName: 'Form',
        behaviors: { removable: false, selectable: false },
        cssProperties: {
          background: { defaultValue: '#fff' },
          paddingTop: { defaultValue: '0px' },
          paddingBottom: { defaultValue: '0px' },
          paddingInlineStart: { defaultValue: '0px' },
          paddingInlineEnd: { defaultValue: '0px' },
          display,
        },
      },
    },
  },
  cssProperties: {
    background: { defaultValue: '#fff' },
    paddingTop: {},
    paddingBottom: {},
    paddingInlineStart: {},
    paddingInlineEnd: {},
  },
} as EditorElement;

const editorElementWithDefaults = withEditorElementDefaults(
  declared,
  defaultProps
);

export default extensions.editorReactComponent({
  id: '1c1e1d48-cd64-4366-b881-28675c888ae5',
  type: 'vehicle_listings.AddAVehicle',
  displayName: 'Add a vehicle',
  description: 'A form where a logged-in site member prepares a vehicle for sale. Saving stays off until that account has an approved dealership application.',
  editorElement: merge(
    editorElementWithDefaults,
    {
      layout: {
        resizeDirection: LAYOUT.RESIZE_DIRECTION.horizontal,
        contentResizeDirection: LAYOUT.CONTENT_RESIZE_DIRECTION.vertical,
      },
    }
  ),
  installation: {
    initialSize: {
      width: {
        sizingType: LAYOUT.SIZING_TYPE.pixels,
        pixels: 980,
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
