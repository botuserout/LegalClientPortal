/**
 * Legal Sthal - Interactive Demo & Workflow Bar
 * Allows easy switching between Client & Admin views and testing the end-to-end user scenario
 */

import { authService } from '../services/authService.js';
import { dataStore } from '../services/dataStore.js';
import { CONFIG } from '../config.js';
import { toast } from './toast.js';

export function renderDemoBar(currentRoute) {
  if (CONFIG.isLiveEndpointConfigured()) {
    return ''; // Hidden in live production
  }
  const user = authService.getCurrentUser();
  const isAdmin = authService.isAdmin();
  const isAuth = authService.isAuthenticated();

  const userDesc = isAuth 
    ? (user ? `${user.name || user.email} [${user.role}]` : 'Active Session')
    : 'Guest (Not Signed In)';

  return `
    <div class="demo-workflow-bar">
      <div class="demo-bar-left">
        <span class="demo-tag" style="background: ${isAuth ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${isAuth ? '#86efac' : '#fca5a5'};">
          ${isAuth ? '● Authenticated' : '○ Signed Out'}
        </span>
        <span class="demo-text" style="color: #94a3b8;">
          User: <strong style="color: #ffffff;">${userDesc}</strong>
        </span>
      </div>

      <div class="demo-bar-actions">
        ${!isAuth ? `
          <a href="#client/login" class="demo-btn">👤 Client Sign In</a>
          <a href="#admin/login" class="demo-btn">🛡️ Admin Sign In</a>
        ` : `
          <a href="#${isAdmin ? 'admin/dashboard' : 'client/dashboard'}" class="demo-btn active">
            ${isAdmin ? '🛡️ Admin Console' : '👤 Client Portal'}
          </a>
          <button class="demo-btn js-logout-btn" style="color: #fca5a5;">
            Sign Out
          </button>
        `}
      </div>
    </div>
  `;
}

export function bindDemoBarEvents(routerNavigate) {
  if (CONFIG.isLiveEndpointConfigured()) {
    return;
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('.js-switch-client')) {
      authService.switchRole('client', 'CL001');
      toast.info('Switched View', 'Logged in as Client: ABC Technologies Pvt Ltd');
      routerNavigate('client/dashboard');
    }

    if (e.target.closest('.js-switch-admin')) {
      authService.switchRole('admin');
      toast.info('Switched View', 'Logged in as Admin: Legal Sthal Operations');
      routerNavigate('admin/dashboard');
    }

    if (e.target.closest('.js-reset-mock')) {
      if (confirm('Reset prototype data state to initial default?')) {
        dataStore.resetStore();
        toast.success('Data Reset', 'All mock data has been reset to defaults.');
        window.location.reload();
      }
    }
  });
}
