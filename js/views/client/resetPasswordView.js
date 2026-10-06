/**
 * Legal Sthal - Reset Password View (resetPasswordView.js)
 * Step 4 Authenticated Integration
 */

import { authService } from '../../services/authService.js';
import { toast } from '../../ui/toast.js';

export function renderResetPassword() {
  return `
    <div style="min-height: 100vh; display: flex; width: 100%; background-color: #0b1325; color: white;">
      <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem;">
        <div class="login-card-container" style="width: 100%; max-width: 480px; background-color: #0f172a; padding: 2.5rem; border-radius: 20px; border: 1px solid rgba(212, 175, 55, 0.25); box-shadow: 0 20px 48px -12px rgba(0,0,0,0.85), 0 0 25px rgba(212, 175, 55, 0.1);">
          
          <div style="display: flex; align-items: center; gap: 0.85rem; margin-bottom: 1.5rem;">
            <div style="width: 46px; height: 46px; background-color: #ffffff; border-radius: 12px; display: flex; align-items: center; justify-content: center; padding: 5px; box-shadow: 0 4px 14px rgba(212, 175, 55, 0.3); border: 1px solid rgba(212, 175, 55, 0.4); flex-shrink: 0;">
              <img src="assets/logo.png" alt="Legal Sthal" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>
            <div>
              <h2 style="font-family: var(--font-heading); font-size: 1.45rem; font-weight: 700; color: #ffffff;">Set New Password</h2>
              <span style="font-size: 0.72rem; text-transform: uppercase; color: #f3e5ab; font-weight: 700; letter-spacing: 0.08em;">Password Reset Verification</span>
            </div>
          </div>

          <p style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 1.5rem;">
            Enter your new secure password below to complete the account recovery process.
          </p>

          <!-- Success Alert -->
          <div id="reset-pwd-success" style="display: none; background-color: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; font-size: 0.875rem; color: #86efac;">
            <p style="margin-bottom: 0.75rem;">Password has been successfully updated! You can now sign in with your new password.</p>
            <a href="#client/login" class="btn btn-primary btn-block" style="text-align: center; text-decoration: none;">Proceed to Sign In</a>
          </div>

          <!-- Error Alert -->
          <div id="reset-pwd-error" style="display: none; background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.25rem; font-size: 0.875rem; color: #fca5a5;" aria-live="polite">
          </div>

          <form id="reset-password-form">
            <div class="form-group">
              <label class="form-label" for="reset-new-pwd" style="color: #cbd5e1;">New Password</label>
              <input type="password" id="reset-new-pwd" class="form-control" placeholder="••••••••" required autocomplete="new-password" />
            </div>

            <div class="form-group">
              <label class="form-label" for="reset-confirm-pwd" style="color: #cbd5e1;">Confirm New Password</label>
              <input type="password" id="reset-confirm-pwd" class="form-control" placeholder="••••••••" required autocomplete="new-password" />
            </div>

            <!-- Password Policy Checklist -->
            <div style="background-color: #0b1325; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 0.85rem 1rem; margin-bottom: 1.5rem; font-size: 0.8125rem;">
              <span style="color: #94a3b8; font-weight: 600; display: block; margin-bottom: 0.4rem;">Password Requirements:</span>
              <ul style="list-style: none; padding-left: 0; margin: 0; display: flex; flex-direction: column; gap: 0.25rem;">
                <li id="reset-req-len" style="color: #64748b;">• Minimum 8 characters</li>
                <li id="reset-req-upper" style="color: #64748b;">• At least one uppercase letter (A-Z)</li>
                <li id="reset-req-lower" style="color: #64748b;">• At least one lowercase letter (a-z)</li>
                <li id="reset-req-num" style="color: #64748b;">• At least one numerical digit (0-9)</li>
                <li id="reset-req-spec" style="color: #64748b;">• At least one special symbol (!@#$%^&*...)</li>
              </ul>
            </div>

            <button type="submit" class="btn btn-primary btn-block btn-lg" id="reset-pwd-submit-btn" style="height: 48px; font-size: 1rem;">
              Reset Password & Secure Account
            </button>
          </form>

          <div style="margin-top: 1.5rem; text-align: center;">
            <a href="#client/login" style="color: #94a3b8; font-size: 0.8125rem; text-decoration: underline;">
              Back to Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function bindResetPasswordEvents(routerNavigate) {
  const form = document.getElementById('reset-password-form');
  const newPwdInput = document.getElementById('reset-new-pwd');
  const confirmPwdInput = document.getElementById('reset-confirm-pwd');
  const submitBtn = document.getElementById('reset-pwd-submit-btn');
  const errorAlert = document.getElementById('reset-pwd-error');
  const successBox = document.getElementById('reset-pwd-success');

  // Policy requirement indicators
  const reqLen = document.getElementById('reset-req-len');
  const reqUpper = document.getElementById('reset-req-upper');
  const reqLower = document.getElementById('reset-req-lower');
  const reqNum = document.getElementById('reset-req-num');
  const reqSpec = document.getElementById('reset-req-spec');

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

  function extractResetToken() {
    // Check hash query string (e.g. #client/reset-password?token=...)
    const hash = window.location.hash;
    const hashQueryIdx = hash.indexOf('?');
    if (hashQueryIdx !== -1) {
      const params = new URLSearchParams(hash.substring(hashQueryIdx));
      const token = params.get('token');
      if (token) return token;
    }
    // Check standard URL query params (?token=...)
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token');
  }

  function showError(msg) {
    if (errorAlert) {
      errorAlert.textContent = msg;
      errorAlert.style.display = 'block';
    }
    if (successBox) successBox.style.display = 'none';
  }

  const resetToken = extractResetToken();
  if (!resetToken) {
    showError('No reset token found in this link. Please request a new password reset link.');
    if (submitBtn) submitBtn.disabled = true;
  }

  if (form) {
    let isSubmitting = false;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      const token = extractResetToken();
      if (!token) {
        showError('No reset token provided. Please request a new link.');
        return;
      }

      const newPwd = newPwdInput.value;
      const confirmPwd = confirmPwdInput.value;

      if (!newPwd || !confirmPwd) {
        showError('Please enter and confirm your new password.');
        return;
      }

      if (newPwd !== confirmPwd) {
        showError('New password and confirmation password do not match.');
        return;
      }

      const policy = authService.validatePasswordPolicy(newPwd);
      if (!policy.valid) {
        showError(policy.errors.join(' '));
        return;
      }

      isSubmitting = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Resetting Password...';

      try {
        const result = await authService.resetPassword(token, newPwd, confirmPwd);

        if (result.success) {
          form.style.display = 'none';
          if (errorAlert) errorAlert.style.display = 'none';
          if (successBox) successBox.style.display = 'block';
          toast.success('Password Reset', 'Password updated successfully. Please sign in.');
        } else {
          showError(result.error.message || 'Failed to reset password. The link may have expired.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Reset Password & Secure Account';
          isSubmitting = false;
        }
      } catch (err) {
        showError('Unable to connect to Legal Sthal services. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Reset Password & Secure Account';
        isSubmitting = false;
      }
    });
  }
}
