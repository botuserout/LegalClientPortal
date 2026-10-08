/**
 * Legal Sthal - Admin Clients Master Table & Multi-step Client Creator Wizard
 */

import { clientService } from '../../services/clientService.js';
import { serviceService } from '../../services/serviceService.js';
import { spocService } from '../../services/spocService.js';
import { modal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';
import { renderStatusBadge, icons } from '../../ui/components.js';
import { renderStateOptionsHtml } from '../../config.js';

export async function renderAdminClients() {
  const clients = await clientService.getClients();
  const services = await serviceService.getServices();

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Client Master Directory</h1>
        <p class="page-subtitle">Manage corporate accounts, active service counts, and billing statuses.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary js-open-create-client-wizard">
          ${icons.plus} Create New Client
        </button>
      </div>
    </div>

    <!-- Filters & Table Card -->
    <div class="card">
      <div class="card-header" style="padding: 1.25rem 1.5rem;">
        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <div class="search-box" style="width: 280px;">
            ${icons.search}
            <input type="text" id="client-search-input" placeholder="Search by name, email, ID..." />
          </div>

          <select class="form-control" id="client-filter-state" style="width: 210px; padding: 0.55rem 0.85rem; background-color: #131b2e; color: #f8fafc; border: 1px solid rgba(212, 175, 55, 0.3); border-radius: var(--radius-md);">
            ${renderStateOptionsHtml('ALL', true, 'All States & UTs')}
          </select>
        </div>

        <span style="font-size: 0.8125rem; color: var(--text-muted); font-weight: 600;">
          Showing ${clients.length} Registered Accounts
        </span>
      </div>

      <div class="card-body" style="padding: 0;">
        <div class="table-container" style="border: none;">
          <table class="data-table" id="clients-table">
            <thead>
              <tr>
                <th style="padding-left: 1.75rem; width: 100px;">Client ID</th>
                <th style="min-width: 180px;">Company Name</th>
                <th style="min-width: 140px;">Contact Person</th>
                <th style="min-width: 220px;">Email & Mobile</th>
                <th style="min-width: 110px;">State</th>
                <th style="min-width: 170px;">Services Link</th>
                <th style="min-width: 110px;">Status</th>
                <th style="text-align: right; padding-right: 1.75rem; width: 140px;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${clients.length === 0 ? `
                <tr>
                  <td colspan="8" style="text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">👥</div>
                    <div style="font-weight: 700; font-size: 1.05rem; margin-bottom: 0.35rem; color: #f8fafc;">No registered clients found</div>
                    <div style="font-size: 0.85rem; max-width: 400px; margin: 0 auto 1.25rem;">Onboard your first client account using the button above to begin managing services and tracking compliances.</div>
                    <button class="btn btn-primary btn-sm js-open-create-client-wizard">${icons.plus} Create First Client</button>
                  </td>
                </tr>
              ` : clients.map(c => {
                const clientServices = services.filter(s => s.clientId === c.id);
                const activeCount = clientServices.filter(s => s.status !== 'Completed').length;

                return `
                  <tr>
                    <td style="font-family: monospace; font-weight: 700; padding-left: 1.75rem;">${c.id}</td>
                    <td style="font-weight: 700;">
                      <a href="#admin/clients/${c.id}" style="color: #f3e5ab;">${c.companyName}</a>
                    </td>
                    <td>${c.contactPerson}</td>
                    <td>
                      <div>${c.email}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${c.mobile}</div>
                    </td>
                    <td>${c.state}</td>
                    <td>
                      <span class="badge badge-info">${clientServices.length} Services (${activeCount} Active)</span>
                    </td>
                    <td>${renderStatusBadge(c.status)}</td>
                    <td style="text-align: right; padding-right: 1.75rem; white-space: nowrap;">
                      <a href="#admin/clients/${c.id}" class="btn btn-secondary btn-sm" style="display: inline-flex;">
                        View Profile
                      </a>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

let clientsEventsBound = false;

export function bindAdminClientsEvents() {
  const filterTable = () => {
    const searchVal = (document.getElementById('client-search-input')?.value || '').toLowerCase().trim();
    const stateVal = (document.getElementById('client-filter-state')?.value || 'ALL').toLowerCase().trim();
    const rows = document.querySelectorAll('#clients-table tbody tr');

    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      const stateCell = (row.children[4]?.textContent || '').toLowerCase().trim();
      const matchesSearch = !searchVal || text.includes(searchVal);
      const matchesState = stateVal === 'all' || stateCell.includes(stateVal);

      if (matchesSearch && matchesState) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  };

  document.addEventListener('input', (e) => {
    if (e.target.id === 'client-search-input') filterTable();
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'client-filter-state') filterTable();
  });

  if (clientsEventsBound) return;
  clientsEventsBound = true;

  document.addEventListener('click', (e) => {
    if (e.target.closest('.js-open-create-client-wizard, .js-trigger-create-client')) {
      openCreateClientWizard();
    }
  });
}

export async function openCreateClientWizard() {
  let wizardStep = 1;
  const spocsList = await spocService.getSpocs();
  let defaultSpocId = (spocsList && spocsList.length > 0) ? (spocsList[0].id || spocsList[0].spocId) : 'SPOC001';

  let wizardData = {
    companyName: '',
    contactPerson: '',
    email: '',
    mobile: '',
    state: 'Gujarat',
    address: '',
    primaryService: 'Private Limited',
    miscService: 'None',
    dscCount: 2,
    nameRun: false,
    serviceType: 'Private Limited',
    companyType: 'Private Limited',
    totalAmount: 9999,
    paidAmount: 499,
    spocId: defaultSpocId,
    password: 'password123'
  };

  const renderWizardContent = () => {
    let bodyHtml = '';
    
    // Step Bar Header
    const wizardBar = `
      <div class="wizard-steps">
        <div class="wizard-step-item ${wizardStep === 1 ? 'active' : wizardStep > 1 ? 'completed' : ''}">
          <div class="wizard-step-num">1</div>
          <span class="wizard-step-label">Client Details</span>
        </div>
        <div class="wizard-step-item ${wizardStep === 2 ? 'active' : wizardStep > 2 ? 'completed' : ''}">
          <div class="wizard-step-num">2</div>
          <span class="wizard-step-label">Select Service</span>
        </div>
        <div class="wizard-step-item ${wizardStep === 3 ? 'active' : wizardStep > 3 ? 'completed' : ''}">
          <div class="wizard-step-num">3</div>
          <span class="wizard-step-label">Pricing & SPOC</span>
        </div>
        <div class="wizard-step-item ${wizardStep === 4 ? 'active' : ''}">
          <div class="wizard-step-num">4</div>
          <span class="wizard-step-label">Review & Confirm</span>
        </div>
      </div>
    `;

    if (wizardStep === 1) {
      bodyHtml = `
        ${wizardBar}
        <form id="wz-step-1-form">
          <div class="form-group">
            <label class="form-label">Company Name *</label>
            <input type="text" id="wz-name" class="form-control" required placeholder="e.g. Acme Tech Pvt Ltd" value="${wizardData.companyName}" />
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Contact Person *</label>
              <input type="text" id="wz-contact" class="form-control" required placeholder="e.g. Rajesh Sharma" value="${wizardData.contactPerson}" />
            </div>
            <div class="form-group">
              <label class="form-label">Mobile Number *</label>
              <input type="text" id="wz-mobile" class="form-control" required placeholder="+91 98765 00000" value="${wizardData.mobile}" />
            </div>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Email Address *</label>
              <input type="email" id="wz-email" class="form-control" required placeholder="name@company.com" value="${wizardData.email}" />
              <div class="form-hint">Unique login ID will be created for this email.</div>
            </div>
            <div class="form-group">
              <label class="form-label">State / Region *</label>
              <select class="form-control" id="wz-state">
                ${renderStateOptionsHtml(wizardData.state || 'Gujarat')}
              </select>
            </div>
          </div>
        </form>
      `;
    } else if (wizardStep === 2) {
      bodyHtml = `
        ${wizardBar}
        <form id="wz-step-2-form">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Primary Service *</label>
              <select class="form-control" id="wz-primary-service">
                <option value="Private Limited" ${wizardData.primaryService === 'Private Limited' ? 'selected' : ''}>Private Limited</option>
                <option value="LLP" ${wizardData.primaryService === 'LLP' ? 'selected' : ''}>LLP</option>
                <option value="OPC" ${wizardData.primaryService === 'OPC' ? 'selected' : ''}>OPC</option>
                <option value="Section - 8" ${wizardData.primaryService === 'Section - 8' ? 'selected' : ''}>Section - 8</option>
                <option value="Sole Proprietorship" ${wizardData.primaryService === 'Sole Proprietorship' ? 'selected' : ''}>Sole Proprietorship</option>
                <option value="Partnership Firm" ${wizardData.primaryService === 'Partnership Firm' ? 'selected' : ''}>Partnership Firm</option>
                <option value="Others" ${wizardData.primaryService === 'Others' ? 'selected' : ''}>Others</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Miscellaneous Services</label>
              <select class="form-control" id="wz-misc-service">
                <option value="None" ${wizardData.miscService === 'None' ? 'selected' : ''}>None</option>
                <option value="GST" ${wizardData.miscService === 'GST' ? 'selected' : ''}>GST</option>
                <option value="MSME" ${wizardData.miscService === 'MSME' ? 'selected' : ''}>MSME</option>
                <option value="StartUp" ${wizardData.miscService === 'StartUp' ? 'selected' : ''}>StartUp</option>
                <option value="Trademark" ${wizardData.miscService === 'Trademark' ? 'selected' : ''}>Trademark</option>
                <option value="Compliance" ${wizardData.miscService === 'Compliance' ? 'selected' : ''}>Compliance</option>
              </select>
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label" for="wz-dsc-count">Number of DSC</label>
              <input type="number" id="wz-dsc-count" class="form-control" min="0" max="20" placeholder="e.g. 2" value="${wizardData.dscCount !== undefined ? wizardData.dscCount : 2}" />
              <div class="form-hint">Digital Signature Certificates count</div>
            </div>

            <div class="form-group">
              <label class="form-label" for="wz-name-run">Name Reservation</label>
              <div class="form-checkbox-card" onclick="document.getElementById('wz-name-run').click()">
                <label class="form-checkbox-card-inner" onclick="event.stopPropagation()">
                  <input type="checkbox" id="wz-name-run" ${wizardData.nameRun ? 'checked' : ''} />
                  <span>Enable Name RUN</span>
                </label>
                <span class="form-checkbox-badge">Fast-Track</span>
              </div>
              <div class="form-hint">Reserve Unique Name (RUN) filing before SPICe+</div>
            </div>
          </div>
        </form>
      `;
    } else if (wizardStep === 3) {
      bodyHtml = `
        ${wizardBar}
        <form id="wz-step-3-form">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Total Fee (₹) *</label>
              <input type="number" id="wz-total" class="form-control" value="${wizardData.totalAmount}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Paid Booking Amount (₹) *</label>
              <input type="number" id="wz-paid" class="form-control" value="${wizardData.paidAmount}" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Assign Legal SPOC *</label>
            <select class="form-control" id="wz-spoc">
              ${spocsList.map(s => `
                <option value="${s.id || s.spocId}" ${(wizardData.spocId === (s.id || s.spocId)) ? 'selected' : ''}>
                  ${s.name} (${s.title || 'Legal Specialist'})
                </option>
              `).join('')}
            </select>
          </div>
        </form>
      `;
    } else if (wizardStep === 4) {
      const assignedSpocObj = spocsList.find(s => (s.id || s.spocId) === wizardData.spocId);
      const spocDisplay = assignedSpocObj ? `${assignedSpocObj.name} (${assignedSpocObj.title})` : wizardData.spocId;

      bodyHtml = `
        ${wizardBar}
        <div style="background-color: var(--bg-app); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem;">
          <h4 style="font-family: var(--font-heading); font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Summary Review</h4>
          
          <div style="display: flex; flex-direction: column; gap: 0.65rem; font-size: 0.875rem;">
            <div><strong>Company:</strong> ${wizardData.companyName}</div>
            <div><strong>Contact:</strong> ${wizardData.contactPerson} (${wizardData.mobile})</div>
            <div><strong>Email Login:</strong> ${wizardData.email}</div>
            <div><strong>State:</strong> ${wizardData.state}</div>
            <div><strong>Primary Service:</strong> ${wizardData.primaryService}</div>
            ${wizardData.miscService && wizardData.miscService !== 'None' ? `<div><strong>Miscellaneous Services:</strong> ${wizardData.miscService}</div>` : ''}
            <div><strong>Number of DSC:</strong> ${wizardData.dscCount}</div>
            <div><strong>Name RUN:</strong> ${wizardData.nameRun ? 'Yes (Enabled)' : 'No'}</div>
            <div><strong>Total Fee:</strong> ₹${Number(wizardData.totalAmount).toLocaleString('en-IN')}</div>
            <div><strong>Paid Amount:</strong> ₹${Number(wizardData.paidAmount).toLocaleString('en-IN')}</div>
            <div><strong>Assigned SPOC:</strong> ${spocDisplay}</div>
          </div>
        </div>
      `;
    }

    const footerHtml = `
      ${wizardStep > 1 ? `<button class="btn btn-secondary" id="wz-prev-btn">← Back</button>` : `<button class="btn btn-secondary js-modal-cancel">Cancel</button>`}
      ${wizardStep < 4 ? `<button class="btn btn-primary" id="wz-next-btn">Next Step →</button>` : `<button class="btn btn-success" id="wz-submit-btn">${icons.check} Create Client Account</button>`}
    `;

    modal.open({
      title: 'Create Client Account Wizard',
      bodyHtml,
      footerHtml,
      size: 'lg',
      onOpen: (dialog) => {
        const cancelBtn = dialog.querySelector('.js-modal-cancel');
        if (cancelBtn) cancelBtn.onclick = () => modal.close();

        const prevBtn = dialog.querySelector('#wz-prev-btn');
        if (prevBtn) prevBtn.onclick = () => { wizardStep--; renderWizardContent(); };

        const nextBtn = dialog.querySelector('#wz-next-btn');
        if (nextBtn) {
          nextBtn.onclick = async () => {
            if (wizardStep === 1) {
              const name = dialog.querySelector('#wz-name').value.trim();
              const contact = dialog.querySelector('#wz-contact').value.trim();
              const mobile = dialog.querySelector('#wz-mobile').value.trim();
              const email = dialog.querySelector('#wz-email').value.trim();
              const state = dialog.querySelector('#wz-state').value;

              if (!name || !email || !mobile) {
                toast.error('Validation Error', 'Please fill in all mandatory fields.');
                return;
              }

              // Check existing client duplicate email rule
              const existingClients = await clientService.getClients();
              const existing = existingClients.find(c => c.email.toLowerCase() === email.toLowerCase());
              
              if (existing) {
                if (confirm(`Existing Client Found!\n\nAccount "${existing.companyName}" already exists for ${email}.\n\nWould you like to add this new service to the existing account instead?`)) {
                  modal.close();
                  window.location.hash = `#admin/clients/${existing.id}`;
                  return;
                }
              }

              wizardData = { ...wizardData, companyName: name, contactPerson: contact, mobile, email, state };
            } else if (wizardStep === 2) {
              const primary = dialog.querySelector('#wz-primary-service').value;
              const misc = dialog.querySelector('#wz-misc-service').value;
              const dsc = parseInt(dialog.querySelector('#wz-dsc-count').value || '2', 10);
              const run = dialog.querySelector('#wz-name-run').checked;

              wizardData.primaryService = primary;
              wizardData.miscService = misc;
              wizardData.dscCount = isNaN(dsc) ? 2 : dsc;
              wizardData.nameRun = run;

              const miscLabel = (misc && misc !== 'None') ? ` + ${misc}` : '';
              wizardData.serviceType = `${primary}${miscLabel}`;
              wizardData.companyType = primary;
            } else if (wizardStep === 3) {
              wizardData.totalAmount = dialog.querySelector('#wz-total').value;
              wizardData.paidAmount = dialog.querySelector('#wz-paid').value;
              wizardData.spocId = dialog.querySelector('#wz-spoc').value;
            }

            wizardStep++;
            renderWizardContent();
          };
        }

        const submitBtn = dialog.querySelector('#wz-submit-btn');
        if (submitBtn) {
          submitBtn.onclick = async () => {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Account...';

            const clientResult = await clientService.createClient(wizardData);
            if (clientResult.success) {
              await serviceService.addServiceToClient(clientResult.client.id, {
                serviceType: wizardData.serviceType,
                primaryService: wizardData.primaryService,
                miscService: wizardData.miscService,
                companyType: wizardData.primaryService,
                dscCount: wizardData.dscCount,
                nameRun: wizardData.nameRun,
                state: wizardData.state,
                totalAmount: wizardData.totalAmount,
                paidAmount: wizardData.paidAmount,
                spocId: wizardData.spocId
              });

              toast.success('Client Created', `Account ${clientResult.client.companyName} (${clientResult.client.id}) created! Login credentials sent automatically.`);
              modal.close();
              if (window.appInstance) {
                window.appInstance.handleRoute();
              }
            } else {
              toast.error('Error', clientResult.message);
              submitBtn.disabled = false;
            }
          };
        }
      }
    });
  };

  renderWizardContent();
}
