/**
 * Legal Sthal - Client Quote Requests View
 */

import { quoteService } from '../../services/quoteService.js';
import { authService } from '../../services/authService.js';
import { renderStatusBadge, renderTimeline, icons } from '../../ui/components.js';

export async function renderClientQuoteRequests() {
  const user = authService.getCurrentUser();
  const clientId = user ? (user.clientId || user.userId) : null;

  const quotes = clientId ? await quoteService.getQuoteRequestsByClientId(clientId) : [];

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">My Quote Requests</h1>
        <p class="page-subtitle">Track proposal status for requested Legal Sthal services.</p>
      </div>
      <div class="page-actions">
        <a href="#client/new-service" class="btn btn-primary">
          ${icons.plus} Explore Services
        </a>
      </div>
    </div>

    ${quotes.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">${icons.quotes}</div>
        <h3 class="empty-title">No quote requests found</h3>
        <p class="empty-desc">You have not requested any custom quotes yet. Explore our service catalog to get started.</p>
        <a href="#client/new-service" class="btn btn-primary">Avail New Service</a>
      </div>
    ` : `
      <div class="grid-2">
        ${quotes.map(q => `
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">${q.serviceName}</h3>
                <div style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.15rem;">
                  Ref: ${q.id} • Requested on ${q.requestedOn}
                </div>
              </div>
              ${renderStatusBadge(q.status)}
            </div>

            <div class="card-body">
              ${q.quoteAmount ? `
                <div style="background-color: var(--success-bg); border: 1px solid var(--success-border); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
                  <div>
                    <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 600; color: var(--success-text);">Quoted Price</span>
                    <div style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 700; color: #14532d;">${q.quoteAmount}</div>
                  </div>
                  <span class="badge badge-success">Official Proposal</span>
                </div>
              ` : ''}

              <p style="font-size: 0.875rem; color: var(--text-main); margin-bottom: 1rem;">
                <strong>Requirements / Remarks:</strong> ${q.remarks}
              </p>

              <div style="font-weight: 600; font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase;">Proposal Status Timeline</div>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                ${q.timeline.map(t => `
                  <span class="badge badge-info" style="font-size: 0.75rem;">
                    ✓ ${t.stage} (${t.date})
                  </span>
                `).join(' → ')}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}
