/**
 * Legal Sthal - ServiceService (serviceService.js)
 * Version: 2.0.0 (Step 5 Core Data Layer)
 * 
 * Provides API abstraction for client services, stage tracking,
 * and service catalog management with live API integration and local fallback.
 */

import { apiClient } from './apiClient.js';
import { authState } from '../state/authState.js';
import { dataStore } from './dataStore.js';
import { CONFIG } from '../config.js';

function normalizeService(s) {
  if (!s) return null;
  const stages = (s.stages || []).map((st, idx) => ({
    id: st.stageId || st.id || `stg_${idx}`,
    stageId: st.stageId || st.id || `stg_${idx}`,
    name: st.stageName || st.name || '',
    stageName: st.stageName || st.name || '',
    status: st.stageStatus || st.status || 'Pending',
    stageStatus: st.stageStatus || st.status || 'Pending',
    completedOn: st.completedOn || '',
    description: st.description || '',
    sequenceOrder: st.sequenceOrder !== undefined ? st.sequenceOrder : idx + 1
  }));

  const currentStageIndex = s.currentStageIndex !== undefined ? Number(s.currentStageIndex) : 0;
  const totalAmount = Number(s.totalAmount || 0);
  const paidAmount = Number(s.paidAmount || 0);
  const remainingAmount = s.remainingAmount !== undefined ? Number(s.remainingAmount) : (totalAmount - paidAmount);

  return {
    id: s.serviceId || s.id || '',
    serviceId: s.serviceId || s.id || '',
    clientId: s.clientId || '',
    serviceCode: s.serviceCode || '',
    crmDealId: s.crmDealId || '',
    serviceType: s.serviceName || s.serviceType || '',
    serviceName: s.serviceName || s.serviceType || '',
    companyType: s.companyType || '',
    state: s.state || '',
    totalAmount: totalAmount,
    paidAmount: paidAmount,
    remainingAmount: remainingAmount,
    dscCount: Number(s.dscCount || 0),
    currentStage: s.currentStage || (stages[currentStageIndex]?.name || ''),
    currentStageIndex: currentStageIndex,
    progressPercentage: Number(s.progressPercentage || 0),
    status: s.status || 'In Progress',
    spocId: s.spocId || '',
    certificateUrl: s.certificateUrl || '',
    completedOn: s.completedOn || '',
    createdAt: s.createdAt || '',
    updatedAt: s.updatedAt || '',
    stages: stages,
    spoc: s.spoc || null,
    documents: s.documents || []
  };
}

export const serviceService = {
  async getServices() {
    return Promise.resolve(dataStore.getServices().map(normalizeService));
  },

  async getServicesByClientId(clientId) {
    if (CONFIG.isLiveEndpointConfigured()) {
      if (!authState.isAdmin()) {
        const res = await apiClient.post('getClientServices');
        if (res.success && Array.isArray(res.data)) {
          return res.data.map(normalizeService);
        }
        throw new Error(res.error?.message || 'Failed to load services from server.');
      } else if (clientId) {
        const res = await apiClient.post('adminGetClient', { client_id: clientId });
        if (res.success && res.data?.services) {
          return res.data.services.map(normalizeService);
        }
        throw new Error(res.error?.message || 'Failed to load client services from server.');
      }
    }

    if (!authState.isAdmin()) {
      try {
        const res = await apiClient.post('getClientServices');
        if (res.success && Array.isArray(res.data)) {
          return res.data.map(normalizeService);
        }
      } catch (e) {}
    } else if (clientId) {
      try {
        const res = await apiClient.post('adminGetClient', { client_id: clientId });
        if (res.success && res.data?.services) {
          return res.data.services.map(normalizeService);
        }
      } catch (e) {}
    }
    return Promise.resolve(dataStore.getServicesByClientId(clientId).map(normalizeService));
  },

  async getServiceDetails(serviceId) {
    if (CONFIG.isLiveEndpointConfigured()) {
      const isAdmin = authState.isAdmin();
      const action = isAdmin ? 'adminGetService' : 'getClientService';
      const res = await apiClient.post(action, { service_id: serviceId });
      if (res.success && res.data) {
        const d = res.data;
        const normService = normalizeService(d.service);
        normService.stages = (d.stages || []).map((st, idx) => ({
          id: st.stageId || st.id || `stg_${idx}`,
          stageId: st.stageId || st.id || `stg_${idx}`,
          name: st.stageName || st.name || '',
          stageName: st.stageName || st.name || '',
          status: st.stageStatus || st.status || 'Pending',
          stageStatus: st.stageStatus || st.status || 'Pending',
          completedOn: st.completedOn || '',
          description: st.description || '',
          sequenceOrder: st.sequenceOrder !== undefined ? st.sequenceOrder : idx + 1
        }));
        normService.spoc = d.spoc || null;

        return {
          service: normService,
          client: d.client || null,
          spoc: d.spoc || (normService.spocId ? dataStore.getSpocById(normService.spocId) : null),
          stages: normService.stages,
          stageHistory: d.stageHistory || []
        };
      }
      throw new Error(res.error?.message || 'Failed to load service details from server.');
    }

    const isAdmin = authState.isAdmin();
    const action = isAdmin ? 'adminGetService' : 'getClientService';

    try {
      const res = await apiClient.post(action, { service_id: serviceId });
      if (res.success && res.data) {
        const d = res.data;
        const normService = normalizeService(d.service);
        normService.stages = (d.stages || []).map((st, idx) => ({
          id: st.stageId || st.id || `stg_${idx}`,
          stageId: st.stageId || st.id || `stg_${idx}`,
          name: st.stageName || st.name || '',
          stageName: st.stageName || st.name || '',
          status: st.stageStatus || st.status || 'Pending',
          stageStatus: st.stageStatus || st.status || 'Pending',
          completedOn: st.completedOn || '',
          description: st.description || '',
          sequenceOrder: st.sequenceOrder !== undefined ? st.sequenceOrder : idx + 1
        }));
        normService.spoc = d.spoc || null;

        return {
          service: normService,
          client: d.client || dataStore.getClientById(normService.clientId),
          spoc: d.spoc || (normService.spocId ? dataStore.getSpocById(normService.spocId) : null),
          stages: normService.stages,
          stageHistory: d.stageHistory || []
        };
      }
    } catch (e) {}

    const service = dataStore.getServiceById(serviceId);
    if (!service) return Promise.resolve(null);

    const client = dataStore.getClientById(service.clientId);
    const spoc = dataStore.getSpocById(service.spocId);

    return Promise.resolve({
      service: normalizeService(service),
      client,
      spoc,
      stages: service.stages || [],
      stageHistory: []
    });
  },

  addServiceToClient(clientId, serviceData) {
    const result = dataStore.addServiceToClient(clientId, serviceData);
    return Promise.resolve(result);
  },

  async updateServiceStage(serviceId, stageIndex, remarks = '') {
    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('adminUpdateServiceStage', {
        service_id: serviceId,
        stage_index: stageIndex,
        remarks: remarks || 'Stage updated via Operations Console'
      });
      if (res.success) {
        dataStore.updateServiceStage(serviceId, stageIndex);
        return res;
      }
      throw new Error(res.error?.message || 'Failed to update service stage on server.');
    }

    dataStore.updateServiceStage(serviceId, stageIndex);
    return { success: true };
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
