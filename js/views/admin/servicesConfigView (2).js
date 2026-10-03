/**
 * Legal Sthal - Admin Service Catalog Configuration View
 * Management interface for 31 Public Services & BRD-Tracked Workflows
 */

import { serviceService } from '../../services/serviceService.js';
import { renderStatusBadge, icons } from '../../ui/components.js';
import { modal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';

let adminCategoryFilter = 'All';
let adminSearchQuery = '';

export async function renderAdminServicesConfig() {
  const catalog = await serviceService.getCatalogServices();
  const categories = await serviceService.getCategories();

  const filteredCatalog = catalog.filter(cat => {
    const matchesCategory = adminCategoryFilter === 'All' || cat.category === adminCategoryFilter;
    const matchesSearch = !adminSearchQuery || 
      cat.name.toLowerCase().includes(adminSearchQuery.toLowerCase()) || 
      cat.category.toLowerCase().includes(adminSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalServices = catalog.length;
  const brdTracked = catalog.filter(c => c.portalTracking).length;
  const activeOfferings = catalog.filter(c => c.status === 'active' || c.active).length;
  const totalCategories = categories.length - 1; // excluding 'All'

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Service Catalog Architecture & Pricing</h1>
        <p class="page-subtitle">Configure 31 Legal Sthal service offerings, BRD portal workflow bindings, and base pricing.</p>
      </div>
    </div>

    <!-- Admin Metric Cards -->
    <div class="grid-4" style="margin-bottom: 1.5rem;">
      <div class="stat-card">
        <div class="stat-label">Total Catalog Services</div>
        <div class="stat-value">${totalServices}</div>
        <div class="stat-meta" style="color: var(--accent-gold);">Across 10 Practice Categories</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">BRD Tracked Workflows</div>
        <div class="stat-value" style="color: var(--success-main);">${brdTracked}</div>
        <div class="stat-meta">Active Stage Progression Enabled</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Public Listings</div>
        <div class="stat-value">${totalServices - brdTracked}</div>
        <div class="stat-meta">Inquiry & Custom Quote Mode</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Active Offerings</div>
        <div class="stat-value">${activeOfferings}</div>
        <div class="stat-meta" style="color: var(--success-main);">Visible on Client Portal</div>
      </div>
    </div>

    <!-- Filter & Search Bar -->
    <div class="card" style="margin-bottom: 1.5rem;">
      <div class="card-body" style="padding: 1rem 1.25rem;">
        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 250px;">
            <input 
              type="text" 
              id="admin-catalog-search" 
              class="form-control" 
              placeholder="Search service name or category..." 
              value="${adminSearchQuery}"
            />
          </div>
          <div style="min-width: 200px;">
            <select id="admin-category-select" class="form-control">
              ${categories.map(cat => `
                <option value="${cat}" ${adminCategoryFilter === cat ? 'selected' : ''}>Category: ${cat}</option>
              `).join('')}
            </select>
          </div>
          <div style="font-size: 0.875rem; color: var(--text-muted);">
            Showing <strong>${filteredCatalog.length}</strong> services
          </div>
        </div>
      </div>
    </div>

    <!-- Catalog Table -->
    <div class="card">
      <div class="card-header" style="display: flex; align-items: center; justify-content: space-between;">
        <h3 class="card-title">${icons.services} Service Offerings Dataset (${filteredCatalog.length})</h3>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-container" style="border: none;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Service Name & Code</th>
                <th>Category</th>
                <th>Portal Tracking (BRD)</th>
                <th>Base Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filteredCatalog.map(cat => `
                <tr>
                  <td style="font-weight: 600;">
                    <div style="color: var(--text-main); font-size: 0.95rem;">${cat.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal; font-family: var(--font-mono); margin-top: 0.15rem;">ID: ${cat.id}</div>
                  </td>
                  <td><span class="badge badge-neutral">${cat.category}</span></td>
                  <td>
                    ${cat.portalTracking ? `
                      <span class="badge badge-success" style="font-size: 0.75rem;">
                        ✓ ${cat.brdServiceType || 'Tracked'}
                      </span>
                    ` : `
                      <span class="badge badge-neutral" style="font-size: 0.75rem; opacity: 0.8;">
                        Catalog Only
                      </span>
                    `}
                  </td>
                  <td style="font-weight: 700; color: var(--accent-gold);">
                    ₹${cat.price.toLocaleString('en-IN')}
                  </td>
                  <td>
                    ${(cat.status === 'active' || cat.active) ? renderStatusBadge('Active') : renderStatusBadge('Hidden')}
                  </td>
                  <td>
                    <button class="btn btn-secondary btn-sm js-edit-catalog-service-btn" data-service-id="${cat.id}">
                      Edit Offering
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

export function bindAdminServicesConfigEvents() {
  const searchInput = document.getElementById('admin-catalog-search');
  if (searchInput) {
    searchInput.oninput = (e) => {
      adminSearchQuery = e.target.value;
      reRenderAdminCatalog();
    };
  }

  const categorySelect = document.getElementById('admin-category-select');
  if (categorySelect) {
    categorySelect.onchange = (e) => {
      adminCategoryFilter = e.target.value;
      reRenderAdminCatalog();
    };
  }

  document.querySelectorAll('.js-edit-catalog-service-btn').forEach(btn => {
    btn.onclick = async () => {
      const serviceId = btn.dataset.serviceId;
      const srv = await serviceService.getCatalogServiceById(serviceId);
      if (!srv) return;

      modal.open({
        title: `Edit Offering — ${srv.name}`,
        bodyHtml: `
          <form id="edit-catalog-service-form">
            <div class="form-group">
              <label class="form-label">Service Name</label>
              <input type="text" class="form-control" id="edit-srv-name" value="${srv.name}" required />
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Category</label>
                <input type="text" class="form-control" id="edit-srv-category" value="${srv.category}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Base Price (INR ₹)</label>
                <input type="number" class="form-control" id="edit-srv-price" value="${srv.price}" required />
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">BRD Portal Tracking</label>
                <select class="form-control" id="edit-srv-portal-tracking">
                  <option value="true" ${srv.portalTracking ? 'selected' : ''}>Enabled (Active Stage Progression)</option>
                  <option value="false" ${!srv.portalTracking ? 'selected' : ''}>Disabled (Catalog Inquiry Mode)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Public Status</label>
                <select class="form-control" id="edit-srv-status">
                  <option value="active" ${srv.status === 'active' || srv.active ? 'selected' : ''}>Active (Visible to Clients)</option>
                  <option value="hidden" ${srv.status === 'hidden' || !srv.active ? 'selected' : ''}>Hidden / Draft</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Short Description</label>
              <textarea class="form-control" id="edit-srv-desc" rows="3">${srv.shortDescription}</textarea>
            </div>
          </form>
        `,
        footerHtml: `
          <button class="btn btn-secondary js-modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="save-catalog-service-btn">${icons.check} Save Changes</button>
        `,
        onOpen: () => {
          document.querySelector('.js-modal-cancel').onclick = () => modal.close();
          document.getElementById('save-catalog-service-btn').onclick = async () => {
            const updates = {
              name: document.getElementById('edit-srv-name').value,
              category: document.getElementById('edit-srv-category').value,
              price: Number(document.getElementById('edit-srv-price').value),
              portalTracking: document.getElementById('edit-srv-portal-tracking').value === 'true',
              status: document.getElementById('edit-srv-status').value,
              active: document.getElementById('edit-srv-status').value === 'active',
              shortDescription: document.getElementById('edit-srv-desc').value
            };

            await serviceService.updateCatalogService(serviceId, updates);
            toast.success('Catalog Updated', `Service '${updates.name}' has been updated.`);
            modal.close();
            reRenderAdminCatalog();
          };
        }
      });
    };
  });
}

async function reRenderAdminCatalog() {
  const container = document.getElementById('main-content');
  if (container) {
    container.innerHTML = await renderAdminServicesConfig();
    bindAdminServicesConfigEvents();
  }
}
