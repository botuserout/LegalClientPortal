/**
 * Legal Sthal - Client Support View
 */

import { spocService } from '../../services/spocService.js';
import { renderSpocCard, icons } from '../../ui/components.js';

export async function renderClientSupport() {
  const spocs = await spocService.getSpocs();
  const primarySpoc = spocs[1] || spocs[0];

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Client Support & Desk</h1>
        <p class="page-subtitle">Need help with your filings or compliance? Connect directly with your assigned executive.</p>
      </div>
    </div>

    <div class="grid-2">
      <!-- Assigned SPOC Card -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${icons.profile} Your Assigned Point of Contact</h3>
        </div>
        <div class="card-body">
          ${renderSpocCard(primarySpoc)}
        </div>
      </div>

      <!-- General Customer Support Hotline Card -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${icons.support} Legal Sthal Helpdesk</h3>
        </div>
        <div class="card-body">
          <p style="font-size: 0.9375rem; color: var(--text-muted); margin-bottom: 1.25rem; line-height: 1.5;">
            Our support team is available Monday through Saturday, 9:30 AM to 6:30 PM IST.
          </p>

          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            <div style="display: flex; align-items: center; gap: 0.85rem; padding: 0.75rem; background-color: var(--bg-app); border-radius: var(--radius-md);">
              <div style="color: var(--primary-500);">${icons.phone}</div>
              <div>
                <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Support Hotline</span>
                <strong style="color: var(--text-main);">+91 1800-123-4567 / +91 98765 00000</strong>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.85rem; padding: 0.75rem; background-color: var(--bg-app); border-radius: var(--radius-md);">
              <div style="color: var(--primary-500);">${icons.email}</div>
              <div>
                <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Official Support Email</span>
                <strong style="color: var(--text-main);">support@legalsthal.com</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
