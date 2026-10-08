/**
 * Legal Sthal - Admin Notifications Log & Automation View (notificationsView.js)
 * Version: 2.1.0 (Step 8 Notifications & Automation Core)
 */

import { notificationService } from '../../services/notificationService.js';
import { renderStatusBadge, icons } from '../../ui/components.js';
import { toast } from '../../ui/toast.js';

export async function renderAdminNotifications() {
  const [notifications, health] = await Promise.all([
    notificationService.getNotifications(),
    notificationService.getNotificationHealth()
  ]);

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Notification Delivery & Automation Logs</h1>
        <p class="page-subtitle">Track automated transactional emails, portal in-app alerts, and automation queue health.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary js-admin-mark-all-read">
          ${icons.check} Mark All Read
        </button>
      </div>
    </div>

    <!-- Notification Health & Automation Bar -->
    <div class="grid-4" style="margin-bottom: 2rem;">
      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Automation Health</span>
          <span class="stat-value" style="color: ${health.healthStatus === 'Healthy' ? 'var(--success-main)' : 'var(--warning-main)'}; font-size: 1.35rem;">
            ● ${health.healthStatus}
          </span>
          <span class="stat-sub">Last delivery: ${health.lastSuccessfulNotification || 'Recently'}</span>
        </div>
        <div class="stat-icon green">${icons.check}</div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Sent Notifications</span>
          <span class="stat-value" style="color: var(--success-main);">${health.sentEmails || notifications.length}</span>
          <span class="stat-sub">Delivered via MailApp / Portal</span>
        </div>
        <div class="stat-icon green">${icons.email}</div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Pending In Queue</span>
          <span class="stat-value" style="color: ${health.pendingEmails > 0 ? 'var(--warning-main)' : 'var(--text-main)'};">${health.pendingEmails || 0}</span>
          <span class="stat-sub">Awaiting trigger dispatch</span>
        </div>
        <div class="stat-icon blue">${icons.sync}</div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Failed Deliveries</span>
          <span class="stat-value" style="color: ${health.failedEmails > 0 ? 'var(--error-main)' : 'var(--success-main)'};">${health.failedEmails || 0}</span>
          <span class="stat-sub">${health.failedEmails > 0 ? 'Bounded retry active' : 'All clear'}</span>
        </div>
        <div class="stat-icon red">${icons.alert}</div>
      </div>
    </div>

    <!-- Event Logs Table -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">${icons.alert} System Event Logs (${notifications.length})</h3>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-container" style="border: none;">
          <table class="data-table">
            <thead>
              <tr>
                <th style="padding-left: 1.75rem;">Log ID</th>
                <th>Client Name</th>
                <th>Event Type</th>
                <th>Details / Message</th>
                <th>Channel</th>
                <th>Date & Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${notifications.length === 0 ? `
                <tr>
                  <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    No notification logs recorded yet.
                  </td>
                </tr>
              ` : notifications.map(n => `
                <tr>
                  <td style="font-family: monospace; font-size: 0.8125rem; padding-left: 1.75rem;">${n.id}</td>
                  <td style="font-weight: 600;">${n.clientName || 'Client'}</td>
                  <td><span class="badge badge-info">${n.eventType}</span></td>
                  <td style="max-width: 320px; font-size: 0.8125rem;">${n.message || n.details}</td>
                  <td><span class="badge badge-neutral">${n.channel}</span></td>
                  <td style="font-size: 0.8125rem; color: var(--text-muted);">${n.date}</td>
                  <td>${renderStatusBadge(n.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

let notificationEventsBound = false;

export function bindAdminNotificationEvents() {
  if (notificationEventsBound) return;
  notificationEventsBound = true;

  document.addEventListener('click', async (e) => {
    const markAllBtn = e.target.closest('.js-admin-mark-all-read');

    if (!markAllBtn) return;

    markAllBtn.disabled = true;

    try {
      await notificationService.markAllNotificationsRead();

      toast.success(
        'Notifications Updated',
        'All operational logs marked as read.'
      );

      if (window.appInstance) {
        window.appInstance.handleRoute();
      }

    } catch (error) {
      console.error('Failed to mark notifications as read:', error);

      toast.error(
        'Update Failed',
        'Unable to mark notifications as read.'
      );

      markAllBtn.disabled = false;
    }
  });
}