/**
 * Legal Sthal - Sidebar & Mobile Drawer Navigation Renderer
 */

import { authService } from '../services/authService.js';
import { icons } from './components.js';

export function renderSidebar(currentRoute) {
  const user = authService.getCurrentUser();
  const isAdmin = authService.isAdmin();

  const clientNavItems = [
    { route: 'client/dashboard', label: 'Dashboard', icon: icons.dashboard },
    { route: 'client/services', label: 'My Services', icon: icons.services },
    { route: 'client/documents', label: 'Documents', icon: icons.documents },
    { route: 'client/payments', label: 'Payments', icon: icons.payments },
    { route: 'client/new-service', label: 'Avail New Services', icon: icons.plus },
    { route: 'client/quote-requests', label: 'Quote Requests', icon: icons.quotes },
    { route: 'client/support', label: 'Support', icon: icons.support }
  ];

  const adminNavItems = [
    { route: 'admin/dashboard', label: 'Dashboard', icon: icons.dashboard },
    { route: 'admin/clients', label: 'Clients', icon: icons.profile },
    { route: 'admin/services', label: 'Service Management', icon: icons.services },
    { route: 'admin/documents', label: 'Document Workspace', icon: icons.documents },
    { route: 'admin/spocs', label: 'SPOC Team', icon: icons.support },
    { route: 'admin/quote-requests', label: 'Quote Requests', icon: icons.quotes },
    { route: 'admin/notifications', label: 'Notifications Log', icon: icons.alert },
    { route: 'admin/sync', label: 'Zoho CRM Sync', icon: icons.sync },
    { route: 'admin/settings', label: 'Settings', icon: icons.settings }
  ];

  const items = isAdmin ? adminNavItems : clientNavItems;

  return `
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
    <aside class="sidebar" id="app-sidebar">
      <div class="sidebar-header">
        <div class="logo-badge">
          <img src="assets/logo.png" alt="Legal Sthal Logo" class="logo-img" />
        </div>
        <div class="logo-text">
          <span class="logo-title">Legal Sthal</span>
          <span class="logo-sub">${isAdmin ? 'Admin Portal' : 'Client Portal'}</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-title">Navigation</div>
        ${items.map(item => {
          const isActive = currentRoute === item.route || currentRoute.startsWith(item.route + '/');
          return `
            <a href="#${item.route}" class="nav-item ${isActive ? 'active' : ''}">
              ${item.icon}
              <span>${item.label}</span>
            </a>
          `;
        }).join('')}

        <div class="nav-divider"></div>
        <div class="nav-section-title">Account</div>

        ${!isAdmin ? `
          <a href="#client/profile" class="nav-item ${currentRoute === 'client/profile' ? 'active' : ''}">
            ${icons.profile}
            <span>Profile & Security</span>
          </a>
        ` : ''}

        <a href="#" class="nav-item js-logout-btn">
          ${icons.logout}
          <span>Logout</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <div style="font-size: 0.75rem; color: #94a3b8; display: flex; align-items: center; gap: 0.5rem;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background-color: #22c55e;"></div>
          <span>Legal Sthal System Online</span>
        </div>
      </div>
    </aside>
  `;
}
