/**
 * Legal Sthal - Admin Dashboard View
 */

import { adminService } from '../../services/adminService.js';
import { clientService } from '../../services/clientService.js';
import { serviceService } from '../../services/serviceService.js';
import { documentService } from '../../services/documentService.js';
import { quoteService } from '../../services/quoteService.js';
import { modal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';
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

let dashboardEventsBound = false;

export function bindAdminDashboardEvents() {
  if (dashboardEventsBound) return;
  dashboardEventsBound = true;

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.js-trigger-add-service');
    if (!btn) return;

    btn.disabled = true;
    const clients = await clientService.getClients();
    btn.disabled = false;

    if (!clients || clients.length === 0) {
      toast.error('No Clients', 'Please create a client first before adding services.');
      return;
    }

    modal.open({
      title: 'Add Service to Existing Client',
      bodyHtml: `
        <form id="dash-add-service-form">
          <div class="form-group">
            <label class="form-label">Select Client Account *</label>
            <select class="form-control" id="das-client-select" required>
              ${clients.map(c => `
                <option value="${c.id}">${c.companyName} (${c.id}) — ${c.email}</option>
              `).join('')}
            </select>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Primary Service *</label>
              <select class="form-control" id="das-primary-service" required>
                <option value="Private Limited">Private Limited</option>
                <option value="LLP">LLP</option>
                <option value="OPC">OPC</option>
                <option value="Section - 8">Section - 8</option>
                <option value="Sole Proprietorship">Sole Proprietorship</option>
                <option value="Partnership Firm">Partnership Firm</option>
                <option value="Others">Others</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Miscellaneous Services</label>
              <select class="form-control" id="das-misc-service">
                <option value="None">None</option>
                <option value="GST">GST</option>
                <option value="MSME">MSME</option>
                <option value="StartUp">StartUp</option>
                <option value="Trademark">Trademark</option>
                <option value="Compliance">Compliance</option>
              </select>
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label" for="das-dsc-count">Number of DSC</label>
              <input type="number" id="das-dsc-count" class="form-control" min="0" max="20" placeholder="e.g. 2" value="2" />
              <div class="form-hint">Digital Signature Certificates count</div>
            </div>

            <div class="form-group">
              <label class="form-label" for="das-name-run">Name Reservation</label>
              <div class="form-checkbox-card" onclick="document.getElementById('das-name-run').click()">
                <label class="form-checkbox-card-inner" onclick="event.stopPropagation()">
                  <input type="checkbox" id="das-name-run" />
                  <span>Enable Name RUN</span>
                </label>
                <span class="form-checkbox-badge">Fast-Track</span>
              </div>
              <div class="form-hint">Reserve Unique Name (RUN) fast-track filing</div>
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Total Fee Amount (₹) *</label>
              <input type="number" class="form-control" id="das-total" value="9999" required />
            </div>
            <div class="form-group">
              <label class="form-label">Paid Booking Amount (₹) *</label>
              <input type="number" class="form-control" id="das-paid" value="1000" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Assign Dedicated SPOC *</label>
            <select class="form-control" id="das-spoc" required>
              <option value="SPOC001">Harshit Srivastav (Senior Incorporation Expert)</option>
              <option value="SPOC002" selected>Adv. Priya Sharma (Client Relationship Lead)</option>
              <option value="SPOC003">CA Rohan Mehta (Tax & Compliance Specialist)</option>
            </select>
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary js-modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="dash-save-service-btn">${icons.check} Create Service in Portal</button>
      `,
      onOpen: () => {
        document.querySelector('.js-modal-cancel').onclick = () => modal.close();
        document.getElementById('dash-save-service-btn').onclick = async () => {
          const submitBtn = document.getElementById('dash-save-service-btn');
          const clientId = document.getElementById('das-client-select').value;
          const primaryService = document.getElementById('das-primary-service').value;
          const miscService = document.getElementById('das-misc-service').value;
          const dscCount = parseInt(document.getElementById('das-dsc-count').value || '2', 10);
          const nameRun = document.getElementById('das-name-run').checked;

          const miscLabel = (miscService && miscService !== 'None') ? ` + ${miscService}` : '';
          const fullServiceName = `${primaryService}${miscLabel}`;

          submitBtn.disabled = true;
          submitBtn.textContent = 'Creating in Supabase...';

          try {
            await serviceService.addServiceToClient(clientId, {
              serviceType: fullServiceName,
              primaryService,
              miscService,
              companyType: primaryService,
              dscCount: isNaN(dscCount) ? 2 : dscCount,
              nameRun,
              totalAmount: document.getElementById('das-total').value,
              paidAmount: document.getElementById('das-paid').value,
              spocId: document.getElementById('das-spoc').value
            });

            toast.success('Service Created', `${fullServiceName} added to ${clientId}! Live synced across both Admin & Client portals.`);
            modal.close();
            if (window.appInstance) {
              window.appInstance.handleRoute();
            }
          } catch (err) {
            toast.error('Error', err.message || 'Failed to create service.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Service in Portal';
          }
        };
      }
    });
  });
}

