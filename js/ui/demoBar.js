/**
 * Legal Sthal - Interactive Demo & Workflow Bar
 * Allows easy switching between Client & Admin views and testing the end-to-end user scenario
 */

import { authService } from '../services/authService.js';
import { dataStore } from '../services/dataStore.js';
import { toast } from './toast.js';

export function renderDemoBar(currentRoute) {
  const user = authService.getCurrentUser();
  const isAdmin = authService.isAdmin();

  return `
    <div class="demo-workflow-bar">
      <div class="demo-bar-left">
        <span class="demo-tag">Legal Sthal SaaS Prototype</span>
        <span class="demo-text" style="color: #94a3b8;">
          Active Mode: <strong style="color: #ffffff;">${isAdmin ? 'ADMIN PORTAL' : 'CLIENT PORTAL (ABC Technologies)'}</strong>
        </span>
      </div>

      <div class="demo-bar-actions">
        <button class="demo-btn ${!isAdmin ? 'active' : ''} js-switch-client">
          👤 Client View
        </button>

        <button class="demo-btn ${isAdmin ? 'active' : ''} js-switch-admin">
          🛡️ Admin View
        </button>

        <button class="demo-btn js-reset-mock" title="Reset all data to default initial state">
          🔄 Reset State
        </button>
      </div>
    </div>
  `;
}

export function bindDemoBarEvents(routerNavigate) {
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
