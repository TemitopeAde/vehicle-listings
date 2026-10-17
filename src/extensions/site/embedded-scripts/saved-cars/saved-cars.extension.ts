import { extensions } from '@wix/astro/builders'

export default extensions.embeddedScript({
  id: 'a98020c4-3999-4b6d-96f1-01fa817d4011',
  name: 'Saved Cars',
  placement: 'BODY_END',
  scriptType: 'FUNCTIONAL',
  source: './extensions/site/embedded-scripts/saved-cars/saved-cars.html',
});
