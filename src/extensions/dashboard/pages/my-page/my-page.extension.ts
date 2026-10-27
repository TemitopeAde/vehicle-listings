import { extensions } from '@wix/astro/builders';

export default extensions.dashboardPage({
  id: '6eaddfdf-0ba8-49dd-a8cc-83cf60001fac',
  title: 'Vehicle & Car Listings',
  routePath: 'car-workspace',
  component: './extensions/dashboard/pages/my-page/my-page.tsx',
  fullPage: false,
});
