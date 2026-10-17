import { extensions } from '@wix/astro/builders'

export default extensions.customElement({
  id: '1fadc02b-1825-438d-9f6d-343d0ddaf522',
  name: 'Add a vehicle',
  width: {
    defaultWidth: 980,
    allowStretch: true
  },
  height: {
    defaultHeight: 1100
  },
  installation: {
    autoAdd: false
  },
  presets: [
    {
      id: '339c58df-c9f5-4e2e-ad36-0bd8fbba4130',
      name: 'default',
      thumbnailUrl: '{{BASE_URL}}/vehicle-details-thumbnail.png',
    },
  ],
  
  tagName: 'add-a-vehicle',
  element: './extensions/site/widgets/add-a-vehicle/add-a-vehicle.tsx',
  settings: './extensions/site/widgets/add-a-vehicle/add-a-vehicle.panel.tsx',
});
