/**
 * Legal Sthal - DocumentService
 * API Abstraction layer for document submission & verification workspace
 */

import { dataStore } from './dataStore.js';

export const documentService = {
  getDocumentsByService(serviceId) {
    return Promise.resolve(dataStore.getDocumentsByService(serviceId));
  },

  getAllDocuments() {
    return Promise.resolve(dataStore.getAllDocuments());
  },

  verifyDocument(serviceId, docId) {
    return Promise.resolve(dataStore.verifyDocument(serviceId, docId));
  },

  rejectDocument(serviceId, docId, reason) {
    return Promise.resolve(dataStore.rejectDocument(serviceId, docId, reason));
  },

  submitDocument(serviceId, docName) {
    return Promise.resolve(dataStore.submitDocument(serviceId, docName));
  }
};
