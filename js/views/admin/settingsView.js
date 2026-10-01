/**
 * Legal Sthal - Admin System Settings View
 */

import { icons } from '../../ui/components.js';

export async function renderAdminSettings() {
  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Admin Portal Settings</h1>
        <p class="page-subtitle">Configure operational preferences, notification gateways, and system branding.</p>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${icons.settings} Portal Branding & Identity</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Platform Title</label>
            <input type="text" class="form-control" value="Legal Sthal" />
          </div>
          <div class="form-group">
            <label class="form-label">Support Phone Hotline</label>
            <input type="text" class="form-control" value="+91 1800-123-4567" />
          </div>
          <div class="form-group">
            <label class="form-label">Support Email Address</label>
            <input type="text" class="form-control" value="support@legalsthal.com" />
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${icons.sync} Google Apps Script Web App Integration</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Apps Script Deployment Endpoint URL</label>
            <input type="text" class="form-control" placeholder="https://script.google.com/macros/s/.../exec" value="https://script.google.com/macros/s/AKfycbx_mock_legalsthal_script/exec" />
            <div class="form-hint">Service abstraction layer is configured to switch cleanly to this endpoint.</div>
          </div>
          <button class="btn btn-primary" onclick="alert('Google Apps Script URL updated!')">
            Save Integration Settings
          </button>
        </div>
      </div>
    </div>
  `;
}
