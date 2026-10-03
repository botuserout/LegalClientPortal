/**
 * Legal Sthal - Admin Service (adminService.js)
 * Version: 2.0.0 (Step 5 Core Data Layer)
 * 
 * Provides API client calls for the Operations Console (Admin Portal),
 * including dashboard metrics, client directory, service workflows,
 * stage advances, and dedicated SPOC assignments.
 */

import { apiClient } from './apiClient.js';
import { dataStore } from './dataStore.js';
import { CONFIG } from '../config.js';

export const adminService = {
  /**
   * Retrieves administrative overview dashboard metrics and recent activity.
   */
  async getDashboard() {
    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('adminGetDashboard');
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(res.error?.message || 'Failed to load admin dashboard from server.');
    }

    // Local fallback calculation
    const clients = dataStore.getClients();
    const services = dataStore.getServices();
    const activeClients = clients.filter(c => c.status === 'Active').length;
    const activeServices = services.filter(s => s.status !== 'Completed').length;
    const completedServices = services.filter(s => s.status === 'Completed').length;

    let totalRevenue = 0;
    let totalCollected = 0;
    services.forEach(s => {
      totalRevenue += (s.totalAmount || 0);
      totalCollected += (s.paidAmount || 0);
    });

    return {
      metrics: {
        totalClients: clients.length,
        activeClients: activeClients,
        totalServices: services.length,
        activeServices: activeServices,
        completedServices: completedServices,
        totalRevenue: totalRevenue,
        totalCollected: totalCollected,
        totalPending: totalRevenue - totalCollected
      },
      recentClients: clients.slice(-5).reverse(),
      recentServices: services.slice(-5).reverse()
    };
  },

  /**
   * Retrieves clients for the admin directory with search and filter.
   */
  async getClients(searchQuery = '', statusFilter = '') {
    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('adminGetClients', {
        search: searchQuery,
        status: statusFilter
      });
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      throw new Error(res.error?.message || 'Failed to load clients from server.');
    }

    let clients = dataStore.getClients();
    if (statusFilter && statusFilter !== 'ALL') {
      clients = clients.filter(c => c.status.toLowerCase() === statusFilter.toLowerCase());
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      clients = clients.filter(c =>
        (c.id && c.id.toLowerCase().includes(q)) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    }
    return clients;
  },

  /**
   * Retrieves full profile and associated services for a specific client.
   */
  async getClient(clientId) {
    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('adminGetClient', { client_id: clientId });
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(res.error?.message || 'Failed to load client from server.');
    }

    const client = dataStore.getClientById(clientId);
    const services = dataStore.getServicesByClientId(clientId);
    return { client, services };
  },

  /**
   * Retrieves full service details, workflow stages, and stage history.
   */
  async getService(serviceId) {
    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('adminGetService', { service_id: serviceId });
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(res.error?.message || 'Failed to load service from server.');
    }

    const service = dataStore.getServiceById(serviceId);
    if (!service) return null;
    const client = dataStore.getClientById(service.clientId);
    const spoc = dataStore.getSpocById(service.spocId);
    return {
      service,
      client,
      stages: service.stages || [],
      stageHistory: [],
      spoc
    };
  },

  /**
   * Advances/updates a service workflow stage with remarks and audit trail.
   */
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

    // Synchronize local dataStore for prototype mock mode
    dataStore.updateServiceStage(serviceId, stageIndex);
    return { success: true, message: 'Updated locally.' };
  },

  /**
   * Assigns a dedicated SPOC to a client service.
   */
  async assignSpoc(serviceId, spocId) {
    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('adminAssignSpoc', {
        service_id: serviceId,
        spoc_id: spocId
      });
      if (res.success) {
        dataStore.assignSpoc(serviceId, spocId);
        return res;
      }
      throw new Error(res.error?.message || 'Failed to assign SPOC on server.');
    }

    dataStore.assignSpoc(serviceId, spocId);
    return { success: true, message: 'Assigned locally.' };
  },

  /**
   * Retrieves all available SPOC records.
   */
  async getSpocs() {
    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('adminGetSpocs');
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      throw new Error(res.error?.message || 'Failed to load SPOCs from server.');
    }
    return dataStore.getSpocs();
  }
};
