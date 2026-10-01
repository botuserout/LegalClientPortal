/**
 * Legal Sthal - Admin Notifications Log View
 */

import { notificationService } from '../../services/notificationService.js';
import { renderStatusBadge, icons } from '../../ui/components.js';

export async function renderAdminNotifications() {
  const notifications = await notificationService.getNotifications();

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Notification Delivery Log</h1>
        <p class="page-subtitle">Track automated email, SMS, and WhatsApp status updates dispatched to clients.</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">${icons.alert} System Event Logs (${notifications.length})</h3>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-container" style="border: none;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Client Name</th>
                <th>Event Type</th>
                <th>Details / Payload</th>
                <th>Channel</th>
                <th>Date & Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${notifications.map(n => `
                <tr>
                  <td style="font-family: monospace; font-size: 0.8125rem;">${n.id}</td>
                  <td style="font-weight: 600;">${n.clientName}</td>
                  <td><span class="badge badge-info">${n.eventType}</span></td>
                  <td>${n.details}</td>
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
