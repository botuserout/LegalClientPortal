/**
 * Legal Sthal - Client Services Overview Screen
 */

import { serviceService } from '../../services/serviceService.js';
import { authService } from '../../services/authService.js';
import { renderStatusBadge, renderProgressBar, icons } from '../../ui/components.js';

export async function renderClientServices() {
  const user = authService.getCurrentUser();
  const clientId = user ? user.clientId : 'CL001';

  const services = await serviceService.getServicesByClientId(clientId);

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">My Services</h1>
        <p class="page-subtitle">Track stage timelines, document requirements, and status for all services purchased under your account.</p>
      </div>
      <div class="page-actions">
        <a href="#client/new-service" class="btn btn-primary">
          ${icons.plus} Avail New Service
        </a>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="card" style="margin-bottom: 2rem;">
      <div class="card-header">
        <div style="display: flex; gap: 0.5rem;" id="client-service-filter-tabs">
          <button class="btn btn-secondary btn-sm active js-srv-filter" data-filter="ALL">All Services (${services.length})</button>
          <button class="btn btn-secondary btn-sm js-srv-filter" data-filter="In Progress">Active</button>
          <button class="btn btn-secondary btn-sm js-srv-filter" data-filter="Completed">Completed</button>
        </div>
      </div>
      <div class="card-body">
        <div class="grid-3" id="client-services-grid">
          ${services.map(srv => {
            const currentStageObj = srv.stages[srv.currentStageIndex] || srv.stages[0];
            const hasAction = srv.documents && srv.documents.some(d => d.status === 'Rejected');

            return `
              <div class="service-card" data-status="${srv.status}">
                <div>
                  <div class="service-card-top">
                    <div>
                      <h3 class="service-title">${srv.serviceType}</h3>
                      <div class="service-subtitle">${srv.serviceCode} • ${srv.companyType}</div>
                    </div>
                    ${hasAction ? renderStatusBadge('Action Required') : renderStatusBadge(srv.status)}
                  </div>

                  <div class="service-stage-box">
                    <div>
                      <div class="stage-label">Current Stage</div>
                      <div class="stage-name">${currentStageObj.name}</div>
                    </div>
                  </div>

                  ${renderProgressBar(srv.progressPercentage)}
                </div>

                <div class="service-financials">
                  <div class="fin-item">
                    <span class="fin-label">Remaining</span>
                    <span class="fin-val ${srv.remainingAmount > 0 ? 'due' : ''}">₹${srv.remainingAmount.toLocaleString('en-IN')}</span>
                  </div>

                  <a href="#client/services/${srv.id}" class="btn btn-outline btn-sm">
                    View Service ${icons.arrowRight}
                  </a>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}
