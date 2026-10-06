/**
 * Legal Sthal - Admin Clients Master Table & Multi-step Client Creator Wizard
 */

import { clientService } from '../../services/clientService.js';
import { serviceService } from '../../services/serviceService.js';
import { spocService } from '../../services/spocService.js';
import { modal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';
import { renderStatusBadge, icons } from '../../ui/components.js';

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

          <select class="form-control" id="client-filter-state" style="width: 160px; padding: 0.55rem 0.85rem; background-color: #181f32; color: #f8fafc; border: 1px solid rgba(212, 175, 55, 0.3); border-radius: var(--radius-md);">
            <option value="ALL">All States</option>
            <option value="Gujarat">Gujarat</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Kerala">Kerala</option>
            <option value="Telangana">Telangana</option>
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
  if (clientsEventsBound) return;
  clientsEventsBound = true;

  document.addEventListener('click', (e) => {
    if (e.target.closest('.js-open-create-client-wizard, .js-trigger-create-client')) {
      openCreateClientWizard();
    }
  });
}

export function openCreateClientWizard() {
  let wizardStep = 1;
  let wizardData = {
    companyName: '',
    contactPerson: '',
    email: '',
    mobile: '',
    state: 'Gujarat',
    address: '',
    serviceType: 'Company Incorporation',
    companyType: 'Private Limited',
    totalAmount: 9999,
    paidAmount: 499,
    spocId: 'SPOC001',
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
                <option value="Gujarat" ${wizardData.state === 'Gujarat' ? 'selected' : ''}>Gujarat</option>
                <option value="Maharashtra" ${wizardData.state === 'Maharashtra' ? 'selected' : ''}>Maharashtra</option>
                <option value="Karnataka" ${wizardData.state === 'Karnataka' ? 'selected' : ''}>Karnataka</option>
                <option value="Delhi" ${wizardData.state === 'Delhi' ? 'selected' : ''}>Delhi</option>
                <option value="Telangana" ${wizardData.state === 'Telangana' ? 'selected' : ''}>Telangana</option>
              </select>
            </div>
          </div>
        </form>
      `;
    } else if (wizardStep === 2) {
      bodyHtml = `
        ${wizardBar}
        <form id="wz-step-2-form">
          <div class="form-group">
            <label class="form-label">Select Initial Service *</label>
            <select class="form-control" id="wz-service-type">
              <option value="Company Incorporation" ${wizardData.serviceType.includes('Incorporation') ? 'selected' : ''}>Company Incorporation</option>
              <option value="GST Registration" ${wizardData.serviceType.includes('GST') ? 'selected' : ''}>GST Registration</option>
              <option value="MSME Registration" ${wizardData.serviceType.includes('MSME') ? 'selected' : ''}>MSME Registration</option>
              <option value="Startup India Recognition" ${wizardData.serviceType.includes('Startup') ? 'selected' : ''}>Startup India Recognition</option>
              <option value="Annual Corporate Compliance" ${wizardData.serviceType.includes('Compliance') ? 'selected' : ''}>Annual Corporate Compliance</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Entity Constitution</label>
            <select class="form-control" id="wz-company-type">
              <option value="Private Limited">Private Limited</option>
              <option value="LLP">Limited Liability Partnership (LLP)</option>
              <option value="One Person Company (OPC)">One Person Company (OPC)</option>
              <option value="Sole Proprietorship">Sole Proprietorship</option>
            </select>
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
              <option value="SPOC001" ${wizardData.spocId === 'SPOC001' ? 'selected' : ''}>Priya Shah (Senior Incorporation Expert)</option>
              <option value="SPOC002" ${wizardData.spocId === 'SPOC002' ? 'selected' : ''}>Rahul Sharma (Client Relationship Executive)</option>
              <option value="SPOC003" ${wizardData.spocId === 'SPOC003' ? 'selected' : ''}>Amit Verma (Tax & Compliance Specialist)</option>
            </select>
          </div>
        </form>
      `;
    } else if (wizardStep === 4) {
      bodyHtml = `
        ${wizardBar}
        <div style="background-color: var(--bg-app); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem;">
          <h4 style="font-family: var(--font-heading); font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Summary Review</h4>
          
          <div style="display: flex; flex-direction: column; gap: 0.65rem; font-size: 0.875rem;">
            <div><strong>Company:</strong> ${wizardData.companyName}</div>
            <div><strong>Contact:</strong> ${wizardData.contactPerson} (${wizardData.mobile})</div>
            <div><strong>Email Login:</strong> ${wizardData.email}</div>
            <div><strong>State:</strong> ${wizardData.state}</div>
            <div><strong>Service Onboarding:</strong> ${wizardData.serviceType} (${wizardData.companyType})</div>
            <div><strong>Total Fee:</strong> ₹${Number(wizardData.totalAmount).toLocaleString('en-IN')}</div>
            <div><strong>Paid Amount:</strong> ₹${Number(wizardData.paidAmount).toLocaleString('en-IN')}</div>
            <div><strong>Assigned SPOC:</strong> ${wizardData.spocId}</div>
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
              wizardData.serviceType = dialog.querySelector('#wz-service-type').value;
              wizardData.companyType = dialog.querySelector('#wz-company-type').value;
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
                companyType: wizardData.companyType,
                state: wizardData.state,
                totalAmount: wizardData.totalAmount,
                paidAmount: wizardData.paidAmount,
                spocId: wizardData.spocId
              });

              toast.success('Client Created', `Account ${clientResult.client.companyName} (${clientResult.client.id}) created! Login credentials sent automatically.`);
              modal.close();
              window.location.reload();
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
