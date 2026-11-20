import { extensions } from '@wix/astro/builders'

import vehiclesCollection from './vehicles';

import dealersCollection from './dealers';

import inquiriesCollection from './inquiries';

import eventsCollection from './events';

import auditLogsCollection from './audit-logs';

import settingsCollection from './settings';

import savedCarsCollection from './saved-cars';

import quoteRequestsCollection from './quote-requests';

import priceHistoryCollection from './price-history';

export default extensions.dataCollections({
  id: 'd4d5ed57-96dd-4021-9503-1968a782bb82',
  name: 'Data Collections',
  collections: [
    vehiclesCollection,
    dealersCollection,
    inquiriesCollection,
    eventsCollection,
    auditLogsCollection,
    settingsCollection,
    savedCarsCollection,
    quoteRequestsCollection,
    priceHistoryCollection
  ],
});
