/**
 * Legal Sthal - Admin Client Profile & Add Service to Existing Client View
 */

import { clientService } from '../../services/clientService.js';
import { serviceService } from '../../services/serviceService.js';
import { spocService } from '../../services/spocService.js';
import { renderStatusBadge, renderProgressBar, icons } from '../../ui/components.js';
import { modal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

export async function renderAdminClientDetail(clientId) {
  const client = await clientService.getClientById(clientId);
  if (!client) {
    return `
      <div class="empty-state">
        <h3>Client Account Not Found</h3>
        <p>The client ID "${clientId}" was not found in the repository.</p>
        <a href="#admin/clients" class="btn btn-primary">Back to Clients Directory</a>
      </div>
    `;
  }

  const services = await serviceService.getServicesByClientId(clientId);

  return `
    <div class="page-header">
      <div>
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.35rem;">
          <a href="#admin/clients" style="color: var(--text-muted); font-size: 0.875rem;">← Back to Clients Directory</a>
          <span style="color: var(--text-light);">|</span>
          <span style="font-size: 0.8125rem; font-weight: 700; color: var(--primary-500); background-color: var(--primary-50); padding: 0.15rem 0.5rem; border-radius: 4px;">ID: ${client.id}</span>
        </div>
        <h1 class="page-title">${client.companyName}</h1>
        <p class="page-subtitle">Primary Contact: ${client.contactPerson} • Email: ${client.email} • Phone: ${client.mobile}</p>
      </div>

      <div class="page-actions">
        <button class="btn btn-primary js-open-add-service-modal" data-client-id="${client.id}" data-client-name="${client.companyName}">
          ${icons.plus} Add Service to Existing Client
        </button>
        <button class="btn btn-secondary js-edit-client-btn" data-client-id="${client.id}">
          Edit Account
        </button>
      </div>
    </div>

    <!-- Client Account Cards Grid -->
    <div class="card" style="margin-bottom: 2rem;">
      <div class="card-header">
        <h3 class="card-title">${icons.services} Client Services Portfolio (${services.length} Linked Services)</h3>
        <span style="font-size: 0.8125rem; color: var(--text-muted);">
          Same login credentials used for all services
        </span>
      </div>
      <div class="card-body">
        <div class="grid-3">
          ${services.map(srv => {
            const currentStageObj = srv.stages[srv.currentStageIndex] || srv.stages[0];

            return `
              <div class="service-card">
                <div>
                  <div class="service-card-top">
                    <div>
                      <h3 class="service-title">${srv.serviceType}</h3>
                      <div class="service-subtitle">${srv.serviceCode} • ${srv.companyType}</div>
                    </div>
                    ${renderStatusBadge(srv.status)}
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

                  <a href="#admin/services/${srv.id}" class="btn btn-outline btn-sm">
                    Manage & Update Stage ${icons.arrowRight}
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

export function bindAdminClientDetailEvents() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.js-open-add-service-modal');
    if (btn) {
      const clientId = btn.dataset.clientId;
      const clientName = btn.dataset.clientName;

      modal.open({
        title: `Add Service to Existing Client - ${clientName}`,
        bodyHtml: `
          <form id="add-service-modal-form">
            <div class="form-group">
              <label class="form-label">Client Account</label>
              <input type="text" class="form-control" value="${clientName} (${clientId})" readonly style="background-color: var(--bg-app); font-weight: 700;" />
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Select Service *</label>
                <select class="form-control" id="as-service-type" required>
                  <option value="Company Incorporation">Company Incorporation</option>
                  <option value="GST Registration">GST Registration</option>
                  <option value="MSME Registration">MSME Registration</option>
                  <option value="Startup India Recognition">Startup India Recognition</option>
                  <option value="Annual Corporate Compliance">Annual Corporate Compliance</option>
                  <option value="Trademark Registration">Trademark Registration</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Entity Constitution *</label>
                <select class="form-control" id="as-company-type" required>
                  <option value="Private Limited">Private Limited</option>
                  <option value="LLP">LLP</option>
                  <option value="Proprietorship">Proprietorship</option>
                </select>
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Total Fee Amount (₹) *</label>
                <input type="number" class="form-control" id="as-total" value="9999" required />
              </div>
              <div class="form-group">
                <label class="form-label">Paid Booking Amount (₹) *</label>
                <input type="number" class="form-control" id="as-paid" value="1000" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Assign Dedicated SPOC *</label>
              <select class="form-control" id="as-spoc" required>
                <option value="SPOC001">Priya Shah (Senior Incorporation Expert)</option>
                <option value="SPOC002" selected>Rahul Sharma (Client Relationship Executive)</option>
                <option value="SPOC003">Amit Verma (Tax & Compliance Specialist)</option>
              </select>
            </div>
          </form>
        `,
        footerHtml: `
          <button class="btn btn-secondary js-modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="save-add-service-btn">${icons.check} Add Service to Client</button>
        `,
        onOpen: () => {
          document.querySelector('.js-modal-cancel').onclick = () => modal.close();
          document.getElementById('save-add-service-btn').onclick = async () => {
            const submitBtn = document.getElementById('save-add-service-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            await serviceService.addServiceToClient(clientId, {
              serviceType: document.getElementById('as-service-type').value,
              companyType: document.getElementById('as-company-type').value,
              totalAmount: document.getElementById('as-total').value,
              paidAmount: document.getElementById('as-paid').value,
              spocId: document.getElementById('as-spoc').value
            });

            toast.success('Service Added', `New service added successfully. Customer continues using the same login!`);
            modal.close();
            window.location.reload();
          };
        }
      });
    }
  });
}
