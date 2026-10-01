/**
 * Legal Sthal - Client Login View
 */

import { authService } from '../../services/authService.js';
import { toast } from '../../ui/toast.js';
import { icons } from '../../ui/components.js';

export function renderClientLogin() {
  return `
    <div style="min-height: 100vh; display: flex; width: 100%; background-color: #0b1325; color: #f8fafc;">
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

          <h1 style="font-family: var(--font-heading); font-size: 2.6rem; font-weight: 700; line-height: 1.2; max-width: 520px; color: #ffffff;">
            Legal & Business Compliance, Simplified.
          </h1>
          <p style="color: #94a3b8; font-size: 1.05rem; margin-top: 1.25rem; max-width: 480px; line-height: 1.6;">
            Track incorporation progress, submit documents seamlessly, view stage timelines, and manage all your business services under one unified account.
          </p>
        </div>

        <div style="border-top: 1px solid rgba(212, 175, 55, 0.15); padding-top: 1.5rem; color: #64748b; font-size: 0.875rem;">
          Trusted by over 1,200+ growing companies across India.
        </div>
      </div>

      <!-- Right Side Login Card Form -->
      <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem; background-color: #0b1325;">
        <div style="width: 100%; max-width: 440px; background-color: #0f172a; padding: 2.5rem; border-radius: 20px; border: 1px solid rgba(212, 175, 55, 0.25); box-shadow: 0 20px 48px -12px rgba(0, 0, 0, 0.85), 0 0 25px rgba(212, 175, 55, 0.1);">
          <div style="margin-bottom: 2rem;">
            <h2 style="font-family: var(--font-heading); font-size: 1.85rem; font-weight: 700; color: #ffffff;">Welcome back</h2>
            <p style="color: #94a3b8; font-size: 0.9375rem; margin-top: 0.35rem;">Access your Legal Sthal client portal account</p>
          </div>

          <form id="client-login-form">
            <div class="form-group">
              <label class="form-label" for="login-email">Email or Client ID</label>
              <input type="text" id="login-email" class="form-control" placeholder="abc@gmail.com or CL001" value="abc@gmail.com" required />
            </div>

            <div class="form-group">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;">
                <label class="form-label" for="login-password" style="margin-bottom: 0;">Password</label>
                <a href="#" id="forgot-password-link" style="font-size: 0.8125rem; color: #f3e5ab; font-weight: 500;">Forgot Password?</a>
              </div>
              <div style="position: relative;">
                <input type="password" id="login-password" class="form-control" value="password123" required />
                <button type="button" id="toggle-password-btn" style="position: absolute; right: 0.85rem; top: 50%; transform: translateY(-50%); color: #d4af37; font-size: 0.8125rem; font-weight: 600;">Show</button>
              </div>
            </div>

            <div style="display: flex; align-items: center; margin-bottom: 1.75rem;">
              <input type="checkbox" id="remember-me" checked style="margin-right: 0.65rem; accent-color: #d4af37; width: 16px; height: 16px; cursor: pointer;" />
              <label for="remember-me" style="font-size: 0.875rem; color: #cbd5e1; cursor: pointer;">Remember me on this device</label>
            </div>

            <button type="submit" class="btn btn-primary btn-block btn-lg" id="login-submit-btn" style="height: 48px; font-size: 1rem;">
              Sign In to Account
            </button>
          </form>

          <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
            <span style="font-size: 0.8125rem; color: #94a3b8;">
              Are you an internal team member? 
              <a href="#admin/login" style="color: #f3e5ab; font-weight: 600; text-decoration: underline;">Go to Admin Portal</a>
            </span>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function bindClientLoginEvents(onSuccess) {
  const form = document.getElementById('client-login-form');
  const pwdInput = document.getElementById('login-password');
  const toggleBtn = document.getElementById('toggle-password-btn');

  if (toggleBtn && pwdInput) {
    toggleBtn.addEventListener('click', () => {
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
      toggleBtn.textContent = isPwd ? 'Hide' : 'Show';
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const pwd = pwdInput.value;

      const submitBtn = document.getElementById('login-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';

      setTimeout(() => {
        const result = authService.login(email, pwd, 'client');
        if (result.success) {
          toast.success('Login Successful', `Welcome back, ${result.user.companyName}`);
          onSuccess();
        } else {
          toast.error('Login Failed', result.message);
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In to Account';
        }
      }, 500);
    });
  }

  const forgotLink = document.getElementById('forgot-password-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Password reset link has been sent to your registered email address.');
    });
  }
}
