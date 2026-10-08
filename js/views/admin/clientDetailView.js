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
          ${services.length === 0 ? `
            <div class="empty-state" style="grid-column: 1 / -1; padding: 3rem 1.5rem; text-align: center;">
              <div class="empty-icon">${icons.services}</div>
              <h3 class="empty-title">No Services Linked Yet</h3>
              <p class="empty-desc" style="max-width: 440px; margin: 0.5rem auto 1.25rem;">This client has no service workflows yet. Click below to add a service to this client account.</p>
              <button class="btn btn-primary js-open-add-service-modal" data-client-id="${client.id}" data-client-name="${client.companyName}">
                ${icons.plus} Add First Service
              </button>
            </div>
          ` : services.map(srv => {
            const currentStageObj = (srv.stages && srv.stages.length) ? (srv.stages[srv.currentStageIndex] || srv.stages[0]) : null;
            const stageName = currentStageObj?.name || currentStageObj?.stageName || srv.currentStage || 'Application Processing';

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
                      <div class="stage-name">${stageName}</div>
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

let clientDetailEventsBound = false;

export function bindAdminClientDetailEvents() {
  if (clientDetailEventsBound) return;
  clientDetailEventsBound = true;

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.js-open-add-service-modal');
    if (btn) {
      const clientId = btn.dataset.clientId;
      const clientName = btn.dataset.clientName;
      btn.disabled = true;
      const spocsList = await spocService.getSpocs();
      btn.disabled = false;

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
                <label class="form-label">Primary Service *</label>
                <select class="form-control" id="as-primary-service" required>
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
                <select class="form-control" id="as-misc-service">
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
                <label class="form-label" for="as-dsc-count">Number of DSC</label>
                <input type="number" id="as-dsc-count" class="form-control" min="0" max="20" placeholder="e.g. 2" value="2" />
                <div class="form-hint">Digital Signature Certificates count</div>
              </div>

              <div class="form-group">
                <label class="form-label" for="as-name-run">Name Reservation</label>
                <div class="form-checkbox-card" onclick="document.getElementById('as-name-run').click()">
                  <label class="form-checkbox-card-inner" onclick="event.stopPropagation()">
                    <input type="checkbox" id="as-name-run" />
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
                ${spocsList.map(s => `
                  <option value="${s.id || s.spocId}">
                    ${s.name} (${s.title || 'Legal Specialist'})
                  </option>
                `).join('')}
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
            const primaryService = document.getElementById('as-primary-service').value;
            const miscService = document.getElementById('as-misc-service').value;
            const dscCount = parseInt(document.getElementById('as-dsc-count').value || '2', 10);
            const nameRun = document.getElementById('as-name-run').checked;

            const miscLabel = (miscService && miscService !== 'None') ? ` + ${miscService}` : '';
            const fullServiceName = `${primaryService}${miscLabel}`;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            await serviceService.addServiceToClient(clientId, {
              serviceType: fullServiceName,
              primaryService,
              miscService,
              companyType: primaryService,
              dscCount: isNaN(dscCount) ? 2 : dscCount,
              nameRun,
              totalAmount: document.getElementById('as-total').value,
              paidAmount: document.getElementById('as-paid').value,
              spocId: document.getElementById('as-spoc').value
            });

            toast.success('Service Added', `${fullServiceName} added successfully. Customer continues using the same login!`);
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
