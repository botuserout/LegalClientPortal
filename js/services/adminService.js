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

    const instantMetrics = {
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

    if (CONFIG.isLiveEndpointConfigured()) {
      apiClient.post('adminGetDashboard').catch(() => {});
    }

    return instantMetrics;
  },

  /**
   * Retrieves clients for the admin directory with search and filter.
   */
  async getClients(searchQuery = '', statusFilter = '') {
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

    if (CONFIG.isLiveEndpointConfigured()) {
      apiClient.post('adminGetClients', {
        search: searchQuery,
        status: statusFilter
      }).catch(() => {});
    }

    return clients;
  },

  /**
   * Retrieves full profile and associated services for a specific client.
   */
  async getClient(clientId) {
    if (CONFIG.isLiveEndpointConfigured()) {
      try {
        const res = await apiClient.post('adminGetClient', { client_id: clientId });
        if (res && res.success && res.data) {
          return res.data;
        }
      } catch (err) {
        console.warn('adminGetClient unavailable, using local store:', err);
      }
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
      try {
        const res = await apiClient.post('adminGetService', { service_id: serviceId });
        if (res && res.success && res.data) {
          return res.data;
        }
      } catch (err) {
        console.warn('adminGetService unavailable, using local store:', err);
      }
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
    dataStore.updateServiceStage(serviceId, stageIndex);

    if (CONFIG.isLiveEndpointConfigured()) {
      try {
        await apiClient.post('adminUpdateServiceStage', {
          service_id: serviceId,
          stage_index: stageIndex,
          remarks: remarks || 'Stage updated via Operations Console'
        });
      } catch (e) {}
    }

    return { success: true, message: 'Updated successfully.' };
  },

  /**
   * Assigns a dedicated SPOC to a client service.
   */
  async assignSpoc(serviceId, spocId) {
    dataStore.assignSpoc(serviceId, spocId);

    if (CONFIG.isLiveEndpointConfigured()) {
      try {
        await apiClient.post('adminAssignSpoc', {
          service_id: serviceId,
          spoc_id: spocId
        });
      } catch (e) {}
    }

    return { success: true, message: 'Assigned successfully.' };
  },

  /**
   * Retrieves all available SPOC records.
   */
  async getSpocs() {
    if (CONFIG.isLiveEndpointConfigured()) {
      try {
        const res = await apiClient.post('adminGetSpocs');
        if (res && res.success && Array.isArray(res.data)) {
          return res.data;
        }
      } catch (err) {
        console.warn('adminGetSpocs unavailable, using local store:', err);
      }
    }
    return dataStore.getSpocs();
  }
};
