import { extensions } from '@wix/astro/builders'

export default extensions.customElement({
  id: '829044e8-e590-4584-a507-5c4dc54baf03',
  name: 'Dealer application',
  width: {
    defaultWidth: 720,
    allowStretch: true
  },
  height: {
    defaultHeight: 900
  },
  installation: {
    autoAdd: false
  },
  presets: [
    {
      id: '5e5ed31d-425c-4068-9c6c-56401e2e1fb7',
      name: 'default',
      thumbnailUrl: '{{BASE_URL}}/vehicle-marketplace-thumbnail.png',
    },
  ],
  
  tagName: 'dealer-application',
  element: './extensions/site/widgets/dealer-application/dealer-application.tsx',
  settings: './extensions/site/widgets/dealer-application/dealer-application.panel.tsx',
});
