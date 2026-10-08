/**
 * Legal Sthal - Admin Quote Requests Management
 */

import { quoteService } from '../../services/quoteService.js';
import { renderStatusBadge, icons } from '../../ui/components.js';
import { modal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

export async function renderAdminQuoteRequests() {
  const quotes = await quoteService.getQuoteRequests();

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Quote Requests Management</h1>
        <p class="page-subtitle">Review incoming service inquiries, send official proposals, and track acceptance.</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">${icons.quotes} All Quote Requests (${quotes.length})</h3>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-container" style="border: none;">
          <table class="data-table">
            <thead>
              <tr>
                <th style="padding-left: 1.75rem; width: 100px;">Ref ID</th>
                <th>Client Name</th>
                <th>Service Requested</th>
                <th>State</th>
                <th>Requested On</th>
                <th>Quoted Price</th>
                <th>Status</th>
                <th style="text-align: right; padding-right: 1.75rem;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${quotes.length === 0 ? `
                <tr>
                  <td colspan="8" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">💬</div>
                    <div style="font-weight: 700; margin-bottom: 0.25rem; color: #f8fafc;">No quote requests pending</div>
                    <div style="font-size: 0.8125rem;">Custom inquiries and quote submissions from clients will appear here.</div>
                  </td>
                </tr>
              ` : quotes.map(q => `
                <tr>
                  <td style="font-family: monospace; font-weight: 700; padding-left: 1.75rem;">${q.id}</td>
                  <td style="font-weight: 600;">${q.clientName}<br><span style="font-size: 0.75rem; color: var(--text-muted);">${q.mobile}</span></td>
                  <td>${q.serviceName}</td>
                  <td>${q.state}</td>
                  <td>${q.requestedOn}</td>
                  <td style="font-weight: 700; color: var(--success-main);">${q.quoteAmount || '<span style="color: var(--text-light); font-weight: normal;">Pending</span>'}</td>
                  <td>${renderStatusBadge(q.status)}</td>
                  <td style="text-align: right; padding-right: 1.75rem;">
                    <div style="display: inline-flex; gap: 0.35rem; justify-content: flex-end;">
                      ${q.status === 'Requested' ? `
                        <button class="btn btn-primary btn-sm js-send-quote-btn" data-quote-id="${q.id}" data-service="${q.serviceName}">
                          Send Quote
                        </button>
                      ` : ''}
                      ${q.status === 'Quote Sent' ? `
                        <button class="btn btn-success btn-sm js-mark-quote-status" data-quote-id="${q.id}" data-status="Accepted">
                          Mark Accepted
                        </button>
                        <button class="btn btn-danger btn-sm js-mark-quote-status" data-quote-id="${q.id}" data-status="Declined">
                          Mark Declined
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

export function bindAdminQuoteRequestsEvents() {
  document.addEventListener('click', (e) => {
    const sendBtn = e.target.closest('.js-send-quote-btn');
    if (sendBtn) {
      const quoteId = sendBtn.dataset.quoteId;
      const serviceName = sendBtn.dataset.service;

      modal.open({
        title: `Send Proposal Quote - ${serviceName}`,
        bodyHtml: `
          <form id="send-quote-modal-form">
            <div class="form-group">
              <label class="form-label">Quoted Price Amount (₹) *</label>
              <input type="text" class="form-control" id="sq-price" placeholder="e.g. ₹12,500" value="₹12,500" required />
            </div>

            <div class="form-group">
              <label class="form-label">Scope of Work & Notes for Client</label>
              <textarea class="form-control" id="sq-remarks" rows="3" placeholder="Includes pitch deck review, DPIIT application filing, and compliance certificate."></textarea>
            </div>
          </form>
        `,
        footerHtml: `
          <button class="btn btn-secondary js-modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="confirm-send-quote-btn">${icons.check} Send Official Quote</button>
        `,
        onOpen: () => {
          document.querySelector('.js-modal-cancel').onclick = () => modal.close();
          document.getElementById('confirm-send-quote-btn').onclick = async () => {
            const price = document.getElementById('sq-price').value;
            const remarks = document.getElementById('sq-remarks').value;

            await quoteService.updateQuoteStatus(quoteId, 'Quote Sent', price, remarks);
            toast.success('Quote Dispatched', `Proposal of ${price} sent to client for ${serviceName}.`);
            modal.close();
            if (window.appInstance) {
              window.appInstance.handleRoute();
            }
          };
        }
      });
    }

    const markBtn = e.target.closest('.js-mark-quote-status');
    if (markBtn) {
      const quoteId = markBtn.dataset.quoteId;
      const status = markBtn.dataset.status;

      quoteService.updateQuoteStatus(quoteId, status).then(() => {
        toast.success('Quote Status Updated', `Quote status changed to ${status}.`);
        if (window.appInstance) {
          window.appInstance.handleRoute();
        }
      });
    }
  });
}
