/**
 * Legal Sthal - Admin Login View (loginView.js)
 * Step 4 Authenticated Integration
 */

import { authService } from '../../services/authService.js';
import { toast } from '../../ui/toast.js';
import { renderThemeToggle } from '../../ui/theme.js';

export function renderAdminLogin() {
  const isExpired = window.location.hash.includes('expired=1');

  return `
    <div style="min-height: 100vh; display: flex; width: 100%; background-color: var(--bg-app); color: var(--text-main); position: relative;">
      <!-- Floating Theme Toggle -->
      <div style="position: absolute; top: 1.25rem; right: 1.5rem; z-index: 100;">
        ${renderThemeToggle('auth-theme-toggle', 'background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-main); box-shadow: var(--shadow-sm);')}
      </div>

      <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem;">
        <div class="login-card-container" style="width: 100%; max-width: 440px; background-color: var(--bg-card); padding: 2.5rem; border-radius: 20px; border: 1px solid var(--border-subtle); box-shadow: var(--shadow-xl);">
          <div style="display: flex; align-items: center; gap: 0.85rem; margin-bottom: 2rem;">
            <div style="width: 46px; height: 46px; background-color: #ffffff; border-radius: 12px; display: flex; align-items: center; justify-content: center; padding: 5px; box-shadow: 0 4px 14px rgba(212, 175, 55, 0.3); border: 1px solid rgba(212, 175, 55, 0.4); flex-shrink: 0;">
              <img src="assets/logo.png" alt="Legal Sthal" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>
            <div>
              <h2 style="font-family: var(--font-heading); font-size: 1.45rem; font-weight: 700; color: var(--text-main);">Legal Sthal</h2>
              <span style="font-size: 0.72rem; text-transform: uppercase; color: var(--primary-500); font-weight: 700; letter-spacing: 0.08em;">Internal Admin Portal</span>
            </div>
          </div>

          <!-- Session Expired Notification Banner -->
          <div id="admin-session-expired-alert" style="display: ${isExpired ? 'block' : 'none'}; background-color: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.25rem; font-size: 0.875rem; color: #fde68a;">
            Your session has expired. Please sign in again to continue.
          </div>

          <!-- Live Inline Error Alert -->
          <div id="admin-login-error" style="display: none; background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.25rem; font-size: 0.875rem; color: #fca5a5;" aria-live="polite">
          </div>

          <form id="admin-login-form">
            <div class="form-group">
              <label class="form-label" for="admin-email">Admin Email or User ID</label>
              <input type="text" id="admin-email" class="form-control" placeholder="admin@legalsthal.com or ADM001" required autocomplete="username" />
            </div>

            <div class="form-group">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;">
                <label class="form-label" for="admin-password" style="margin-bottom: 0;">Password</label>
                <button type="button" id="admin-toggle-pwd-btn" aria-label="Toggle password visibility" style="background: none; border: none; cursor: pointer; color: var(--primary-500); font-size: 0.8125rem; font-weight: 600;">Show</button>
              </div>
              <input type="password" id="admin-password" class="form-control" placeholder="••••••••" required autocomplete="current-password" />
            </div>

            <button type="submit" class="btn btn-primary btn-block btn-lg" id="admin-submit-btn" style="height: 48px; font-size: 1rem; margin-top: 1.5rem;">
              Sign In to Operations Console
            </button>
          </form>

          <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--divider); text-align: center;">
            <a href="#client/login" style="color: var(--primary-500); font-size: 0.8125rem; font-weight: 600; text-decoration: underline;">
              ← Back to Client Portal Login
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function bindAdminLoginEvents(routerNavigate) {
  const form = document.getElementById('admin-login-form');
  const pwdInput = document.getElementById('admin-password');
  const toggleBtn = document.getElementById('admin-toggle-pwd-btn');
  const submitBtn = document.getElementById('admin-submit-btn');
  const errorAlert = document.getElementById('admin-login-error');

  if (toggleBtn && pwdInput) {
    toggleBtn.addEventListener('click', () => {
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
      toggleBtn.textContent = isPwd ? 'Hide' : 'Show';
    });
  }

  const expiredAlert = document.getElementById('admin-session-expired-alert');

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
    if (expiredAlert) {
      expiredAlert.style.display = 'none';
    }
  }

  if (form) {
    let isSubmitting = false;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      clearError();
      const loginId = document.getElementById('admin-email').value.trim();
      const password = pwdInput.value;

      if (!loginId || !password) {
        showError('Please provide your admin email and password.');
        return;
      }

      isSubmitting = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Authenticating...';

      try {
        const result = await authService.login(loginId, password, false);

        if (result.success) {
          if (!authService.isAdmin()) {
            // Role guard: Client role signed in on Admin login form
            toast.info('Role Redirect', 'Signed in as Client account. Redirecting to Client Dashboard.');
            routerNavigate('client/dashboard');
          } else {
            toast.success('Admin Sign In', `Welcome, ${result.user.name || result.user.email}`);
            routerNavigate('admin/dashboard');
          }
        } else {
          showError(result.error.message || 'Invalid administrator credentials.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In to Operations Console';
          isSubmitting = false;
        }
      } catch (err) {
        showError('Unable to connect to Legal Sthal operations service.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In to Operations Console';
        isSubmitting = false;
      }
    });
  }
}
