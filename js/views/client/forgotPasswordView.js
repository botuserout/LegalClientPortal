/**
 * Legal Sthal - Forgot Password View (forgotPasswordView.js)
 * Step 4 Authenticated Integration
 */

import { authService } from '../../services/authService.js';
import { toast } from '../../ui/toast.js';

export function renderForgotPassword() {
  return `
    <div style="min-height: 100vh; display: flex; width: 100%; background-color: #0b1325; color: white;">
      <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem;">
        <div style="width: 100%; max-width: 440px; background-color: #0f172a; padding: 2.5rem; border-radius: 20px; border: 1px solid rgba(212, 175, 55, 0.25); box-shadow: 0 20px 48px -12px rgba(0,0,0,0.85), 0 0 25px rgba(212, 175, 55, 0.1);">
          
          <div style="display: flex; align-items: center; gap: 0.85rem; margin-bottom: 2rem;">
            <div style="width: 46px; height: 46px; background-color: #ffffff; border-radius: 12px; display: flex; align-items: center; justify-content: center; padding: 5px; box-shadow: 0 4px 14px rgba(212, 175, 55, 0.3); border: 1px solid rgba(212, 175, 55, 0.4); flex-shrink: 0;">
              <img src="assets/logo.png" alt="Legal Sthal" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>
            <div>
              <h2 style="font-family: var(--font-heading); font-size: 1.45rem; font-weight: 700; color: #ffffff;">Reset Password</h2>
              <span style="font-size: 0.72rem; text-transform: uppercase; color: #f3e5ab; font-weight: 700; letter-spacing: 0.08em;">Account Recovery</span>
            </div>
          </div>

          <p style="color: #94a3b8; font-size: 0.9375rem; margin-bottom: 1.5rem; line-height: 1.5;">
            Enter your registered account email. If an account is found, a secure single-use recovery link will be dispatched.
          </p>

          <!-- Success Notification Banner -->
          <div id="forgot-pwd-success" style="display: none; background-color: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 8px; padding: 0.85rem 1rem; margin-bottom: 1.5rem; font-size: 0.875rem; color: #86efac; line-height: 1.5;">
          </div>

          <!-- Error Alert Banner -->
          <div id="forgot-pwd-error" style="display: none; background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.25rem; font-size: 0.875rem; color: #fca5a5;" aria-live="polite">
          </div>

          <form id="forgot-password-form">
            <div class="form-group">
              <label class="form-label" for="recovery-email" style="color: #cbd5e1;">Registered Email Address</label>
              <input type="email" id="recovery-email" class="form-control" placeholder="name@company.com" required autocomplete="email" />
            </div>

            <button type="submit" class="btn btn-primary btn-block btn-lg" id="forgot-pwd-submit-btn" style="height: 48px; font-size: 1rem; margin-top: 1rem;">
              Send Password Reset Link
            </button>
          </form>

          <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
            <a href="#client/login" style="color: #f3e5ab; font-size: 0.8125rem; font-weight: 600; text-decoration: underline;">
              ← Back to Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function bindForgotPasswordEvents(routerNavigate) {
  const form = document.getElementById('forgot-password-form');
  const emailInput = document.getElementById('recovery-email');
  const submitBtn = document.getElementById('forgot-pwd-submit-btn');
  const successBox = document.getElementById('forgot-pwd-success');
  const errorBox = document.getElementById('forgot-pwd-error');

  function showError(msg) {
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.style.display = 'block';
    }
    if (successBox) successBox.style.display = 'none';
  }

  function showSuccess(msg) {
    if (successBox) {
      successBox.textContent = msg;
      successBox.style.display = 'block';
    }
    if (errorBox) errorBox.style.display = 'none';
  }

  if (form) {
    let isSubmitting = false;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      const email = emailInput.value.trim();
      if (!email) {
        showError('Please enter a valid email address.');
        return;
      }

      isSubmitting = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Dispatching Link...';

      try {
        const result = await authService.requestPasswordReset(email);
        showSuccess(result.message || 'If an account exists for this email, password reset instructions have been dispatched.');
        form.reset();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Password Reset Link';
        isSubmitting = false;
      } catch (err) {
        showError('Unable to dispatch reset link. Please check your network and try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Password Reset Link';
        isSubmitting = false;
      }
    });
  }
}
