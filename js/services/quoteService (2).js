/**
 * Legal Sthal - QuoteService (quoteService.js)
 * Version: 2.1.0 (Step 7 Quote Requests & Proposals Core)
 * 
 * API abstraction layer for quote requests, pricing proposals, and client inquiries
 * connecting Netlify SPA with Google Apps Script backend and offline dataStore fallback.
 */

import { apiClient } from './apiClient.js';
import { dataStore } from './dataStore.js';
import { CONFIG } from '../config.js';

function normalizeQuote(q) {
  if (!q) return null;
  return {
    id: q.requestId || q.id || q.request_id || '',
    requestId: q.requestId || q.id || q.request_id || '',
    clientId: q.clientId || q.client_id || '',
    clientName: q.clientName || q.client_name || '',
    serviceName: q.serviceName || q.service_name || '',
    companyType: q.companyType || q.company_type || '',
    state: q.state || '',
    mobile: q.mobile || q.phone || '',
    email: q.email || '',
    requestedOn: q.requestedOn || q.requested_on || '',
    status: q.status || 'Requested',
    quoteAmount: q.quoteAmount || q.quote_amount || '',
    remarks: q.remarks || '',
    timeline: q.timeline || [
      { stage: 'Requested', date: q.requestedOn || q.requested_on || 'Today' }
    ]
  };
}

export const quoteService = {
  /**
   * Retrieves all quote requests (admin operations view or filtered).
   */
  async getQuoteRequests(statusFilter = null) {
    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('getQuoteRequests', { status: statusFilter });
      if (res.success && Array.isArray(res.data)) {
        return res.data.map(normalizeQuote);
      }
      throw new Error(res.error?.message || 'Failed to load quote requests from server.');
    }

    const localQuotes = dataStore.getQuoteRequests() || [];
    if (statusFilter && statusFilter !== 'all') {
      return localQuotes.filter(q => q.status.toLowerCase() === statusFilter.toLowerCase()).map(normalizeQuote);
    }
    return localQuotes.map(normalizeQuote);
  },

  /**
   * Retrieves quote requests belonging to an authenticated client.
   */
  async getQuoteRequestsByClientId(clientId) {
    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('getClientQuoteRequests', { client_id: clientId });
      if (res.success && Array.isArray(res.data)) {
        return res.data.map(normalizeQuote);
      }
      throw new Error(res.error?.message || 'Failed to load client quote requests from server.');
    }

    return (dataStore.getQuoteRequestsByClientId(clientId) || []).map(normalizeQuote);
  },

  /**
   * Submits a new quote request from a client.
   */
  async createQuoteRequest(requestInfo) {
    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('createQuoteRequest', { quoteData: requestInfo });
      if (res.success && res.data) {
        return { success: true, quote: normalizeQuote(res.data), message: res.message };
      }
      throw new Error(res.error?.message || 'Failed to submit quote request to server.');
    }

    return dataStore.createQuoteRequest(requestInfo);
  },

  /**
   * Updates quote proposal status, amount, and reviewer remarks.
   */
  async updateQuoteStatus(quoteId, status, amount = null, remarks = null) {
    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('adminUpdateQuoteStatus', {
        quote_id: quoteId,
        quoteId: quoteId,
        status: status,
        amount: amount,
        quoteAmount: amount,
        remarks: remarks
      });
      if (res.success && res.data) {
        return { success: true, quote: normalizeQuote(res.data), message: res.message };
      }
      throw new Error(res.error?.message || 'Failed to update quote status on server.');
    }

    return dataStore.updateQuoteStatus(quoteId, status, amount, remarks);
  }
};
