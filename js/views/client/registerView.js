/**
 * Legal Sthal - Client Registration View (registerView.js)
 * Enables new clients to create an account directly from the Client Portal
 */

import { authService } from '../../services/authService.js';
import { toast } from '../../ui/toast.js';
import { renderStateOptionsHtml } from '../../config.js';
import { renderThemeToggle } from '../../ui/theme.js';

export function renderClientRegister() {
  return `
    <div style="min-height: 100vh; display: flex; width: 100%; background-color: var(--bg-app); color: var(--text-main); position: relative;">
      <!-- Floating Theme Toggle -->
      <div style="position: absolute; top: 1.25rem; right: 1.5rem; z-index: 100;">
        ${renderThemeToggle('auth-theme-toggle', 'background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-main); box-shadow: var(--shadow-sm);')}
      </div>

      <!-- Left Side Branding Banner -->
      <div style="flex: 1; background: linear-gradient(135deg, #060e1f 0%, #0b1325 50%, #0f172a 100%); color: white; padding: 4rem; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; border-right: 1px solid rgba(212, 175, 55, 0.15);" class="desktop-only-banner">
        <div style="position: absolute; right: -80px; bottom: -80px; width: 350px; height: 350px; border-radius: 50%; background: radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0) 70%); pointer-events: none;"></div>
        
        <div>
          <div style="display: flex; align-items: center; gap: 0.85rem; margin-bottom: 2rem;">
            <div style="width: 46px; height: 46px; background-color: #ffffff; border-radius: 12px; display: flex; align-items: center; justify-content: center; padding: 5px; box-shadow: 0 4px 14px rgba(212, 175, 55, 0.3); border: 1px solid rgba(212, 175, 55, 0.4); flex-shrink: 0;">
              <img src="assets/logo.png" alt="Legal Sthal" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>
            <span style="font-family: var(--font-heading); font-weight: 700; font-size: 1.6rem; letter-spacing: -0.02em; color: #ffffff;">Legal Sthal</span>
          </div>

          <h1 style="font-family: var(--font-heading); font-size: 2.5rem; font-weight: 700; line-height: 1.2; max-width: 520px; color: #ffffff;">
            Create Your Legal Sthal Client Account
          </h1>
          <p style="color: #94a3b8; font-size: 1.05rem; margin-top: 1.25rem; max-width: 480px; line-height: 1.6;">
            Get started with company incorporation, GST registration, trademark protection, and complete business legal compliance.
          </p>

          <div style="margin-top: 2.5rem; display: flex; flex-direction: column; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem; color: #cbd5e1; font-size: 0.9375rem;">
              <span style="color: #d4af37; font-weight: 700;">✓</span> Instant Access to Legal Stage Timelines & Tracking
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem; color: #cbd5e1; font-size: 0.9375rem;">
              <span style="color: #d4af37; font-weight: 700;">✓</span> Encrypted Vault for KYC & Business Document Uploads
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem; color: #cbd5e1; font-size: 0.9375rem;">
              <span style="color: #d4af37; font-weight: 700;">✓</span> Dedicated SPOC Legal Specialist Support
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid rgba(212, 175, 55, 0.15); padding-top: 1.5rem; color: #64748b; font-size: 0.875rem;">
          Trusted by over 1,200+ growing companies across India.
        </div>
      </div>

      <!-- Right Side Registration Form Card -->
      <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 2.5rem 1.5rem; background-color: var(--bg-app);">
        <div class="login-card-container" style="width: 100%; max-width: 480px; background-color: var(--bg-card); padding: 2.5rem; border-radius: 20px; border: 1px solid var(--border-subtle); box-shadow: var(--shadow-xl);">
          
          <div style="margin-bottom: 1.75rem;">
            <h2 style="font-family: var(--font-heading); font-size: 1.75rem; font-weight: 700; color: var(--text-main);">Create Account</h2>
            <p style="color: var(--text-muted); font-size: 0.9375rem; margin-top: 0.35rem;">Register your business to access Legal Sthal services</p>
          </div>

          <!-- Live Inline Error Banner -->
          <div id="register-error-alert" style="display: none; background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.25rem; font-size: 0.875rem; color: #fca5a5;" aria-live="polite">
          </div>

          <form id="client-register-form">
            <div class="form-group" style="margin-bottom: 1.2rem;">
              <label class="form-label" for="reg-company">Company / Business Name *</label>
              <input type="text" id="reg-company" class="form-control" placeholder="e.g. Acme Innovations Pvt Ltd" required />
            </div>

            <div class="form-group" style="margin-bottom: 1.2rem;">
              <label class="form-label" for="reg-contact">Contact Person Name *</label>
              <input type="text" id="reg-contact" class="form-control" placeholder="e.g. Rahul Sharma" required />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;" class="form-row-responsive">
              <div class="form-group" style="margin-bottom: 1.2rem;">
                <label class="form-label" for="reg-email">Email Address *</label>
                <input type="email" id="reg-email" class="form-control" placeholder="name@company.com" required autocomplete="email" />
              </div>
              <div class="form-group" style="margin-bottom: 1.2rem;">
                <label class="form-label" for="reg-mobile">Mobile Number *</label>
                <input type="tel" id="reg-mobile" class="form-control" placeholder="+91 9876543210" required />
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1.2rem;">
              <label class="form-label" for="reg-state">State / Territory *</label>
              <select id="reg-state" class="form-control" required style="background-color: #131b2e; color: #ffffff;">
                ${renderStateOptionsHtml('Gujarat')}
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 1.2rem;">
              <label class="form-label" for="reg-password">Password *</label>
              <div style="position: relative;">
                <input type="password" id="reg-password" class="form-control" placeholder="Minimum 8 characters" required autocomplete="new-password" />
                <button type="button" id="reg-toggle-pwd-btn" aria-label="Toggle password visibility" style="position: absolute; right: 0.85rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #d4af37; font-size: 0.8125rem; font-weight: 600;">Show</button>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" for="reg-confirm-password">Confirm Password *</label>
              <input type="password" id="reg-confirm-password" class="form-control" placeholder="Re-enter password" required autocomplete="new-password" />
            </div>

            <!-- Password Policy Hints -->
            <div style="background: rgba(30, 41, 59, 0.6); padding: 0.85rem 1rem; border-radius: 10px; margin-bottom: 1.5rem; border: 1px solid rgba(255, 255, 255, 0.05); font-size: 0.8125rem; color: #94a3b8;">
              <div style="color: #cbd5e1; font-weight: 600; margin-bottom: 0.35rem;">Password Requirements:</div>
              <ul style="margin: 0; padding-left: 1.2rem; display: flex; flex-direction: column; gap: 0.2rem;">
                <li>At least 8 characters</li>
                <li>At least one uppercase (A-Z) & lowercase (a-z)</li>
                <li>At least one number (0-9) & special character (!@#$%^&*)</li>
              </ul>
            </div>

            <button type="submit" class="btn btn-primary btn-block btn-lg" id="register-submit-btn" style="height: 48px; font-size: 1rem;">
              Create Client Account
            </button>
          </form>

          <div style="margin-top: 1.75rem; padding-top: 1.25rem; border-top: 1px solid var(--divider); text-align: center;">
            <span style="font-size: 0.875rem; color: var(--text-muted);">
              Already have an account? 
              <a href="#client/login" style="color: var(--primary-500); font-weight: 600; text-decoration: underline;">Sign In Here</a>
            </span>
          </div>

        </div>
      </div>
    </div>
  `;
}

export function bindClientRegisterEvents(routerNavigate) {
  const form = document.getElementById('client-register-form');
  const pwdInput = document.getElementById('reg-password');
  const confirmPwdInput = document.getElementById('reg-confirm-password');
  const toggleBtn = document.getElementById('reg-toggle-pwd-btn');
  const submitBtn = document.getElementById('register-submit-btn');
  const errorAlert = document.getElementById('register-error-alert');

  if (toggleBtn && pwdInput) {
    toggleBtn.addEventListener('click', () => {
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
      toggleBtn.textContent = isPwd ? 'Hide' : 'Show';
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

  if (form) {
    let isSubmitting = false;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      clearError();

      const companyName = document.getElementById('reg-company').value.trim();
      const contactPerson = document.getElementById('reg-contact').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const mobile = document.getElementById('reg-mobile').value.trim();
      const state = document.getElementById('reg-state').value;
      const password = pwdInput.value;
      const confirmPassword = confirmPwdInput.value;

      if (!companyName || !contactPerson || !email || !mobile || !password) {
        showError('Please fill in all mandatory fields.');
        return;
      }

      if (password !== confirmPassword) {
        showError('Password and confirmation password do not match.');
        return;
      }

      isSubmitting = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Account...';

      try {
        const clientData = {
          companyName,
          contactPerson,
          email,
          mobile,
          state,
          password
        };

        const result = await authService.register(clientData);

        if (result.success) {
          toast.success('Registration Successful', result.message || 'Your account has been created. Please sign in.');
          // Redirect client to login page with prefilled email prompt
          setTimeout(() => {
            routerNavigate('client/login');
          }, 1200);
        } else {
          showError(result.error.message || 'Failed to create account. Please check your information.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Client Account';
          isSubmitting = false;
        }
      } catch (err) {
        showError('Unable to connect to Legal Sthal registration server. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Client Account';
        isSubmitting = false;
      }
    });
  }
}
