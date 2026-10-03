/**
 * Legal Sthal - SpocService (spocService.js)
 * Version: 2.0.0 (Step 5 Core Data Layer)
 * 
 * Provides API abstraction for dedicated SPOC management with live backend integration.
 */

import { apiClient } from './apiClient.js';
import { dataStore } from './dataStore.js';

export const spocService = {
  async getSpocs() {
    try {
      const res = await apiClient.post('adminGetSpocs');
      if (res.success && Array.isArray(res.data)) {
        return res.data.map(s => ({
          id: s.spocId || s.id,
          spocId: s.spocId || s.id,
          name: s.name,
          title: s.title || s.designation || '',
          mobile: s.mobile || s.phone || '',
          phone: s.phone || s.mobile || '',
          email: s.email,
          status: s.status || 'Active',
          avatarUrl: s.avatarUrl || ''
        }));
      }
    } catch (e) {}
    return Promise.resolve(dataStore.getSpocs());
  },

  getSpocById(id) {
    return Promise.resolve(dataStore.getSpocById(id));
  },

  async assignSpoc(serviceId, spocId) {
    dataStore.assignSpoc(serviceId, spocId);
    try {
      const res = await apiClient.post('adminAssignSpoc', {
        service_id: serviceId,
        spoc_id: spocId
      });
      return res;
    } catch (e) {
      return { success: true };
    }
  }
};
