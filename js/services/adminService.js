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
      try {
        const res = await apiClient.post('adminGetDashboard');
        if (res && res.success && res.data) {
          const d = res.data;
          return {
            metrics: {
              totalClients: d.totalClients || 0,
              activeClients: d.totalClients || 0,
              totalServices: (d.activeServices || 0) + (d.completedServices || 0),
              activeServices: d.activeServices || 0,
              completedServices: d.completedServices || 0,
              pendingDocsCount: d.pendingDocs || 0,
              rejectedDocsCount: d.rejectedDocs || 0,
              pendingQuotesCount: d.totalQuotes || 0,
              totalPending: d.totalPending || 0
            },
            recentClients: (d.recentClients || []).map(c => ({
              id: c.clientId || c.id,
              clientId: c.clientId || c.id,
              companyName: c.companyName || c.name,
              name: c.companyName || c.name,
              contactPerson: c.contactPerson || c.contactName,
              email: c.email,
              mobile: c.mobile,
              state: c.state,
              status: c.status
            })),
            recentServices: d.recentServices || []
          };
        }
      } catch (err) {
        console.warn('Live adminGetDashboard error, falling back:', err);
      }
    }

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

    return instantMetrics;
  },

  /**
   * Retrieves clients for the admin directory with search and filter.
   */
  async getClients(searchQuery = '', statusFilter = '') {
    if (CONFIG.isLiveEndpointConfigured()) {
      try {
        const res = await apiClient.post('adminGetClients', {
          search: searchQuery,
          status: statusFilter
        });
        if (res && res.success && Array.isArray(res.data)) {
          let list = res.data;
          if (statusFilter && statusFilter !== 'ALL') {
            list = list.filter(c => (c.status || '').toLowerCase() === statusFilter.toLowerCase());
          }
          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(c =>
              (c.id && c.id.toLowerCase().includes(q)) ||
              (c.companyName && c.companyName.toLowerCase().includes(q)) ||
              (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
              (c.email && c.email.toLowerCase().includes(q))
            );
          }
          return list;
        }
      } catch (err) {
        console.warn('Live adminGetClients error, falling back:', err);
      }
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
      const res = await apiClient.post('adminUpdateServiceStage', {
        service_id: serviceId,
        stage_index: stageIndex,
        remarks: remarks || 'Stage updated via Operations Console'
      });
      if (!res || !res.success) {
        throw new Error(res?.error?.message || 'Failed to update service stage on server.');
      }
    }

    return { success: true, message: 'Updated successfully.' };
  },

  /**
   * Assigns a dedicated SPOC to a client service.
   */
  async assignSpoc(serviceId, spocId) {
    dataStore.assignSpoc(serviceId, spocId);

    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('adminAssignSpoc', {
        service_id: serviceId,
        spoc_id: spocId
      });
      if (!res || !res.success) {
        throw new Error(res?.error?.message || 'Failed to assign SPOC on server.');
      }
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
