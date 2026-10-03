/**
 * Legal Sthal - Client Payments View
 */

import { paymentService } from '../../services/paymentService.js';
import { authService } from '../../services/authService.js';
import { renderStatusBadge, icons } from '../../ui/components.js';

export async function renderClientPayments() {
  const user = authService.getCurrentUser();
  const clientId = user ? user.clientId : 'CL001';

  const data = await paymentService.getPaymentsByClientId(clientId);
  const { payments, summary } = data;

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Payments & Receipts</h1>
        <p class="page-subtitle">Track billing summaries, paid receipts, and outstanding balances.</p>
      </div>
    </div>

    <!-- Financial Summary Cards -->
    <div class="grid-3" style="margin-bottom: 2rem;">
      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Total Service Fees</span>
          <span class="stat-value">₹${summary.totalBilled.toLocaleString('en-IN')}</span>
          <span class="stat-sub">Across all purchased services</span>
        </div>
        <div class="stat-icon blue">${icons.payments}</div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Total Amount Paid</span>
          <span class="stat-value" style="color: var(--success-main);">₹${summary.totalPaid.toLocaleString('en-IN')}</span>
          <span class="stat-sub">Successful receipts</span>
        </div>
        <div class="stat-icon green">${icons.check}</div>
      </div>

      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Total Outstanding Due</span>
          <span class="stat-value" style="color: ${summary.totalOutstanding > 0 ? 'var(--error-main)' : 'var(--success-main)'};">
            ₹${summary.totalOutstanding.toLocaleString('en-IN')}
          </span>
          <span class="stat-sub">${summary.totalOutstanding > 0 ? 'Pending stage milestone payment' : 'No balance due'}</span>
        </div>
        <div class="stat-icon red">${icons.payments}</div>
      </div>
    </div>

    <!-- Payment Transaction Log Table -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">${icons.payments} Transaction History</h3>
      </div>
      <div class="card-body" style="padding: 0;">
        <div class="table-container" style="border: none;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Service Code</th>
                <th>Service Name</th>
                <th>Description</th>
                <th>Transaction ID</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${payments.map(p => `
                <tr>
                  <td>${p.date}</td>
                  <td style="font-weight: 600;">${p.serviceCode}</td>
                  <td>${p.serviceType}</td>
                  <td>${p.description}</td>
                  <td style="font-family: monospace; font-size: 0.8125rem;">${p.transactionId}</td>
                  <td style="font-weight: 700; color: var(--success-main);">₹${p.amount.toLocaleString('en-IN')}</td>
                  <td>${renderStatusBadge(p.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
