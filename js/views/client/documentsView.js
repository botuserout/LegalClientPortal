/**
 * Legal Sthal - Client Documents View
 */

import { documentService } from '../../services/documentService.js';
import { serviceService } from '../../services/serviceService.js';
import { authService } from '../../services/authService.js';
import { renderStatusBadge, renderQRDocCard, icons } from '../../ui/components.js';

export async function renderClientDocuments() {
  const user = authService.getCurrentUser();
  const clientId = user ? (user.clientId || user.userId) : null;

  const services = clientId ? await serviceService.getServicesByClientId(clientId) : [];
  const allDocs = [];

  services.forEach(srv => {
    (srv.documents || []).forEach(doc => {
      allDocs.push({
        ...doc,
        serviceId: srv.id,
        serviceCode: srv.serviceCode,
        serviceType: srv.serviceType
      });
    });
  });

  const primaryServiceId = services.length > 0 ? services[0].id : '';

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">My Documents</h1>
        <p class="page-subtitle">View verification status and submit required files for all your Legal Sthal services.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary js-open-google-form" data-service-id="${primaryServiceId}">
          ${icons.plus} Submit Document via QR / Form
        </button>
      </div>
    </div>

    <!-- Quick Document QR Submission Card -->
    ${renderQRDocCard(primaryServiceId, allDocs)}

    <!-- Documents Master Table -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">${icons.documents} All Service Documents</h3>
        <span class="badge badge-info">${allDocs.length} Documents Tracked</span>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-container" style="border: none;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Document Name</th>
                <th>Submitted On</th>
                <th>Status</th>
                <th>Action / Remark</th>
              </tr>
            </thead>
            <tbody>
              ${allDocs.length === 0 ? `
                <tr>
                  <td colspan="5" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">📂</div>
                    <div style="font-weight: 700; margin-bottom: 0.25rem; color: #f8fafc;">No documents required</div>
                    <div style="font-size: 0.8125rem;">Required identity and compliance documents will appear here once you enroll in a service.</div>
                  </td>
                </tr>
              ` : allDocs.map(doc => `
                <tr>
                  <td>
                    <a href="#client/services/${doc.serviceId}" style="font-weight: 600;">
                      ${doc.serviceType} (${doc.serviceCode})
                    </a>
                  </td>
                  <td style="font-weight: 600;">${doc.name}</td>
                  <td>${doc.submittedOn || '<span style="color: var(--text-light);">Pending</span>'}</td>
                  <td>${renderStatusBadge(doc.status)}</td>
                  <td>
                    ${doc.status === 'Rejected' ? `
                      <div style="color: var(--error-main); font-size: 0.8125rem; margin-bottom: 0.25rem;">
                        <strong>Rejection Reason:</strong> ${doc.rejectionReason}
                      </div>
                      <button class="btn btn-danger btn-sm js-resubmit-doc" data-service-id="${doc.serviceId}" data-doc-name="${doc.name}">
                        Resubmit
                      </button>
                    ` : doc.status === 'Verified' ? `
                      <span style="color: var(--success-main); font-size: 0.8125rem; font-weight: 600;">✓ Verified</span>
                    ` : `
                      <button class="btn btn-secondary btn-sm js-open-google-form" data-service-id="${doc.serviceId}" data-doc-name="${doc.name}">
                        Submit Copy
                      </button>
                    `}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
