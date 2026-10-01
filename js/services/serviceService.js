/**
 * Legal Sthal - ServiceService
 * API Abstraction layer for client services, stages, catalog
 */

import { dataStore } from './dataStore.js';

export const serviceService = {
  getServices() {
    return Promise.resolve(dataStore.getServices());
  },

  getServicesByClientId(clientId) {
    return Promise.resolve(dataStore.getServicesByClientId(clientId));
  },

  getServiceDetails(serviceId) {
    const service = dataStore.getServiceById(serviceId);
    if (!service) return Promise.resolve(null);

    const client = dataStore.getClientById(service.clientId);
    const spoc = dataStore.getSpocById(service.spocId);

    return Promise.resolve({
      service,
      client,
      spoc
    });
  },

  addServiceToClient(clientId, serviceData) {
    const result = dataStore.addServiceToClient(clientId, serviceData);
    return Promise.resolve(result);
  },

  updateServiceStage(serviceId, stageIndex) {
    const result = dataStore.updateServiceStage(serviceId, stageIndex);
    return Promise.resolve(result);
  },

  getCatalogServices() {
    return Promise.resolve(dataStore.getCatalogServices());
  },

  getCategories() {
    return Promise.resolve([
      "All",
      "Taxation & GST",
      "Business Incorporation",
      "Intellectual Property",
      "Corporate Compliance",
      "Payroll & Employment",
      "Licenses & Registrations",
      "International Business",
      "Startup & Government",
      "Web & Digital Services",
      "Virtual Office"
    ]);
  },

  getCatalogServiceById(id) {
    const catalog = dataStore.getCatalogServices();
    return Promise.resolve(catalog.find(s => s.id === id) || null);
  },

  getBRDTrackedServices() {
    const catalog = dataStore.getCatalogServices();
    return Promise.resolve(catalog.filter(s => s.portalTracking === true));
  },

  updateCatalogService(id, updates) {
    const result = dataStore.updateCatalogService(id, updates);
    return Promise.resolve(result);
  }
};
