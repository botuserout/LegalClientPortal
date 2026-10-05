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
      const res = await apiClient.post('getClientProfile');
      if (res.success && res.data) {
        return normalizeClient(res.data);
      }
      throw new Error(res.error?.message || 'Failed to load client profile from server.');
    }

    const user = authState.getUser();
    if (user && user.clientId) {
      return normalizeClient(dataStore.getClientById(user.clientId));
    }
    return normalizeClient(dataStore.getClients()[0]);
  },

  /**
   * Retrieves aggregated dashboard data for the authenticated client.
   */
  async getClientDashboard(clientId) {
    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('getClientDashboard');
      if (res.success && res.data) {
        const d = res.data;
        return {
          client: normalizeClient(d.client),
          metrics: {
            activeServices: d.metrics?.activeServices || 0,
            completedServices: d.metrics?.completedServices || 0,
            pendingDocsCount: d.metrics?.pendingDocsCount || 0,
            totalDueAmount: d.metrics?.remainingAmount || 0,
            totalAmount: d.metrics?.totalAmount || 0,
            paidAmount: d.metrics?.paidAmount || 0,
            dscCount: d.metrics?.dscCount || 0,
            unreadNotifications: d.metrics?.unreadNotifications || 0
          },
          services: (d.services || []).map(normalizeService),
          notifications: d.notifications || [],
          spoc: d.spoc || null
        };
      }
      throw new Error(res.error?.message || 'Failed to load client dashboard from server.');
    }

    // Fallback to local dataStore in mock mode
    const resolvedId = clientId || (authState.getUser()?.clientId) || 'CL001';
    const client = dataStore.getClientById(resolvedId);
    const services = dataStore.getServicesByClientId(resolvedId);

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

    return {
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
  },

  /**
   * Retrieves all services belonging to the authenticated client.
   */
  async getClientServices() {
    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('getClientServices');
      if (res.success && Array.isArray(res.data)) {
        return res.data.map(normalizeService);
      }
      throw new Error(res.error?.message || 'Failed to load client services from server.');
    }

    const user = authState.getUser();
    const resolvedId = user?.clientId || 'CL001';
    return dataStore.getServicesByClientId(resolvedId).map(normalizeService);
  },

  /**
   * Retrieves single service details with IDOR validation.
   */
  async getClientService(serviceId) {
    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('getClientService', { service_id: serviceId });
      if (res.success && res.data) {
        return {
          service: normalizeService(res.data.service),
          stages: res.data.stages || [],
          stageHistory: res.data.stageHistory || [],
          spoc: res.data.spoc || null
        };
      }
      throw new Error(res.error?.message || 'Failed to load service details from server.');
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
      const res = await apiClient.post('getClientNotifications');
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      throw new Error(res.error?.message || 'Failed to load notifications from server.');
    }
    return [];
  },

  /**
   * Marks a notification as read.
   */
  async markNotificationRead(notificationId) {
    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('markNotificationRead', { notification_id: notificationId });
      if (res.success) return res;
      throw new Error(res.error?.message || 'Failed to mark notification as read on server.');
    }
    return { success: true };
  },

  /**
   * Directory access for admin portal.
   */
  async getClients() {
    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('adminGetClients');
      if (res.success && Array.isArray(res.data)) {
        return res.data.map(normalizeClient);
      }
      throw new Error(res.error?.message || 'Failed to load clients from server.');
    }
    if (authState.isAdmin()) {
      try {
        const res = await apiClient.post('adminGetClients');
        if (res.success && Array.isArray(res.data)) {
          return res.data.map(normalizeClient);
        }
      } catch (e) {}
    }
    return dataStore.getClients().map(normalizeClient);
  },

  /**
   * Retrieve client by ID (admin or self).
   */
  async getClientById(id) {
    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('adminGetClient', { client_id: id });
      if (res.success && res.data?.client) {
        return normalizeClient(res.data.client);
      }
      throw new Error(res.error?.message || 'Failed to load client details from server.');
    }
    if (authState.isAdmin()) {
      try {
        const res = await apiClient.post('adminGetClient', { client_id: id });
        if (res.success && res.data?.client) {
          return normalizeClient(res.data.client);
        }
      } catch (e) {}
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
