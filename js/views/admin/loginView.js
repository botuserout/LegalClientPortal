/**
 * Legal Sthal - Admin Login View
 */

import { authService } from '../../services/authService.js';
import { toast } from '../../ui/toast.js';

export function renderAdminLogin() {
  return `
    <div style="min-height: 100vh; display: flex; width: 100%; background-color: #0b1325; color: white;">
      <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem;">
        <div style="width: 100%; max-width: 440px; background-color: #0f172a; padding: 2.5rem; border-radius: 20px; border: 1px solid rgba(212, 175, 55, 0.25); box-shadow: 0 20px 48px -12px rgba(0,0,0,0.85), 0 0 25px rgba(212, 175, 55, 0.1);">
          <div style="display: flex; align-items: center; gap: 0.85rem; margin-bottom: 2rem;">
            <div style="width: 46px; height: 46px; background-color: #ffffff; border-radius: 12px; display: flex; align-items: center; justify-content: center; padding: 5px; box-shadow: 0 4px 14px rgba(212, 175, 55, 0.3); border: 1px solid rgba(212, 175, 55, 0.4); flex-shrink: 0;">
              <img src="assets/logo.png" alt="Legal Sthal" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>
            <div>
              <h2 style="font-family: var(--font-heading); font-size: 1.45rem; font-weight: 700; color: #ffffff;">Legal Sthal</h2>
              <span style="font-size: 0.72rem; text-transform: uppercase; color: #f3e5ab; font-weight: 700; letter-spacing: 0.08em;">Internal Admin Portal</span>
            </div>
          </div>

          <form id="admin-login-form">
            <div class="form-group">
              <label class="form-label" style="color: #cbd5e1;">Admin Email</label>
              <input type="email" id="admin-email" class="form-control" value="admin@legalsthal.com" required />
            </div>

            <div class="form-group">
              <label class="form-label" style="color: #cbd5e1;">Password</label>
              <input type="password" id="admin-password" class="form-control" value="admin123" required />
            </div>

            <button type="submit" class="btn btn-primary btn-block btn-lg" id="admin-submit-btn" style="height: 48px; font-size: 1rem; margin-top: 1rem;">
              Sign In to Operations Console
            </button>
          </form>

          <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
            <a href="#client/login" style="color: #f3e5ab; font-size: 0.8125rem; font-weight: 600; text-decoration: underline;">
              ← Back to Client Portal Login
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function bindAdminLoginEvents(onSuccess) {
  const form = document.getElementById('admin-login-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('admin-email').value;
      const pwd = document.getElementById('admin-password').value;

      const submitBtn = document.getElementById('admin-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Authenticating...';

      setTimeout(() => {
        const result = authService.login(email, pwd, 'admin');
        if (result.success) {
          toast.success('Admin Sign In', 'Welcome to Legal Sthal Operations Portal');
          onSuccess();
        } else {
          toast.error('Authentication Error', result.message);
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In to Operations Console';
        }
      }, 500);
    });
  }
}
