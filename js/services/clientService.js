/**
 * Legal Sthal - ClientService
 * API Abstraction layer for client operations
 */

import { dataStore } from './dataStore.js';

export const clientService = {
  getClients() {
    return Promise.resolve(dataStore.getClients());
  },

  getClientById(id) {
    return Promise.resolve(dataStore.getClientById(id));
  },

  getClientDashboard(clientId) {
    const client = dataStore.getClientById(clientId);
    const services = dataStore.getServicesByClientId(clientId);
    
    let activeServices = 0;
    let completedServices = 0;
    let pendingDocsCount = 0;
    let totalDueAmount = 0;

    services.forEach(srv => {
      if (srv.status === 'Completed') {
        completedServices++;
      } else {
        activeServices++;
      }

      totalDueAmount += (srv.remainingAmount || 0);

      (srv.documents || []).forEach(doc => {
        if (doc.status === 'Pending' || doc.status === 'Rejected' || doc.status === 'Under Review') {
          pendingDocsCount++;
        }
      });
    });

    return Promise.resolve({
      client,
      services,
      metrics: {
        activeServices,
        completedServices,
        pendingDocsCount,
        totalDueAmount
      }
    });
  },

  createClient(clientData) {
    const result = dataStore.createClient(clientData);
    return Promise.resolve(result);
  },

  updateClient(id, updates) {
    const client = dataStore.getClientById(id);
    if (client) {
      Object.assign(client, updates);
      dataStore.saveData();
      return Promise.resolve({ success: true, client });
    }
    return Promise.resolve({ success: false, message: 'Client not found' });
  }
};
