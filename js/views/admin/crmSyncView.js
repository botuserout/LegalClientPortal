/**
 * Legal Sthal - Admin Zoho CRM Sync Placeholder & Operational Monitor
 */

import { crmSyncService } from '../../services/crmSyncService.js';
import { renderStatusBadge, icons } from '../../ui/components.js';
import { toast } from '../../ui/toast.js';

export async function renderAdminCrmSync() {
  const syncObj = await crmSyncService.getCrmSync();

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Zoho CRM Integration Monitor</h1>
        <p class="page-subtitle">Synchronize portal accounts, deals, document attachments, and quote leads with Zoho CRM.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary id-trigger-crm-sync">
          ${icons.sync} Trigger Force Sync
        </button>
      </div>
    </div>

    <!-- Metrics Bar -->
    <div class="grid-4" style="margin-bottom: 2rem;">
      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Last CRM Sync</span>
          <span class="stat-value" style="font-size: 1.15rem;">${syncObj.lastSyncTime}</span>
          <span class="stat-sub">Automated cron schedule</span>
        </div>
        <div class="stat-icon blue">${icons.sync}</div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Sync Health Status</span>
          <span class="stat-value" style="color: ${syncObj.status === 'Healthy' ? 'var(--success-main)' : 'var(--warning-main)'}; font-size: 1.35rem;">
            ● ${syncObj.status}
          </span>
          <span class="stat-sub">Zoho API Webhook connected</span>
        </div>
        <div class="stat-icon green">${icons.check}</div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Successful Records</span>
          <span class="stat-value" style="color: var(--success-main);">${syncObj.successfulRecords}</span>
          <span class="stat-sub">Deals & leads synced</span>
        </div>
        <div class="stat-icon green">${icons.check}</div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Failed Records</span>
          <span class="stat-value" style="color: ${syncObj.failedRecords > 0 ? 'var(--error-main)' : 'var(--success-main)'};">
            ${syncObj.failedRecords}
          </span>
          <span class="stat-sub">${syncObj.failedRecords > 0 ? 'Action required' : 'All clear'}</span>
        </div>
        <div class="stat-icon red">${icons.alert}</div>
      </div>
    </div>

    <!-- Sync Records Log Table -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">${icons.sync} Sync Queue & Transaction Log</h3>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-container" style="border: none;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Record Name</th>
                <th>Zoho CRM ID</th>
                <th>Record Type</th>
                <th>Last Attempt</th>
                <th>Diagnostic Message</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${syncObj.records.length === 0 ? `
                <tr>
                  <td colspan="7" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔄</div>
                    <div style="font-weight: 700; margin-bottom: 0.25rem; color: #f8fafc;">No CRM sync logs recorded</div>
                    <div style="font-size: 0.8125rem;">Live Zoho CRM lead and pipeline synchronization records will populate here.</div>
                  </td>
                </tr>
              ` : syncObj.records.map(rec => `
                <tr>
                  <td style="font-weight: 600;">${rec.recordName}</td>
                  <td style="font-family: monospace; font-size: 0.8125rem;">${rec.crmId}</td>
                  <td><span class="badge badge-neutral">${rec.recordType}</span></td>
                  <td style="font-size: 0.8125rem;">${rec.lastAttempt}</td>
                  <td style="font-size: 0.8125rem; color: ${rec.status === 'Failed' ? 'var(--error-main)' : 'var(--text-muted)'}; max-width: 280px;">
                    ${rec.actionMsg}
                  </td>
                  <td>${renderStatusBadge(rec.status)}</td>
                  <td>
                    ${rec.status === 'Failed' ? `
                      <button class="btn btn-secondary btn-sm js-retry-crm-sync" data-sync-id="${rec.id}">
                        ${icons.sync} Retry Sync
                      </button>
                    ` : `
                      <span style="color: var(--success-main); font-size: 0.8125rem; font-weight: 600;">✓ Synced</span>
                    `}
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

export function bindAdminCrmSyncEvents() {
  document.addEventListener('click', (e) => {
    const retryBtn = e.target.closest('.js-retry-crm-sync');
    if (retryBtn) {
      const syncId = retryBtn.dataset.syncId;
      crmSyncService.retryCrmSyncRecord(syncId).then(() => {
        toast.success('CRM Sync Retried', 'Record manually synced with Zoho CRM successfully.');
        window.location.reload();
      });
    }

    const forceBtn = e.target.closest('.id-trigger-crm-sync');
    if (forceBtn) {
      toast.info('Sync Triggered', 'Full synchronization batch sent to Zoho CRM Webhook API.');
    }
  });
}
