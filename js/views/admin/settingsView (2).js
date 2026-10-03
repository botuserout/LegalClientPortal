/**
 * Legal Sthal - Admin System Settings View
 * Configuration interface for Branding, Google Apps Script Endpoint, and Backend Gateways
 */

import { icons } from '../../ui/components.js';
import { apiClient } from '../../services/apiClient.js';
import { toast } from '../../ui/toast.js';

export async function renderAdminSettings() {
  const currentUrl = apiClient.getEndpointUrl();
  const isLive = apiClient.isLiveEndpointConfigured();

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Admin Portal Settings & Integration</h1>
        <p class="page-subtitle">Configure operational preferences, Google Apps Script backend, and system branding.</p>
      </div>
    </div>

    <div class="grid-2">
      <!-- Portal Branding -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${icons.settings} Portal Branding & Operational Info</h3>
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
          <div class="form-group">
            <label class="form-label">Office Headquarters</label>
            <input type="text" class="form-control" value="102 Tech Park, SG Highway, Ahmedabad, Gujarat - 380054" />
          </div>
          <button class="btn btn-secondary" id="save-branding-btn">
            Save Branding Info
          </button>
        </div>
      </div>

      <!-- Apps Script Integration -->
      <div class="card" style="border: 1px solid rgba(212, 175, 55, 0.4);">
        <div class="card-header" style="display: flex; align-items: center; justify-content: space-between;">
          <h3 class="card-title">${icons.sync} Google Apps Script Backend Gateway</h3>
          <span class="badge ${isLive ? 'badge-success' : 'badge-neutral'}" id="endpoint-status-badge">
            ${isLive ? 'Live Apps Script Active' : 'Standby Mock Mode'}
          </span>
        </div>
        <div class="card-body">
          <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 1rem;">
            Connect your Legal Sthal portal to a deployed <strong>Google Apps Script Web App</strong>. All client onboarding, stage transitions, document Drive uploads, and quote inquiries will write directly to your Google Sheet database.
          </p>

          <div class="form-group">
            <label class="form-label">Apps Script Deployment Endpoint URL</label>
            <input 
              type="url" 
              id="appscript-url-input" 
              class="form-control" 
              placeholder="https://script.google.com/macros/s/AKfycb.../exec" 
              value="${currentUrl}" 
            />
            <div class="form-hint" style="margin-top: 0.4rem; font-size: 0.75rem;">
              Endpoint generated after clicking <em>Deploy → New Deployment → Web App</em> in Apps Script.
            </div>
          </div>

          <div style="background-color: rgba(255, 255, 255, 0.02); border: 1px solid var(--divider); padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1.25rem;">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--accent-gold); text-transform: uppercase; margin-bottom: 0.25rem;">Backend Files Ready</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">
              Backend scripts are located in <a href="file:///c:/Users/acer/OneDrive/Desktop/LegalClientPortal/backend/Code.gs" style="color: var(--accent-gold); text-decoration: underline;">backend/Code.gs</a> & deployment instructions in <a href="file:///c:/Users/acer/OneDrive/Desktop/LegalClientPortal/backend/README.md" style="color: var(--accent-gold); text-decoration: underline;">backend/README.md</a>.
            </div>
          </div>

          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-secondary" id="test-appscript-btn">
              ${icons.sync || '🔄'} Test Connection
            </button>
            <button class="btn btn-primary" id="save-appscript-btn">
              ${icons.check} Save Endpoint Settings
            </button>
          </div>

          <div id="connection-test-result" style="margin-top: 1rem; display: none;"></div>
        </div>
      </div>
    </div>
  `;
}

export function bindAdminSettingsEvents() {
  const saveBrandingBtn = document.getElementById('save-branding-btn');
  if (saveBrandingBtn) {
    saveBrandingBtn.onclick = () => {
      toast.success('Branding Saved', 'Portal identity information has been updated.');
    };
  }

  const saveAppscriptBtn = document.getElementById('save-appscript-btn');
  if (saveAppscriptBtn) {
    saveAppscriptBtn.onclick = async () => {
      const urlInput = document.getElementById('appscript-url-input');
      const newUrl = urlInput ? urlInput.value.trim() : '';

      apiClient.setEndpointUrl(newUrl);
      const isLive = apiClient.isLiveEndpointConfigured();

      const badge = document.getElementById('endpoint-status-badge');
      if (badge) {
        badge.className = `badge ${isLive ? 'badge-success' : 'badge-neutral'}`;
        badge.textContent = isLive ? 'Live Apps Script Active' : 'Standby Mock Mode';
      }

      toast.success('Integration Saved', isLive ? 'Connected to live Google Apps Script endpoint.' : 'Set to Standby Mock Mode.');
    };
  }

  const testBtn = document.getElementById('test-appscript-btn');
  if (testBtn) {
    testBtn.onclick = async () => {
      const urlInput = document.getElementById('appscript-url-input');
      const testUrl = urlInput ? urlInput.value.trim() : null;
      const resultDiv = document.getElementById('connection-test-result');

      testBtn.disabled = true;
      testBtn.textContent = 'Testing...';

      if (resultDiv) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-muted);">Pinging Google Apps Script endpoint...</div>';
      }

      const res = await apiClient.testConnection(testUrl);

      testBtn.disabled = false;
      testBtn.textContent = 'Test Connection';

      if (resultDiv) {
        if (res.success) {
          resultDiv.innerHTML = `
            <div style="background-color: rgba(46, 204, 113, 0.1); border: 1px solid var(--success-main); padding: 0.75rem; border-radius: 6px; color: var(--success-main); font-size: 0.85rem;">
              <strong>✓ Connection Successful!</strong><br/>
              ${res.message}<br/>
              <span style="font-size: 0.75rem; opacity: 0.8;">Mode: ${res.mode}</span>
            </div>
          `;
          toast.success('Connection Verified', res.message);
        } else {
          resultDiv.innerHTML = `
            <div style="background-color: rgba(231, 76, 60, 0.1); border: 1px solid var(--error-main, #e74c3c); padding: 0.75rem; border-radius: 6px; color: var(--text-main); font-size: 0.85rem;">
              <strong style="color: var(--error-main, #e74c3c);">⚠ Endpoint Notice (${res.mode})</strong><br/>
              ${res.message}
            </div>
          `;
          toast.info('Endpoint Status', res.message);
        }
      }
    };
  }
}
