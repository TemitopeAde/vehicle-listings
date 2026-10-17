import { extensions } from '@wix/astro/builders'
import { LAYOUT, type EditorElement } from '@wix/react-component-schema';
import { withEditorElementDefaults } from '@wix/react-component-utils';
import merge from 'deepmerge';
import { editorElement } from './dealer-application.generated';
import { defaultProps } from './dealer-application.props';
import componentUrl from './component.tsx?url';
import componentPreviewUrl from './component.preview.tsx?url';

const display = { display: { displayValues: ['none', 'block'] } };
// The application form is shared with the dashboard, so its utility classes are not editor parts.
const declared = {
  ...editorElement,
  displayName: 'Dealer application',
  data: {
    direction: { displayName: 'Direction', dataType: 'direction' },
    title: {
      displayName: 'Heading',
      dataType: 'text',
      text: {},
    },
  },
  elements: {
    dealerApplicationForm: {
      elementType: 'inlineElement',
      inlineElement: {
        selector: '.dealer-application-form',
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
  id: 'a486673d-c50f-4279-85e6-fcf0d1af4f52',
  type: 'vehicle_listings.DealerApplication',
  displayName: 'Dealer application',
  description: 'A form where a logged-in site member applies to become a dealership. Use it on a page where sellers request approval before they can list vehicles.',
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
        pixels: 720,
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
