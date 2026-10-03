/**
 * Legal Sthal - Change Password & First-Login Security Setup View (changePasswordView.js)
 * Step 4 Authenticated Integration
 */

import { authService } from '../../services/authService.js';
import { toast } from '../../ui/toast.js';

export function renderChangePassword() {
  const isFirstLogin = authService.isFirstLogin();

  return `
    <div style="min-height: 100vh; display: flex; width: 100%; background-color: #0b1325; color: white;">
      <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem;">
        <div style="width: 100%; max-width: 480px; background-color: #0f172a; padding: 2.5rem; border-radius: 20px; border: 1px solid rgba(212, 175, 55, 0.25); box-shadow: 0 20px 48px -12px rgba(0,0,0,0.85), 0 0 25px rgba(212, 175, 55, 0.1);">
          
          <div style="display: flex; align-items: center; gap: 0.85rem; margin-bottom: 1.5rem;">
            <div style="width: 46px; height: 46px; background-color: #ffffff; border-radius: 12px; display: flex; align-items: center; justify-content: center; padding: 5px; box-shadow: 0 4px 14px rgba(212, 175, 55, 0.3); border: 1px solid rgba(212, 175, 55, 0.4); flex-shrink: 0;">
              <img src="assets/logo.png" alt="Legal Sthal" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>
            <div>
              <h2 style="font-family: var(--font-heading); font-size: 1.45rem; font-weight: 700; color: #ffffff;">
                ${isFirstLogin ? 'Set Permanent Password' : 'Change Password'}
              </h2>
              <span style="font-size: 0.72rem; text-transform: uppercase; color: #f3e5ab; font-weight: 700; letter-spacing: 0.08em;">
                ${isFirstLogin ? 'First-Login Security Setup' : 'Security Preferences'}
              </span>
            </div>
          </div>

          ${isFirstLogin ? `
            <div style="background-color: rgba(212, 175, 55, 0.12); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 8px; padding: 0.85rem 1rem; margin-bottom: 1.5rem; font-size: 0.875rem; color: #fef08a; line-height: 1.5;">
              <strong>Action Required:</strong> For your security, a new permanent password must be configured before accessing your Legal Sthal portal.
            </div>
          ` : `
            <p style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 1.5rem;">
              Update your account password. Ensure your new password meets the security complexity requirements.
            </p>
          `}

          <!-- Live Inline Error Alert -->
          <div id="change-pwd-error" style="display: none; background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.25rem; font-size: 0.875rem; color: #fca5a5;" aria-live="polite">
          </div>

          <form id="change-password-form">
            <div class="form-group">
              <label class="form-label" for="current-pwd" style="color: #cbd5e1;">Current / Temporary Password</label>
              <input type="password" id="current-pwd" class="form-control" placeholder="••••••••" required autocomplete="current-password" />
            </div>

            <div class="form-group">
              <label class="form-label" for="new-pwd" style="color: #cbd5e1;">New Password</label>
              <input type="password" id="new-pwd" class="form-control" placeholder="••••••••" required autocomplete="new-password" />
            </div>

            <div class="form-group">
              <label class="form-label" for="confirm-pwd" style="color: #cbd5e1;">Confirm New Password</label>
              <input type="password" id="confirm-pwd" class="form-control" placeholder="••••••••" required autocomplete="new-password" />
            </div>

            <!-- Password Policy Checklist -->
            <div style="background-color: #0b1325; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 0.85rem 1rem; margin-bottom: 1.5rem; font-size: 0.8125rem;">
              <span style="color: #94a3b8; font-weight: 600; display: block; margin-bottom: 0.4rem;">Password Requirements:</span>
              <ul style="list-style: none; padding-left: 0; margin: 0; display: flex; flex-direction: column; gap: 0.25rem;">
                <li id="req-len" style="color: #64748b;">• Minimum 8 characters</li>
                <li id="req-upper" style="color: #64748b;">• At least one uppercase letter (A-Z)</li>
                <li id="req-lower" style="color: #64748b;">• At least one lowercase letter (a-z)</li>
                <li id="req-num" style="color: #64748b;">• At least one numerical digit (0-9)</li>
                <li id="req-spec" style="color: #64748b;">• At least one special symbol (!@#$%^&*...)</li>
              </ul>
            </div>

            <button type="submit" class="btn btn-primary btn-block btn-lg" id="change-pwd-submit-btn" style="height: 48px; font-size: 1rem;">
              ${isFirstLogin ? 'Complete Setup & Open Dashboard' : 'Update Password'}
            </button>
          </form>

          ${!isFirstLogin ? `
            <div style="margin-top: 1.5rem; text-align: center;">
              <a href="#client/dashboard" style="color: #94a3b8; font-size: 0.8125rem; text-decoration: underline;">
                Cancel and return to Dashboard
              </a>
            </div>
          ` : `
            <div style="margin-top: 1.5rem; text-align: center;">
              <a href="#" class="js-change-pwd-logout" style="color: #94a3b8; font-size: 0.8125rem; text-decoration: underline;">
                Sign out and exit setup
              </a>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}

export function bindChangePasswordEvents(routerNavigate) {
  const form = document.getElementById('change-password-form');
  const currentPwdInput = document.getElementById('current-pwd');
  const newPwdInput = document.getElementById('new-pwd');
  const confirmPwdInput = document.getElementById('confirm-pwd');
  const submitBtn = document.getElementById('change-pwd-submit-btn');
  const errorAlert = document.getElementById('change-pwd-error');

  // Real-time policy requirements inspector
  const reqLen = document.getElementById('req-len');
  const reqUpper = document.getElementById('req-upper');
  const reqLower = document.getElementById('req-lower');
  const reqNum = document.getElementById('req-num');
  const reqSpec = document.getElementById('req-spec');

  function updateChecklist(pwd) {
    const p = pwd || '';
    const validLen = p.length >= 8;
    const validUpper = /[A-Z]/.test(p);
    const validLower = /[a-z]/.test(p);
    const validNum = /[0-9]/.test(p);
    const validSpec = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(p);

    if (reqLen) reqLen.style.color = validLen ? '#22c55e' : '#64748b';
    if (reqUpper) reqUpper.style.color = validUpper ? '#22c55e' : '#64748b';
    if (reqLower) reqLower.style.color = validLower ? '#22c55e' : '#64748b';
    if (reqNum) reqNum.style.color = validNum ? '#22c55e' : '#64748b';
    if (reqSpec) reqSpec.style.color = validSpec ? '#22c55e' : '#64748b';
  }

  if (newPwdInput) {
    newPwdInput.addEventListener('input', (e) => {
      updateChecklist(e.target.value);
    });
  }

  function showError(msg) {
    if (errorAlert) {
      errorAlert.textContent = msg;
      errorAlert.style.display = 'block';
    }
  }

  function clearError() {
    if (errorAlert) {
      errorAlert.textContent = '';
      errorAlert.style.display = 'none';
    }
  }

  // Handle logout from first login setup
  const logoutBtn = document.querySelector('.js-change-pwd-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await authService.logout();
      routerNavigate('client/login');
    });
  }

  if (form) {
    let isSubmitting = false;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      clearError();
      const currentPwd = currentPwdInput.value;
      const newPwd = newPwdInput.value;
      const confirmPwd = confirmPwdInput.value;

      if (!currentPwd || !newPwd || !confirmPwd) {
        showError('Please fill in all password fields.');
        return;
      }

      if (newPwd !== confirmPwd) {
        showError('New password and confirmation password do not match.');
        return;
      }

      if (currentPwd === newPwd) {
        showError('New password cannot be identical to your current password.');
        return;
      }

      const policy = authService.validatePasswordPolicy(newPwd);
      if (!policy.valid) {
        showError(policy.errors.join(' '));
        return;
      }

      isSubmitting = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating Password...';

      try {
        const result = await authService.changePassword(currentPwd, newPwd, confirmPwd);

        if (result.success) {
          toast.success('Password Updated', 'Your new password has been set successfully.');
          if (authService.isAdmin()) {
            routerNavigate('admin/dashboard');
          } else {
            routerNavigate('client/dashboard');
          }
        } else {
          showError(result.error.message || 'Failed to update password.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Update Password';
          isSubmitting = false;
        }
      } catch (err) {
        showError('Unable to connect to Legal Sthal services. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Password';
        isSubmitting = false;
      }
    });
  }
}
