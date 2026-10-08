/**
 * Legal Sthal - Client Dashboard View
 */

import { clientService } from '../../services/clientService.js';
import { authService } from '../../services/authService.js';
import { renderStatusBadge, renderProgressBar, icons } from '../../ui/components.js';

export async function renderClientDashboard() {
  const currentUser = authService.getCurrentUser();
  const clientId = currentUser ? (currentUser.clientId || currentUser.userId) : null;

  const data = await clientService.getClientDashboard(clientId);
  const client = data.client || {
    id: clientId || 'Pending',
    companyName: currentUser?.companyName || currentUser?.name || 'Valued Client',
    contactPerson: currentUser?.contactPerson || currentUser?.name || 'Client'
  };
  const metrics = data.metrics || { activeServices: 0, completedServices: 0, pendingDocsCount: 0, totalDueAmount: 0 };
  const services = data.services || [];

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Welcome, ${client.contactPerson || client.companyName}</h1>
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
          All services linked to Client ID: <strong>${client.id || 'New Client'}</strong>
        </span>
      </div>
      <div class="card-body">
        <div class="grid-3">
          ${services.length === 0 ? `
            <div class="empty-state" style="grid-column: 1 / -1; padding: 3rem 1.5rem; text-align: center;">
              <div class="empty-icon">${icons.services}</div>
              <h3 class="empty-title" style="margin-top: 0.75rem;">No Active Services Yet</h3>
              <p class="empty-desc" style="max-width: 480px; margin: 0.5rem auto 1.25rem;">You have not enrolled in any services yet. Explore our comprehensive catalog to get started with incorporation, GST, compliance, or trademarks.</p>
              <a href="#client/new-service" class="btn btn-primary">
                ${icons.plus} Avail New Service
              </a>
            </div>
          ` : services.map(srv => {
            const currentStageObj = (srv.stages && srv.stages[srv.currentStageIndex]) || (srv.stages && srv.stages[0]) || null;
            const stageName = currentStageObj?.name || currentStageObj?.stageName || srv.currentStage || 'Application Processing';
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
                      <div class="stage-name">${stageName}</div>
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
