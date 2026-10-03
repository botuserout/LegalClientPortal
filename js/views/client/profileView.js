/**
 * Legal Sthal - Client Profile View
 */

import { clientService } from '../../services/clientService.js';
import { authService } from '../../services/authService.js';
import { modal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';
import { icons } from '../../ui/components.js';

export async function renderClientProfile() {
  const user = authService.getCurrentUser();
  const clientId = user ? user.clientId : 'CL001';

  const client = await clientService.getClientById(clientId) || {
    id: 'CL001',
    companyName: 'ABC Technologies Pvt Ltd',
    contactPerson: 'Rahul Mehta',
    email: 'abc@gmail.com',
    mobile: '+91 98765 43210',
    state: 'Gujarat',
    address: '102 Tech Park, SG Highway, Ahmedabad, Gujarat - 380054',
    gstin: '24AAACA123411Z5'
  };

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Account & Profile</h1>
        <p class="page-subtitle">Manage company details, contact information, and account security.</p>
      </div>
    </div>

    <div class="grid-2">
      <!-- Profile Information Card -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${icons.profile} Company Profile Details</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Client ID</label>
            <input type="text" class="form-control" value="${client.id}" readonly style="background-color: var(--bg-app); font-weight: 700;" />
          </div>

          <div class="form-group">
            <label class="form-label">Company Name</label>
            <input type="text" class="form-control" value="${client.companyName}" readonly style="background-color: var(--bg-app);" />
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Primary Contact Person</label>
              <input type="text" class="form-control" value="${client.contactPerson}" readonly style="background-color: var(--bg-app);" />
            </div>
            <div class="form-group">
              <label class="form-label">Mobile Number</label>
              <input type="text" class="form-control" value="${client.mobile}" readonly style="background-color: var(--bg-app);" />
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="text" class="form-control" value="${client.email}" readonly style="background-color: var(--bg-app);" />
            </div>
            <div class="form-group">
              <label class="form-label">State / Jurisdiction</label>
              <input type="text" class="form-control" value="${client.state}" readonly style="background-color: var(--bg-app);" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Registered Address</label>
            <textarea class="form-control" rows="2" readonly style="background-color: var(--bg-app);">${client.address}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">GSTIN (If Applicable)</label>
            <input type="text" class="form-control" value="${client.gstin}" readonly style="background-color: var(--bg-app);" />
          </div>
        </div>
      </div>

      <!-- Account Security Card -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${icons.settings} Account Security</h3>
        </div>
        <div class="card-body">
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1.25rem;">
            Update your account password to ensure maximum security for your Legal Sthal portal.
          </p>

          <div style="background-color: var(--bg-app); border-radius: var(--radius-md); padding: 1.25rem; border: 1px solid var(--border-subtle); margin-bottom: 1.5rem;">
            <div style="font-weight: 600; font-size: 0.9375rem; color: var(--text-main);">Password Status</div>
            <div style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.2rem;">Last changed: 25 Sep 2026</div>
          </div>

          <button class="btn btn-outline js-change-password-btn">
            Change Password
          </button>
        </div>
      </div>
    </div>
  `;
}

export function bindClientProfileEvents() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('.js-change-password-btn')) {
      modal.open({
        title: 'Change Password',
        bodyHtml: `
          <form id="change-pwd-form">
            <div class="form-group">
              <label class="form-label">Current Password</label>
              <input type="password" class="form-control" required placeholder="Enter current password" />
            </div>
            <div class="form-group">
              <label class="form-label">New Password</label>
              <input type="password" class="form-control" id="new-pwd-1" required placeholder="At least 8 characters" />
            </div>
            <div class="form-group">
              <label class="form-label">Confirm New Password</label>
              <input type="password" class="form-control" id="new-pwd-2" required placeholder="Re-enter new password" />
            </div>
          </form>
        `,
        footerHtml: `
          <button class="btn btn-secondary js-modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="save-pwd-btn">${icons.check} Update Password</button>
        `,
        onOpen: () => {
          document.querySelector('.js-modal-cancel').onclick = () => modal.close();
          document.getElementById('save-pwd-btn').onclick = () => {
            const p1 = document.getElementById('new-pwd-1').value;
            const p2 = document.getElementById('new-pwd-2').value;
            if (!p1 || p1.length < 6) {
              toast.error('Weak Password', 'Password must be at least 6 characters.');
              return;
            }
            if (p1 !== p2) {
              toast.error('Mismatch', 'New passwords do not match.');
              return;
            }
            toast.success('Password Updated', 'Your account password has been changed successfully.');
            modal.close();
          };
        }
      });
    }
  });
}
