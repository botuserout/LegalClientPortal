/**
 * Legal Sthal - ClientService (clientService.js)
 * Version: 2.0.0 (Step 5 Core Data Layer)
 * 
 * Provides authenticated API calls for the Client Portal,
 * with strict server-side IDOR derivation and seamless local fallback.
 */

import { apiClient } from './apiClient.js';
import { authState } from '../state/authState.js';
import { dataStore } from './dataStore.js';
import { CONFIG } from '../config.js';

function normalizeClient(c) {
  if (!c) return null;
  return {
    id: c.clientId || c.id || '',
    clientId: c.clientId || c.id || '',
    name: c.name || c.companyName || '',
    companyName: c.companyName || c.name || '',
    contactPerson: c.contactPerson || c.contactName || '',
    email: c.email || '',
    mobile: c.mobile || c.phone || '',
    phone: c.phone || c.mobile || '',
    state: c.state || '',
    address: c.address || '',
    gstin: c.gstin || '',
    status: c.status || 'Active',
    createdAt: c.createdAt || '',
    updatedAt: c.updatedAt || '',
    servicesCount: c.servicesCount || 0,
    totalAmount: c.totalAmount || 0,
    paidAmount: c.paidAmount || 0,
    remainingAmount: c.remainingAmount || 0
  };
}

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

export const clientService = {
  /**
   * Retrieves profile information for the authenticated client.
   */
  async getClientProfile() {
    if (CONFIG.isLiveEndpointConfigured()) {
      try {
        const res = await apiClient.post('getClientProfile');
        if (res && res.success && res.data) {
          return normalizeClient(res.data);
        }
      } catch (err) {
        console.warn('getClientProfile unavailable, using local store:', err);
      }
    }

    const user = authState.getUser();
    if (user && user.clientId) {
      return normalizeClient(dataStore.getClientById(user.clientId));
    }
    const firstClient = dataStore.getClients()[0];
    return firstClient ? normalizeClient(firstClient) : null;
  },

  /**
   * Retrieves aggregated dashboard data for the authenticated client.
   */
  async getClientDashboard(clientId) {
    const resolvedId = clientId || (authState.getUser()?.clientId) || (authState.getUser()?.userId) || null;
    const client = resolvedId ? dataStore.getClientById(resolvedId) : null;
    const services = resolvedId ? dataStore.getServicesByClientId(resolvedId) : [];

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

    const instantResult = {
      client: normalizeClient(client),
      services: services.map(normalizeService),
      metrics: {
        activeServices,
        completedServices,
        pendingDocsCount,
        totalDueAmount
      },
      notifications: [],
      spoc: dataStore.getSpocs()[0] || null
    };

    // Non-blocking background sync with live backend
    if (CONFIG.isLiveEndpointConfigured()) {
      apiClient.post('getClientDashboard').then(res => {
        if (res.success && res.data && res.data.client) {
          dataStore.updateClient(res.data.client.clientId, res.data.client);
        }
      }).catch(() => {});
    }

    return instantResult;
  },

  /**
   * Retrieves all services belonging to the authenticated client.
   */
  async getClientServices() {
    const user = authState.getUser();
    const resolvedId = user?.clientId || user?.userId || null;
    const instantServices = resolvedId ? dataStore.getServicesByClientId(resolvedId).map(normalizeService) : [];

    if (CONFIG.isLiveEndpointConfigured()) {
      apiClient.post('getClientServices').catch(() => {});
    }

    return instantServices;
  },

  /**
   * Retrieves single service details with IDOR validation.
   */
  async getClientService(serviceId) {
    if (CONFIG.isLiveEndpointConfigured()) {
      try {
        const res = await apiClient.post('getClientService', { service_id: serviceId });
        if (res.success && res.data) {
          return {
            service: normalizeService(res.data.service),
            stages: res.data.stages || [],
            stageHistory: res.data.stageHistory || [],
            spoc: res.data.spoc || null
          };
        }
      } catch (err) {
        console.warn('Service detail network request delayed, using local store:', err);
      }
    }

    const s = dataStore.getServiceById(serviceId);
    if (!s) return null;
    return {
      service: normalizeService(s),
      stages: s.stages || [],
      stageHistory: [],
      spoc: dataStore.getSpocById(s.spocId)
    };
  },

  /**
   * Retrieves client's notifications.
   */
  async getClientNotifications() {
    if (CONFIG.isLiveEndpointConfigured()) {
      try {
        const res = await apiClient.post('getClientNotifications');
        if (res && res.success && Array.isArray(res.data)) {
          return res.data;
        }
      } catch (err) {
        console.warn('getClientNotifications unavailable, using local store:', err);
      }
    }
    return (dataStore.getNotifications() || []).map(normalizeNotification);
  },

  /**
   * Marks a notification as read.
   */
  async markNotificationRead(notificationId) {
    if (CONFIG.isLiveEndpointConfigured()) {
      try {
        const res = await apiClient.post('markNotificationRead', { notification_id: notificationId });
        if (res && res.success) return res;
      } catch (e) {}
    }
    return { success: true };
  },

  /**
   * Directory access for admin portal.
   */
  async getClients() {
    if (CONFIG.isLiveEndpointConfigured()) {
      try {
        const res = await apiClient.post('adminGetClients');
        if (res && res.success && Array.isArray(res.data)) {
          return res.data.map(normalizeClient);
        }
      } catch (err) {
        console.warn('adminGetClients unavailable, using local store:', err);
      }
    }
    return dataStore.getClients().map(normalizeClient);
  },

  /**
   * Retrieve client by ID (admin or self).
   */
  async getClientById(id) {
    if (CONFIG.isLiveEndpointConfigured()) {
      try {
        const res = await apiClient.post('adminGetClient', { client_id: id });
        if (res && res.success && res.data?.client) {
          return normalizeClient(res.data.client);
        }
      } catch (err) {
        console.warn('adminGetClient unavailable, using local store:', err);
      }
    }
    return normalizeClient(dataStore.getClientById(id));
  },

  async createClient(clientData) {
    if (CONFIG.isLiveEndpointConfigured()) {
      const payload = {
        action: 'createClient',
        clientData: clientData,
        companyName: clientData.companyName || clientData.name,
        contactPerson: clientData.contactPerson || clientData.contactName,
        email: clientData.email,
        mobile: clientData.phone || clientData.mobile,
        state: clientData.state,
        serviceType: clientData.serviceType,
        companyType: clientData.companyType,
        totalAmount: clientData.totalAmount,
        paidAmount: clientData.paidAmount,
        spocId: clientData.spocId,
        password: clientData.password || 'password123'
      };
      const res = await apiClient.post('createClient', payload);
      if (res.success) {
        dataStore.createClient({
          ...clientData,
          id: res.client?.id || clientData.id
        });
        return {
          success: true,
          client: normalizeClient(res.client || clientData),
          service: res.service,
          message: res.message || 'Client created successfully!'
        };
      }
      throw new Error(res.error?.message || res.message || 'Failed to create client on server.');
    }

    const result = dataStore.createClient(clientData);
    return Promise.resolve(result);
  },

  updateClient(id, updates) {
    const client = dataStore.getClientById(id);
    if (client) {
      Object.assign(client, updates);
      dataStore.saveData();
      return Promise.resolve({ success: true, client: normalizeClient(client) });
    }
    return Promise.resolve({ success: false, message: 'Client not found' });
  }
};
