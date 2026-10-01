/**
 * Legal Sthal - SpocService
 * API Abstraction layer for SPOC management
 */

import { dataStore } from './dataStore.js';

export const spocService = {
  getSpocs() {
    return Promise.resolve(dataStore.getSpocs());
  },

  getSpocById(id) {
    return Promise.resolve(dataStore.getSpocById(id));
  },

  assignSpoc(serviceId, spocId) {
    return Promise.resolve(dataStore.assignSpoc(serviceId, spocId));
  }
};
