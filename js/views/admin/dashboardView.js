/**
 * Legal Sthal - Admin Dashboard View
 */

import { adminService } from '../../services/adminService.js';
import { clientService } from '../../services/clientService.js';
import { serviceService } from '../../services/serviceService.js';
import { documentService } from '../../services/documentService.js';
import { quoteService } from '../../services/quoteService.js';
import { renderStatusBadge, icons } from '../../ui/components.js';

export async function renderAdminDashboard() {
  const adminData = await adminService.getDashboard();
  const liveMetrics = adminData.metrics || {};
  const recentClients = adminData.recentClients || [];
  const recentServices = adminData.recentServices || [];

  const pendingDocs = liveMetrics.pendingDocsCount || 0;
  const rejectedDocs = liveMetrics.rejectedDocsCount || 0;
  const activeServices = liveMetrics.activeServices || 0;
  const completedServices = liveMetrics.completedServices || 0;
  const totalClients = liveMetrics.totalClients || recentClients.length;
  const pendingQuotes = liveMetrics.pendingQuotesCount || 0;
  const totalPending = liveMetrics.totalPending !== undefined ? Number(liveMetrics.totalPending) : 0;

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Operations Console</h1>
        <p class="page-subtitle">Real-time workflow management, document verification, and client service metrics.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary js-trigger-create-client">
          ${icons.plus} Create Client
        </button>
        <button class="btn btn-secondary js-trigger-add-service">
          ${icons.plus} Add Service to Client
        </button>
      </div>
    </div>

    <!-- Admin Operational Metrics Cards Grid -->
    <div class="grid-4" style="margin-bottom: 2rem;">
      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Total Clients</span>
          <span class="stat-value">${totalClients}</span>
          <span class="stat-sub">Active corporate accounts</span>
        </div>
        <div class="stat-icon blue">${icons.profile}</div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Active Services</span>
          <span class="stat-value">${activeServices}</span>
          <span class="stat-sub">In operational pipeline</span>
        </div>
        <div class="stat-icon blue">${icons.services}</div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Pending Documents</span>
          <span class="stat-value">${pendingDocs}</span>
          <span class="stat-sub">Requires admin verification</span>
        </div>
        <div class="stat-icon amber">${icons.documents}</div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Rejected Docs</span>
          <span class="stat-value" style="color: var(--error-main);">${rejectedDocs}</span>
          <span class="stat-sub">Resubmission requested</span>
        </div>
        <div class="stat-icon red">${icons.alert}</div>
      </div>
    </div>

    <div class="grid-3" style="margin-bottom: 2rem;">
      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Completed Services</span>
          <span class="stat-value" style="color: var(--success-main);">${completedServices}</span>
          <span class="stat-sub">Certificates delivered</span>
        </div>
        <div class="stat-icon green">${icons.check}</div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Quote Requests</span>
          <span class="stat-value">${pendingQuotes}</span>
          <span class="stat-sub">Awaiting pricing response</span>
        </div>
        <div class="stat-icon blue">${icons.quotes}</div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Outstanding Balance</span>
          <span class="stat-value">₹${totalPending.toLocaleString('en-IN')}</span>
          <span class="stat-sub">Milestone payment due</span>
        </div>
        <div class="stat-icon red">${icons.payments}</div>
      </div>
    </div>

    <!-- Quick Shortcuts & Recent Clients Table -->
    <div class="grid-3">
      <!-- Recent Active Clients -->
      <div class="card" style="grid-column: span 2;">
        <div class="card-header">
          <h3 class="card-title">${icons.profile} Active Clients & Services Overview</h3>
          <a href="#admin/clients" class="btn btn-outline btn-sm">View All Clients ${icons.arrowRight}</a>
        </div>
        <div class="card-body" style="padding: 0;">
          <div class="table-container" style="border: none;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Primary Contact</th>
                  <th>State</th>
                  <th>Services</th>
                  <th>Outstanding</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${recentClients.length === 0 ? `
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
                      <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">📋</div>
                      <div style="font-weight: 600; margin-bottom: 0.25rem; color: #f8fafc;">No registered clients yet</div>
                      <div style="font-size: 0.8125rem;">Click "Create Client" to manually onboard your first client account.</div>
                    </td>
                  </tr>
                ` : recentClients.map(c => `
                  <tr>
                    <td style="font-weight: 600;">
                      <a href="#admin/clients/${c.clientId || c.id}">${c.companyName || c.name}</a>
                      <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal;">${c.clientId || c.id}</div>
                    </td>
                    <td>${c.contactPerson || c.contactName || c.email}<br><span style="font-size: 0.75rem; color: var(--text-muted);">${c.mobile || c.phone || ''}</span></td>
                    <td>${c.state || 'N/A'}</td>
                    <td><span class="badge badge-info">${c.status || 'Active'}</span></td>
                    <td style="font-weight: 700; color: var(--text-main);">${c.email}</td>
                    <td>
                      <a href="#admin/clients/${c.clientId || c.id}" class="btn btn-secondary btn-sm">Manage Client</a>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Quick Operations Launcher -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${icons.sync} Quick Operational Workflows</h3>
        </div>
        <div class="card-body">
          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            <button class="btn btn-primary btn-block js-trigger-create-client" style="justify-content: flex-start;">
              ${icons.plus} 1. Create New Client Account
            </button>
            <button class="btn btn-secondary btn-block js-trigger-add-service" style="justify-content: flex-start;">
              ${icons.services} 2. Add Service to Existing Client
            </button>
            <a href="#admin/documents" class="btn btn-secondary btn-block" style="justify-content: flex-start;">
              ${icons.documents} 3. Document Verification Workspace
            </a>
            <a href="#admin/quote-requests" class="btn btn-secondary btn-block" style="justify-content: flex-start;">
              ${icons.quotes} 4. Review Pending Quotes
            </a>
            <a href="#admin/sync" class="btn btn-secondary btn-block" style="justify-content: flex-start;">
              ${icons.sync} 5. Zoho CRM Integration Sync
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}
