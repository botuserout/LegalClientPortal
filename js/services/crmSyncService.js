/**
 * Legal Sthal - CrmSyncService
 * API Abstraction layer for Zoho CRM sync status and retry actions
 */

import { dataStore } from './dataStore.js';

export const crmSyncService = {
  getCrmSync() {
    return Promise.resolve(dataStore.getCrmSync());
  },

  retryCrmSyncRecord(syncId) {
    return Promise.resolve(dataStore.retryCrmSyncRecord(syncId));
  }
};
