/**
 * Legal Sthal - Client Dashboard View
 */

import { clientService } from '../../services/clientService.js';
import { authService } from '../../services/authService.js';
import { renderStatusBadge, renderProgressBar, icons } from '../../ui/components.js';

export async function renderClientDashboard() {
  const currentUser = authService.getCurrentUser();
  const clientId = currentUser ? currentUser.clientId : 'CL001';

  const data = await clientService.getClientDashboard(clientId);
  const client = data.client || { companyName: 'ABC Technologies Pvt Ltd', contactPerson: 'Rahul Mehta' };
  const metrics = data.metrics;
  const services = data.services;

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Good morning, ${client.contactPerson || client.companyName}</h1>
        <p class="page-subtitle">Track your Legal Sthal services and application progress in real-time.</p>
      </div>
      <div class="page-actions">
        <a href="#client/new-service" class="btn btn-primary">
          ${icons.plus} Avail New Service
        </a>
      </div>
    </div>

    <!-- Summary Metrics Cards -->
    <div class="grid-4" style="margin-bottom: 2rem;">
      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Active Services</span>
          <span class="stat-value">${metrics.activeServices}</span>
          <span class="stat-sub">In progress with Legal Sthal</span>
        </div>
        <div class="stat-icon blue">${icons.services}</div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Completed Services</span>
          <span class="stat-value">${metrics.completedServices}</span>
          <span class="stat-sub">Fully delivered</span>
        </div>
        <div class="stat-icon green">${icons.check}</div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Pending Documents</span>
          <span class="stat-value">${metrics.pendingDocsCount}</span>
          <span class="stat-sub">${metrics.pendingDocsCount > 0 ? 'Requires attention' : 'All clear'}</span>
        </div>
        <div class="stat-icon amber">${icons.documents}</div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Outstanding Amount</span>
          <span class="stat-value" style="color: ${metrics.totalDueAmount > 0 ? 'var(--error-main)' : 'var(--success-main)'};">
            ₹${metrics.totalDueAmount.toLocaleString('en-IN')}
          </span>
          <span class="stat-sub">${metrics.totalDueAmount > 0 ? 'Payment pending' : 'Zero balance'}</span>
        </div>
        <div class="stat-icon red">${icons.payments}</div>
      </div>
    </div>

    <!-- My Services Grid -->
    <div class="card" style="margin-bottom: 2rem;">
      <div class="card-header">
        <div class="card-title">
          ${icons.services} My Purchased Services
        </div>
        <span style="font-size: 0.8125rem; color: var(--text-muted); font-weight: 500;">
          All services linked to Client ID: <strong>${client.id || 'CL001'}</strong>
        </span>
      </div>
      <div class="card-body">
        <div class="grid-3">
          ${services.map(srv => {
            const currentStageObj = srv.stages[srv.currentStageIndex] || srv.stages[0];
            const hasActionNeeded = srv.documents && srv.documents.some(d => d.status === 'Rejected');

            return `
              <div class="service-card">
                <div>
                  <div class="service-card-top">
                    <div>
                      <h3 class="service-title">${srv.serviceType}</h3>
                      <div class="service-subtitle">${srv.companyType} • ${srv.state}</div>
                    </div>
                    ${hasActionNeeded ? renderStatusBadge('Action Required') : renderStatusBadge(srv.status)}
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
                    <span class="fin-label">Paid</span>
                    <span class="fin-val">₹${srv.paidAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div class="fin-item">
                    <span class="fin-label">Remaining</span>
                    <span class="fin-val ${srv.remainingAmount > 0 ? 'due' : ''}">₹${srv.remainingAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div class="fin-item">
                    <a href="#client/services/${srv.id}" class="btn btn-outline btn-sm">
                      View Service ${icons.arrowRight}
                    </a>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}
