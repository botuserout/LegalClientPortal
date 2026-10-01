/**
 * Legal Sthal - QuoteService
 * API Abstraction layer for quote requests & management
 */

import { dataStore } from './dataStore.js';

export const quoteService = {
  getQuoteRequests() {
    return Promise.resolve(dataStore.getQuoteRequests());
  },

  getQuoteRequestsByClientId(clientId) {
    return Promise.resolve(dataStore.getQuoteRequestsByClientId(clientId));
  },

  createQuoteRequest(requestInfo) {
    return Promise.resolve(dataStore.createQuoteRequest(requestInfo));
  },

  updateQuoteStatus(quoteId, status, amount = null, remarks = null) {
    return Promise.resolve(dataStore.updateQuoteStatus(quoteId, status, amount, remarks));
  }
};
