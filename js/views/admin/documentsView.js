/**
 * Legal Sthal - Admin Document Verification Workspace
 */

import { documentService } from '../../services/documentService.js';
import { renderStatusBadge, icons } from '../../ui/components.js';
import { modal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

export async function renderAdminDocuments() {
  const docs = await documentService.getAllDocuments();

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Document Verification Workspace</h1>
        <p class="page-subtitle">Inspect submitted client KYC, identity, and business proof files.</p>
      </div>
    </div>

    <!-- Filter Tabs & Document Table -->
    <div class="card">
      <div class="card-header">
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;" id="doc-filter-tabs">
          <button class="btn btn-secondary btn-sm active js-doc-filter" data-filter="ALL">All Docs (${docs.length})</button>
          <button class="btn btn-secondary btn-sm js-doc-filter" data-filter="Under Review">Under Review</button>
          <button class="btn btn-secondary btn-sm js-doc-filter" data-filter="Pending">Pending</button>
          <button class="btn btn-secondary btn-sm js-doc-filter" data-filter="Verified">Verified</button>
          <button class="btn btn-secondary btn-sm js-doc-filter" data-filter="Rejected">Rejected</button>
        </div>
      </div>

      <div class="card-body" style="padding: 0;">
        <div class="table-container" style="border: none;">
          <table class="data-table" id="admin-docs-table">
            <thead>
              <tr>
                <th style="padding-left: 1.75rem;">Client Name</th>
                <th>Service Code & Type</th>
                <th>Document Name</th>
                <th>Submitted On</th>
                <th>Status</th>
                <th style="text-align: right; padding-right: 1.75rem;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${docs.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">📄</div>
                    <div style="font-weight: 700; margin-bottom: 0.25rem; color: #f8fafc;">No documents submitted yet</div>
                    <div style="font-size: 0.8125rem;">Client-submitted identity and verification proofs will appear here for review.</div>
                  </td>
                </tr>
              ` : docs.map(doc => `
                <tr data-status="${doc.status}">
                  <td style="font-weight: 600; padding-left: 1.75rem;">${doc.clientName}</td>
                  <td>
                    <a href="#admin/services/${doc.serviceId}">${doc.serviceType}</a>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${doc.serviceCode}</div>
                  </td>
                  <td style="font-weight: 600;">${doc.name}</td>
                  <td>${doc.submittedOn || '<span style="color: var(--text-light);">Not submitted</span>'}</td>
                  <td>${renderStatusBadge(doc.status)}</td>
                  <td style="text-align: right; padding-right: 1.75rem;">
                    <div style="display: inline-flex; gap: 0.35rem; justify-content: flex-end;">
                      ${doc.status !== 'Verified' ? `
                        <button class="btn btn-success btn-sm js-verify-doc-btn" data-service-id="${doc.serviceId}" data-doc-id="${doc.id}" data-doc-name="${doc.name}">
                          ✓ Verify
                        </button>
                      ` : ''}
                      ${doc.status !== 'Rejected' ? `
                        <button class="btn btn-danger btn-sm js-reject-doc-btn" data-service-id="${doc.serviceId}" data-doc-id="${doc.id}" data-doc-name="${doc.name}">
                          ✕ Reject
                        </button>
                      ` : ''}
                    </div>
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

export function bindAdminDocumentsEvents() {
  // Tab filtering
  document.addEventListener('click', (e) => {
    const filterBtn = e.target.closest('.js-doc-filter');
    if (filterBtn) {
      document.querySelectorAll('.js-doc-filter').forEach(b => b.classList.remove('active', 'btn-primary'));
      filterBtn.classList.add('active');

      const filterVal = filterBtn.dataset.filter;
      const rows = document.querySelectorAll('#admin-docs-table tbody tr');

      rows.forEach(r => {
        if (filterVal === 'ALL' || r.dataset.status === filterVal) {
          r.style.display = '';
        } else {
          r.style.display = 'none';
        }
      });
    }

    // Verify Action
    const verifyBtn = e.target.closest('.js-verify-doc-btn');
    if (verifyBtn) {
      const serviceId = verifyBtn.dataset.serviceId;
      const docId = verifyBtn.dataset.docId;
      const docName = verifyBtn.dataset.docName;

      documentService.verifyDocument(serviceId, docId).then(() => {
        toast.success('Document Verified', `'${docName}' status updated to Verified.`);
        if (window.appInstance) {
          window.appInstance.handleRoute();
        }
      });
    }

    // Reject Action Modal
    const rejectBtn = e.target.closest('.js-reject-doc-btn');
    if (rejectBtn) {
      const serviceId = rejectBtn.dataset.serviceId;
      const docId = rejectBtn.dataset.docId;
      const docName = rejectBtn.dataset.docName;

      modal.open({
        title: `Reject Document - ${docName}`,
        bodyHtml: `
          <form id="reject-doc-form">
            <div class="form-group">
              <label class="form-label">Rejection Reason *</label>
              <select class="form-control" id="reject-preset-reason" style="margin-bottom: 0.75rem;">
                <option value="Address proof image is not clear or page 2 is missing.">Image blurry / incomplete page</option>
                <option value="Name on document does not match Director PAN Card.">Name mismatch with PAN</option>
                <option value="Document is expired or older than 2 months.">Document expired / outdated</option>
                <option value="CUSTOM">Other (Type custom reason below)</option>
              </select>
              <textarea class="form-control" id="reject-custom-reason" rows="3" placeholder="Enter detailed reason for the client..."></textarea>
            </div>
          </form>
        `,
        footerHtml: `
          <button class="btn btn-secondary js-modal-cancel">Cancel</button>
          <button class="btn btn-danger" id="confirm-reject-btn">${icons.alert} Reject Document</button>
        `,
        onOpen: () => {
          document.querySelector('.js-modal-cancel').onclick = () => modal.close();
          document.getElementById('confirm-reject-btn').onclick = async () => {
            const preset = document.getElementById('reject-preset-reason').value;
            const custom = document.getElementById('reject-custom-reason').value.trim();
            const reason = (preset !== 'CUSTOM' && !custom) ? preset : (custom || preset);

            const btn = document.getElementById('confirm-reject-btn');
            btn.disabled = true;
            btn.textContent = 'Rejecting...';

            await documentService.rejectDocument(serviceId, docId, reason);
            toast.warning('Document Rejected', `'${docName}' rejected. Client notified to resubmit.`);
            modal.close();
            if (window.appInstance) {
              window.appInstance.handleRoute();
            }
          };
        }
      });
    }
  });
}
