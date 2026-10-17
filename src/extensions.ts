import { app } from '@wix/astro/builders';
import myPage from './extensions/dashboard/pages/my-page/my-page.extension.ts';

import vehicleMarketplace from './extensions/site/widgets/vehicle-marketplace/vehicle-marketplace.extension.ts';

import vehicleDetails from './extensions/site/widgets/vehicle-details/vehicle-details.extension.ts';

import vehicleInventory from './extensions/site/components/vehicle-inventory/vehicle-inventory.extension.ts';

import vehicleDetails1 from './extensions/site/components/vehicle-details/vehicle-details.extension.ts';

import savedCars from './extensions/site/embedded-scripts/saved-cars/saved-cars.extension.ts';

import appInstalled from './extensions/backend/events/app-installed/app-installed.extension.ts';

import appRemoved from './extensions/backend/events/app-removed/app-removed.extension.ts';

import paidPlanPurchased from './extensions/backend/events/paid-plan-purchased/paid-plan-purchased.extension.ts';

import paidPlanChanged from './extensions/backend/events/paid-plan-changed/paid-plan-changed.extension.ts';

import paidPlanAutoRenewalCancelled from './extensions/backend/events/paid-plan-auto-renewal-cancelled/paid-plan-auto-renewal-cancelled.extension.ts';

import inventoryProvider from './extensions/backend/service-plugins/inventory-provider/inventory-provider.extension.ts';

import inventoryTools from './extensions/backend/app-tools/inventory-tools/inventory-tools.extension.ts';

import dataCollections from './extensions/backend/data-collections/data-collections.extension.ts';

import planConvertedToPaid from './extensions/backend/events/plan-converted-to-paid/plan-converted-to-paid.extension.ts';

import planReactivated from './extensions/backend/events/plan-reactivated/plan-reactivated.extension.ts';

import planTransferred from './extensions/backend/events/plan-transferred/plan-transferred.extension.ts';

import dealerApplication from './extensions/site/widgets/dealer-application/dealer-application.extension.ts';

import addAVehicle from './extensions/site/widgets/add-a-vehicle/add-a-vehicle.extension.ts';

import dealerApplication1 from './extensions/site/components/dealer-application/dealer-application.extension.ts';

import addAVehicle1 from './extensions/site/components/add-a-vehicle/add-a-vehicle.extension.ts';

export default app()
  .use(myPage).use(vehicleMarketplace).use(vehicleDetails).use(vehicleInventory).use(vehicleDetails1).use(savedCars).use(appInstalled).use(appRemoved).use(paidPlanPurchased).use(paidPlanChanged).use(paidPlanAutoRenewalCancelled).use(inventoryProvider).use(inventoryTools).use(dataCollections).use(planConvertedToPaid).use(planReactivated).use(planTransferred).use(dealerApplication).use(addAVehicle).use(dealerApplication1).use(addAVehicle1);
