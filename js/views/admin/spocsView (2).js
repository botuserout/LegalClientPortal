/**
 * Legal Sthal - Admin SPOC Management View
 */

import { spocService } from '../../services/spocService.js';
import { renderStatusBadge, icons } from '../../ui/components.js';

export async function renderAdminSpocs() {
  const spocs = await spocService.getSpocs();

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Legal SPOC Directory</h1>
        <p class="page-subtitle">Manage client relationship executives, active workloads, and assignments.</p>
      </div>
    </div>

    <div class="grid-3">
      ${spocs.map(spoc => `
        <div class="card">
          <div class="card-body">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
              <img src="${spoc.avatar}" alt="${spoc.name}" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover;" />
              <div>
                <h3 style="font-family: var(--font-heading); font-size: 1.1rem; font-weight: 700;">${spoc.name}</h3>
                <div style="font-size: 0.8125rem; color: var(--primary-500); font-weight: 600;">${spoc.title}</div>
              </div>
            </div>

            <div style="background-color: var(--bg-app); border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-bottom: 1rem; display: flex; justify-content: space-between;">
              <span style="font-size: 0.8125rem; color: var(--text-muted);">Assigned Clients</span>
              <strong style="font-weight: 700;">${spoc.assignedClientsCount} Services</strong>
            </div>

            <div style="font-size: 0.8125rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.35rem;">
              <div>${icons.phone} ${spoc.mobile}</div>
              <div>${icons.email} ${spoc.email}</div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
