/**
 * Legal Sthal - Client Service Details View
 */

import { serviceService } from '../../services/serviceService.js';
import { documentService } from '../../services/documentService.js';
import { renderStatusBadge, renderTimeline, renderQRDocCard, renderSpocCard, icons } from '../../ui/components.js';
import { modal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

export async function renderClientServiceDetail(serviceId) {
  const data = await serviceService.getServiceDetails(serviceId);
  if (!data || !data.service) {
    return `
      <div class="empty-state">
        <h3>Service Not Found</h3>
        <p>The requested service ID "${serviceId}" does not exist or has been removed.</p>
        <a href="#client/services" class="btn btn-primary">Back to My Services</a>
      </div>
    `;
  }

  const { service, client, spoc } = data;
  const isCompleted = service.status === 'Completed' || service.progressPercentage >= 100;

  return `
    <div class="page-header">
      <div>
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.35rem;">
          <a href="#client/services" style="color: var(--text-muted); font-weight: 500; font-size: 0.875rem;">← Back to Services</a>
          <span style="color: var(--text-light);">|</span>
          <span style="font-size: 0.8125rem; color: var(--text-muted); font-weight: 600; background-color: var(--bg-app); padding: 0.15rem 0.5rem; border-radius: 4px;">ID: ${service.serviceCode}</span>
        </div>
        <h1 class="page-title">${service.serviceType}</h1>
        <p class="page-subtitle">${service.companyType} • State: ${service.state} • Client: ${client ? client.companyName : ''}</p>
      </div>

      <div class="page-actions">
        ${renderStatusBadge(service.status)}
      </div>
    </div>

    <!-- Celebration State if 100% Complete -->
    ${isCompleted ? `
      <div class="celebration-banner">
        <div class="celebration-icon">${icons.check}</div>
        <h2 class="celebration-title">Congratulations!</h2>
        <p class="celebration-sub">
          <strong>${client ? client.companyName : 'Your Business'}</strong> has successfully completed ${service.serviceType}.
          All government filings, certificates, and compliance procedures have been completed.
        </p>
        <div class="celebration-actions">
          <button class="btn btn-success btn-lg js-download-certificate" data-service-type="${service.serviceType}">
            ${icons.download} Download Official Certificate
          </button>
        </div>
      </div>
    ` : ''}

    <div class="grid-3" style="align-items: start;">
      <!-- Left 2 Columns: Timeline & Documents -->
      <div style="grid-column: span 2;">
        
        <!-- Interactive Service Stage Timeline Card -->
        <div class="card" style="margin-bottom: 2rem;">
          <div class="card-header">
            <h3 class="card-title">${icons.sync} Operational Service Stage Timeline</h3>
            <span style="font-size: 0.8125rem; font-weight: 600; color: var(--primary-500);">
              Progress: ${service.progressPercentage}%
            </span>
          </div>
          <div class="card-body">
            ${renderTimeline(service.stages, service.currentStageIndex)}
          </div>
        </div>

        <!-- Document QR Code & Google Form Submission Card -->
        ${renderQRDocCard(service.id, service.documents)}

        <!-- Document Status & Verification Workspace -->
        <div class="card" style="margin-bottom: 2rem;">
          <div class="card-header">
            <h3 class="card-title">${icons.documents} Service Documents Status</h3>
            <button class="btn btn-outline btn-sm js-open-google-form" data-service-id="${service.id}">
              ${icons.plus} Submit Document via Form
            </button>
          </div>
          <div class="card-body" style="padding: 0;">
            <div class="table-container" style="border: none;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Submitted On</th>
                    <th>Status</th>
                    <th>Action / Reason</th>
                  </tr>
                </thead>
                <tbody>
                  ${(service.documents || []).map(doc => {
                    return `
                      <tr>
                        <td style="font-weight: 600;">
                          ${doc.name}
                          ${doc.required ? '<span style="color: var(--error-main);">*</span>' : ''}
                        </td>
                        <td>${doc.submittedOn || '<span style="color: var(--text-light);">Not submitted</span>'}</td>
                        <td>${renderStatusBadge(doc.status)}</td>
                        <td>
                          ${doc.status === 'Rejected' ? `
                            <div style="color: var(--error-main); font-size: 0.8125rem; margin-bottom: 0.35rem;">
                              <strong>Reason:</strong> ${doc.rejectionReason}
                            </div>
                            <button class="btn btn-danger btn-sm js-resubmit-doc" data-doc-name="${doc.name}" data-service-id="${service.id}">
                              Resubmit Document
                            </button>
                          ` : doc.status === 'Verified' ? `
                            <span style="color: var(--success-main); font-size: 0.8125rem; font-weight: 600;">✓ Verified by Legal Sthal</span>
                          ` : `
                            <button class="btn btn-secondary btn-sm js-open-google-form" data-service-id="${service.id}" data-doc-name="${doc.name}">
                              Submit via Google Form
                            </button>
                          `}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      <!-- Right Column: Financials & Assigned SPOC Card -->
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        
        <!-- Assigned SPOC Card -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${icons.profile} Assigned Legal Specialist</h3>
          </div>
          <div class="card-body">
            ${renderSpocCard(spoc)}
          </div>
        </div>

        <!-- Payment Summary Card -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${icons.payments} Payment Summary</h3>
          </div>
          <div class="card-body">
            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.9375rem;">
                <span style="color: var(--text-muted);">Total Service Fee:</span>
                <strong style="color: var(--text-main);">₹${service.totalAmount.toLocaleString('en-IN')}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.9375rem;">
                <span style="color: var(--text-muted);">Amount Paid:</span>
                <strong style="color: var(--success-main);">₹${service.paidAmount.toLocaleString('en-IN')}</strong>
              </div>
              <div style="border-top: 1px solid var(--divider); padding-top: 0.85rem; display: flex; justify-content: space-between; font-size: 1.05rem;">
                <span style="font-weight: 600; color: var(--text-main);">Remaining Balance:</span>
                <strong style="color: ${service.remainingAmount > 0 ? 'var(--error-main)' : 'var(--success-main)'}; font-weight: 700;">
                  ₹${service.remainingAmount.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Payment Transaction History -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Payment Receipts</h3>
          </div>
          <div class="card-body" style="padding: 0;">
            <div class="table-container" style="border: none;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${(service.payments || []).map(p => `
                    <tr>
                      <td style="font-size: 0.8125rem;">${p.date}</td>
                      <td style="font-weight: 500;">${p.description}</td>
                      <td style="font-weight: 700; color: var(--success-main);">₹${p.amount.toLocaleString('en-IN')}</td>
                      <td>${renderStatusBadge(p.status)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}

export function bindClientServiceDetailEvents() {
  // Mock Google Form submission modal
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.js-open-google-form, .js-resubmit-doc');
    if (btn) {
      const serviceId = btn.dataset.serviceId;
      const prefillDocName = btn.dataset.docName || 'PAN & Aadhaar Card';

      modal.open({
        title: 'Legal Sthal Google Form Document Submission',
        bodyHtml: `
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <div style="width: 50px; height: 50px; background-color: var(--primary-50); border-radius: 50%; color: var(--primary-500); display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem auto;">
              ${icons.documents}
            </div>
            <h3 style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 700;">Legal Sthal Secure Document Collector</h3>
            <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.25rem;">
              Simulating external Google Form upload for Service ID: <strong>${serviceId}</strong>
            </p>
          </div>

          <form id="mock-google-form">
            <div class="form-group">
              <label class="form-label">Select Document Category</label>
              <select id="gf-doc-name" class="form-control" required>
                <option value="PAN Card of Directors" ${prefillDocName.includes('PAN') ? 'selected' : ''}>PAN Card of Directors</option>
                <option value="Aadhaar Card of Directors" ${prefillDocName.includes('Aadhaar') ? 'selected' : ''}>Aadhaar Card of Directors</option>
                <option value="Address Proof (Bank Statement / Utility Bill)" ${prefillDocName.includes('Address') ? 'selected' : ''}>Address Proof (Bank Statement / Utility Bill)</option>
                <option value="Passport Size Photograph" ${prefillDocName.includes('Photo') ? 'selected' : ''}>Passport Size Photograph</option>
                <option value="DIR-2 Consent Form & Utility NOC">DIR-2 Consent Form & Utility NOC</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Upload File (PDF / JPG / PNG)</label>
              <input type="file" class="form-control" id="gf-file" required />
              <div class="form-hint">Max file size 10MB per document.</div>
            </div>

            <div class="form-group">
              <label class="form-label">Additional Notes for Legal Sthal Team</label>
              <textarea class="form-control" rows="2" placeholder="e.g. Clean scanned copy of utility bill dated September 2026."></textarea>
            </div>
          </form>
        `,
        footerHtml: `
          <button class="btn btn-secondary js-modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="submit-google-form-btn">${icons.check} Submit Document</button>
        `,
        onOpen: () => {
          document.querySelector('.js-modal-cancel').onclick = () => modal.close();
          document.getElementById('submit-google-form-btn').onclick = async () => {
            const docName = document.getElementById('gf-doc-name').value;
            const submitBtn = document.getElementById('submit-google-form-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            await documentService.submitDocument(serviceId, docName);
            toast.success('Document Submitted', `Your '${docName}' has been submitted and is now Under Review.`);
            modal.close();
            window.location.reload();
          };
        }
      });
    }

    const downloadBtn = e.target.closest('.js-download-certificate');
    if (downloadBtn) {
      toast.success('Downloading Certificate', `Official Certificate for ${downloadBtn.dataset.serviceType} has been downloaded.`);
    }
  });
}
