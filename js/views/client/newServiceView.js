/**
 * Legal Sthal - Client Avail New Services Catalog View
 * Implementation of the 31-Service Catalog with Category Filtering & BRD Workflow Distinction
 */

import { serviceService } from '../../services/serviceService.js';
import { quoteService } from '../../services/quoteService.js';
import { authService } from '../../services/authService.js';
import { modal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';
import { icons } from '../../ui/components.js';

let currentCategory = 'All';
let searchQuery = '';

export async function renderClientNewServices() {
  const catalog = await serviceService.getCatalogServices();
  const categories = await serviceService.getCategories();
  const user = authService.getCurrentUser();

  const filteredCatalog = catalog.filter(srv => {
    const matchesCategory = currentCategory === 'All' || srv.category === currentCategory;
    const matchesSearch = !searchQuery || 
      srv.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      srv.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const trackedCount = catalog.filter(c => c.portalTracking).length;

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Service Catalog & Offerings</h1>
        <p class="page-subtitle">Explore Legal Sthal's 31 professional legal, tax, incorporation, and compliance services.</p>
      </div>
      <div class="page-actions">
        <a href="#client/quote-requests" class="btn btn-secondary">
          ${icons.quotes} View My Quote Requests
        </a>
      </div>
    </div>

    <!-- Architecture Banner -->
    <div class="card" style="margin-bottom: 1.5rem; border-left: 4px solid var(--accent-gold); background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(11, 19, 37, 0.6) 100%);">
      <div class="card-body" style="padding: 1.25rem 1.5rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
              <span style="color: var(--accent-gold); font-weight: 700; font-family: var(--font-heading); font-size: 1.1rem;">
                Legal Sthal Dual Service Architecture
              </span>
            </div>
            <p style="font-size: 0.875rem; color: var(--text-muted); margin: 0; max-width: 850px; line-height: 1.5;">
              <strong style="color: var(--accent-gold);">${trackedCount} Primary Services</strong> (Company Incorporation, GST, MSME, Startup India, Compliances) feature <strong>BRD-integrated Portal Workflows</strong> with active stage tracking & instant document submissions. All <strong>31 Public Services</strong> are available for custom quotes and CA/CS consultation.
            </p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <span class="badge badge-success" style="padding: 0.4rem 0.75rem; font-size: 0.75rem;">
              ✓ BRD Workflow Enabled (${trackedCount})
            </span>
            <span class="badge badge-neutral" style="padding: 0.4rem 0.75rem; font-size: 0.75rem;">
              Catalog Inquiry (${catalog.length - trackedCount})
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters & Search Bar -->
    <div style="margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
      <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 280px; position: relative;">
          <input 
            type="text" 
            id="catalog-search-input" 
            class="form-control" 
            placeholder="Search across all 31 Legal Sthal services (e.g. GST, Incorporation, Trademark, ISO)..."
            value="${searchQuery}" 
            style="padding-left: 2.5rem;"
          />
          <span style="position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: var(--text-muted);">
            ${icons.search || '🔍'}
          </span>
        </div>
        <div style="font-size: 0.875rem; color: var(--text-muted); white-space: nowrap;">
          Showing <strong>${filteredCatalog.length}</strong> of <strong>${catalog.length}</strong> services
        </div>
      </div>

      <!-- Category Tabs -->
      <div class="category-tabs-container" style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem; scrollbar-width: thin;">
        ${categories.map(cat => `
          <button 
            class="btn btn-sm js-category-tab ${currentCategory === cat ? 'btn-primary' : 'btn-secondary'}" 
            data-category="${cat}"
            style="white-space: nowrap; border-radius: 20px; font-weight: 500; font-size: 0.8125rem; padding: 0.4rem 0.85rem;"
          >
            ${cat}
          </button>
        `).join('')}
      </div>
    </div>

    <!-- Catalog Grid -->
    ${filteredCatalog.length === 0 ? `
      <div class="card" style="text-align: center; padding: 3rem 1.5rem;">
        <p style="font-size: 1.125rem; color: var(--text-muted); margin-bottom: 1rem;">No services match your search query or filter.</p>
        <button class="btn btn-secondary js-reset-catalog-filters" style="margin: 0 auto;">Reset Filters</button>
      </div>
    ` : `
      <div class="grid-3" id="catalog-services-grid">
        ${filteredCatalog.map(srv => `
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; position: relative; ${srv.portalTracking ? 'border: 1px solid rgba(212, 175, 55, 0.3);' : ''}">
            <div class="card-body">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.75rem;">
                <span class="badge badge-neutral" style="font-size: 0.7rem;">${srv.category}</span>
                ${srv.portalTracking ? `
                  <span class="badge badge-success" title="BRD-approved portal workflow with live stage tracking" style="font-size: 0.7rem;">
                    Portal Workflow
                  </span>
                ` : srv.featured ? `
                  <span class="badge badge-info" style="font-size: 0.7rem;">Featured</span>
                ` : ''}
              </div>

              <h3 style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem; line-height: 1.3;">
                ${srv.name}
              </h3>

              <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 1.25rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; height: 3.8em;">
                ${srv.shortDescription}
              </p>

              <div style="margin-bottom: 1.25rem; background-color: rgba(255, 255, 255, 0.02); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--divider);">
                <div style="font-size: 0.7rem; text-transform: uppercase; font-weight: 700; color: var(--accent-gold); margin-bottom: 0.4rem; letter-spacing: 0.5px;">Key Inclusions</div>
                <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; color: var(--text-main);">
                  ${(srv.benefits || []).slice(0, 3).map(b => `
                    <li style="display: flex; align-items: center; gap: 0.4rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      <span style="color: var(--accent-gold); font-weight: 700;">✓</span> ${b}
                    </li>
                  `).join('')}
                </ul>
              </div>
            </div>

            <div class="card-footer" style="background-color: var(--bg-card); border-top: 1px solid var(--divider); padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
              <div>
                <span style="font-size: 0.7rem; color: var(--text-muted); display: block;">Starting Fee</span>
                <strong style="font-size: 1.15rem; font-weight: 700; color: var(--text-main);">₹${srv.price.toLocaleString('en-IN')}</strong>
              </div>

              <div style="display: flex; gap: 0.4rem;">
                <button class="btn btn-secondary btn-sm js-explore-details-btn" data-service-id="${srv.id}">
                  Details
                </button>
                <button class="btn btn-primary btn-sm js-request-quote-btn" data-service-id="${srv.id}" data-service-name="${srv.name}">
                  ${srv.portalTracking ? 'Avail Service' : 'Request Quote'}
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

export function bindClientNewServicesEvents() {
  // Search input event
  const searchInput = document.getElementById('catalog-search-input');
  if (searchInput) {
    searchInput.oninput = (e) => {
      searchQuery = e.target.value;
      reRenderCatalog();
    };
  }

  // Category filter tabs
  document.querySelectorAll('.js-category-tab').forEach(tab => {
    tab.onclick = () => {
      currentCategory = tab.dataset.category;
      reRenderCatalog();
    };
  });

  // Reset filters
  const resetBtn = document.querySelector('.js-reset-catalog-filters');
  if (resetBtn) {
    resetBtn.onclick = () => {
      currentCategory = 'All';
      searchQuery = '';
      reRenderCatalog();
    };
  }

  // Explore Details Modal
  document.querySelectorAll('.js-explore-details-btn').forEach(btn => {
    btn.onclick = async () => {
      const serviceId = btn.dataset.serviceId;
      const srv = await serviceService.getCatalogServiceById(serviceId);
      if (!srv) return;

      modal.open({
        title: `${srv.name}`,
        bodyHtml: `
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem; justify-content: space-between;">
              <div>
                <span class="badge badge-neutral">${srv.category}</span>
                ${srv.portalTracking ? '<span class="badge badge-success" style="margin-left: 0.5rem;">BRD Tracked Workflow</span>' : ''}
              </div>
              <strong style="font-size: 1.35rem; color: var(--accent-gold);">₹${srv.price.toLocaleString('en-IN')}</strong>
            </div>

            <div>
              <h4 style="font-size: 0.9rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin-bottom: 0.4rem;">Service Overview</h4>
              <p style="font-size: 0.9rem; color: var(--text-main); line-height: 1.6;">${srv.details?.overview || srv.shortDescription}</p>
            </div>

            ${(srv.benefits && srv.benefits.length > 0) ? `
              <div>
                <h4 style="font-size: 0.9rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin-bottom: 0.5rem;">Key Benefits & Deliverables</h4>
                <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.875rem;">
                  ${srv.benefits.map(b => `<li style="display: flex; align-items: center; gap: 0.5rem;"><span style="color: var(--accent-gold); font-weight: 700;">✓</span> ${b}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            ${(srv.details?.requiredDocuments && srv.details.requiredDocuments.length > 0) ? `
              <div style="background-color: var(--bg-app); padding: 1rem; border-radius: 8px; border: 1px solid var(--divider);">
                <h4 style="font-size: 0.85rem; text-transform: uppercase; font-weight: 700; color: var(--accent-gold); margin-bottom: 0.5rem;">Required Verification Documents</h4>
                <ul style="padding-left: 1.25rem; margin: 0; font-size: 0.85rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.35rem;">
                  ${srv.details.requiredDocuments.map(doc => `<li>${doc}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            ${(srv.details?.process && srv.details.process.length > 0) ? `
              <div>
                <h4 style="font-size: 0.9rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin-bottom: 0.5rem;">Standard Execution Stages</h4>
                <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                  ${srv.details.process.map((p, idx) => `
                    <div style="display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; color: var(--text-main);">
                      <span style="width: 22px; height: 22px; border-radius: 50%; background: var(--accent-gold); color: #000; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem; flex-shrink: 0;">${idx + 1}</span>
                      <span>${p}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${(srv.details?.faqs && srv.details.faqs.length > 0) ? `
              <div>
                <h4 style="font-size: 0.9rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin-bottom: 0.5rem;">Frequently Asked Questions</h4>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                  ${srv.details.faqs.map(faq => `
                    <div style="background: rgba(255, 255, 255, 0.02); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--divider);">
                      <strong style="font-size: 0.85rem; color: var(--text-main); display: block; margin-bottom: 0.2rem;">Q: ${faq.q}</strong>
                      <span style="font-size: 0.8rem; color: var(--text-muted);">A: ${faq.a}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        `,
        footerHtml: `
          <button class="btn btn-secondary js-modal-cancel">Close</button>
          <button class="btn btn-primary js-modal-request-quote" data-service-name="${srv.name}">
            ${srv.portalTracking ? 'Avail Service Now' : 'Request Official Quote'}
          </button>
        `,
        onOpen: () => {
          document.querySelector('.js-modal-cancel').onclick = () => modal.close();
          const reqBtn = document.querySelector('.js-modal-request-quote');
          if (reqBtn) {
            reqBtn.onclick = () => {
              modal.close();
              triggerQuoteModal(srv.name);
            };
          }
        }
      });
    };
  });

  // Request Quote Buttons
  document.querySelectorAll('.js-request-quote-btn').forEach(btn => {
    btn.onclick = () => {
      const serviceName = btn.dataset.serviceName;
      triggerQuoteModal(serviceName);
    };
  });
}

async function reRenderCatalog() {
  const container = document.getElementById('main-content');
  if (container) {
    container.innerHTML = await renderClientNewServices();
    bindClientNewServicesEvents();
  }
}

function triggerQuoteModal(serviceName) {
  const user = authService.getCurrentUser() || { clientId: 'CL001', companyName: 'ABC Technologies Pvt Ltd', email: 'abc@gmail.com', contactPerson: 'Rahul Mehta' };

  modal.open({
    title: `Request Quote / Avail Service — ${serviceName}`,
    bodyHtml: `
      <form id="quote-request-modal-form">
        <div class="form-group">
          <label class="form-label">Client Name</label>
          <input type="text" class="form-control" value="${user.companyName || user.name || 'Client'}" readonly style="background-color: var(--bg-app);" />
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-control" id="qr-email" value="${user.email || 'client@legalsthal.com'}" readonly style="background-color: var(--bg-app);" />
          </div>
          <div class="form-group">
            <label class="form-label">Mobile</label>
            <input type="text" class="form-control" id="qr-mobile" value="${user.mobile || '+91 98765 43210'}" required />
          </div>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Selected Service Offering</label>
            <input type="text" class="form-control" id="qr-service" value="${serviceName}" readonly style="background-color: var(--bg-app);" />
          </div>
          <div class="form-group">
            <label class="form-label">State / Jurisdiction</label>
            <select class="form-control" id="qr-state">
              <option value="Gujarat" selected>Gujarat</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Delhi">Delhi</option>
              <option value="Telangana">Telangana</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Haryana">Haryana</option>
              <option value="International (UK/US)">International (UK/US)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Specific Requirement / Remarks</label>
          <textarea class="form-control" id="qr-remarks" rows="3" placeholder="Specify your business scope, timeline, or preferred consultation slot..."></textarea>
        </div>
      </form>
    `,
    footerHtml: `
      <button class="btn btn-secondary js-modal-cancel">Cancel</button>
      <button class="btn btn-primary" id="submit-quote-request-btn">${icons.check} Submit Request</button>
    `,
    onOpen: () => {
      document.querySelector('.js-modal-cancel').onclick = () => modal.close();
      document.getElementById('submit-quote-request-btn').onclick = async () => {
        const submitBtn = document.getElementById('submit-quote-request-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        await quoteService.createQuoteRequest({
          clientId: user.clientId || 'CL001',
          clientName: user.companyName || user.name || 'Client',
          serviceName: serviceName,
          companyType: 'Private Limited',
          state: document.getElementById('qr-state').value,
          mobile: document.getElementById('qr-mobile').value,
          email: user.email || 'client@legalsthal.com',
          remarks: document.getElementById('qr-remarks').value
        });

        toast.success('Request Submitted', `Your request for '${serviceName}' has been received. Our team will contact you shortly.`);
        modal.close();
        window.location.hash = '#client/quote-requests';
      };
    }
  });
}
