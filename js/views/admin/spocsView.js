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
              <div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, rgba(212, 175, 55, 0.22), rgba(212, 175, 55, 0.06)); border: 1.5px solid var(--primary-500); display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--primary-500); font-size: 1.1rem; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);">
                ${spoc.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <h3 style="font-family: var(--font-heading); font-size: 1.1rem; font-weight: 700; margin-bottom: 0.2rem;">${spoc.name}</h3>
                <div style="font-size: 0.8125rem; color: var(--primary-500); font-weight: 600;">${spoc.title}</div>
              </div>
            </div>

            <div style="background-color: var(--bg-app); border: 1px solid var(--divider); border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.8125rem; color: var(--text-muted); font-weight: 600;">Assigned Workload</span>
              <strong style="font-weight: 700; color: var(--text-main); font-size: 0.9375rem;">${spoc.activeWorkload !== undefined ? spoc.activeWorkload : (spoc.assignedClientsCount || 0)} Services</strong>
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
