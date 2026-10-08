/**
 * Legal Sthal - DocumentService (documentService.js)
 * Version: 2.1.0 (Step 6 Document Pipeline & Verification Core)
 * 
 * Provides API abstraction for document uploads, verification workflows,
 * dynamic QR code generation, and Google Forms integration with live backend & fallback.
 */

import { apiClient } from './apiClient.js';
import { authState } from '../state/authState.js';
import { dataStore } from './dataStore.js';
import { CONFIG } from '../config.js';

function normalizeDoc(d) {
  if (!d) return null;
  return {
    id: d.documentId || d.id || '',
    documentId: d.documentId || d.id || '',
    serviceId: d.serviceId || '',
    clientId: d.clientId || '',
    clientName: d.clientName || '',
    serviceCode: d.serviceCode || '',
    serviceType: d.serviceType || d.serviceName || '',
    name: d.documentName || d.name || '',
    documentName: d.documentName || d.name || '',
    documentType: d.documentType || 'KYC / Proof',
    formResponseId: d.formResponseId || '',
    fileName: d.fileName || '',
    fileUrl: d.fileUrl || '',
    driveFileId: d.driveFileId || '',
    status: d.status || 'Pending',
    rejectionReason: d.rejectionReason || '',
    required: d.required !== undefined ? d.required : true,
    submittedOn: d.submittedOn || d.uploadedAt || '',
    uploadedAt: d.uploadedAt || d.submittedOn || '',
    verifiedAt: d.verifiedAt || '',
    verifiedBy: d.verifiedBy || '',
    rejectedAt: d.rejectedAt || '',
    rejectedBy: d.rejectedBy || ''
  };
}

export const documentService = {
  /**
   * Retrieves all documents belonging to a specific service.
   */
  async getDocumentsByService(serviceId) {
    if (!serviceId) return [];

    const instantDocs = dataStore.getDocumentsByService(serviceId).map(normalizeDoc);

    if (CONFIG.isLiveEndpointConfigured()) {
      apiClient.post('getClientDocuments', { service_id: serviceId }).catch(() => {});
    }

    return instantDocs;
  },

  /**
   * Retrieves all documents (Admin sees all clients; Client sees their own portfolio).
   */
  async getAllDocuments() {
    const isAdmin = authState.isAdmin();
    const action = isAdmin ? 'adminGetDocuments' : 'getClientDocuments';
    const instantDocs = dataStore.getAllDocuments().map(normalizeDoc);

    if (CONFIG.isLiveEndpointConfigured()) {
      apiClient.post(action).catch(() => {});
    }

    return instantDocs;
  },

  /**
   * Verifies submitted document (Admin action).
   */
  async verifyDocument(serviceId, docId, remarks = '') {
    dataStore.verifyDocument(serviceId, docId);

    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('adminVerifyDocument', {
        document_id: docId,
        remarks: remarks || 'Verified by operations specialist'
      });
      if (!res || !res.success) {
        throw new Error(res?.error?.message || 'Failed to verify document on server.');
      }
    }

    return { success: true, message: 'Verified successfully.' };
  },

  /**
   * Rejects submitted document with detailed feedback (Admin action).
   */
  async rejectDocument(serviceId, docId, reason) {
    dataStore.rejectDocument(serviceId, docId, reason);

    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('adminRejectDocument', {
        document_id: docId,
        reason: reason || 'Document image is not legible. Please resubmit a clean copy.'
      });
      if (!res || !res.success) {
        throw new Error(res?.error?.message || 'Failed to reject document on server.');
      }
    }

    return { success: true, message: 'Rejected successfully.' };
  },

  /**
   * Uploads a document to Google Drive storage and registers under service.
   */
  async uploadDocument(serviceId, docName, docType = 'KYC / Proof', fileBase64 = null, mimeType = 'application/pdf', fileName = '') {
    dataStore.submitDocument(serviceId, docName);

    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('uploadDocument', {
        service_id: serviceId,
        document_name: docName,
        document_type: docType,
        file_base64: fileBase64,
        mime_type: mimeType,
        file_name: fileName
      });
      if (!res || !res.success) {
        throw new Error(res?.error?.message || 'Failed to upload document on server.');
      }
    }

    return { success: true, message: 'Submitted successfully.' };
  },

  /**
   * Alias for submitting document by name
   */
  async submitDocument(serviceId, docName) {
    return this.uploadDocument(serviceId, docName);
  },

  /**
   * Generates dynamic prefilled Google Form URL and QR code configuration for document intake.
   */
  async getFormSubmissionConfig(serviceId) {
    try {
      const res = await apiClient.post('getFormSubmissionConfig', { service_id: serviceId });
      if (res.success && res.data) {
        return res.data;
      }
    } catch (e) {}

    const baseUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSc_LegalSthal_DocCollection/viewform';
    const formUrl = `${baseUrl}?usp=pp_url&entry.1001=${encodeURIComponent(serviceId)}`;
    return {
      serviceId,
      formUrl,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(formUrl)}`
    };
  }
};
