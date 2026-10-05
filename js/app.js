/**
 * Legal Sthal - Main Application Entry & Hash Router (app.js)
 * Version: 2.0.0 (Step 4 Authenticated Integration)
 */

import { authService } from './services/authService.js';
import { authGuard } from './guards/authGuard.js';
import { renderSidebar } from './ui/sidebar.js';
import { renderHeader, bindHeaderEvents } from './ui/header.js';
import { renderDemoBar, bindDemoBarEvents } from './ui/demoBar.js';
import { toast } from './ui/toast.js';

// Auth & Security Views
import { renderClientLogin, bindClientLoginEvents } from './views/client/loginView.js';
import { renderClientRegister, bindClientRegisterEvents } from './views/client/registerView.js';
import { renderAdminLogin, bindAdminLoginEvents } from './views/admin/loginView.js';
import { renderChangePassword, bindChangePasswordEvents } from './views/client/changePasswordView.js';
import { renderForgotPassword, bindForgotPasswordEvents } from './views/client/forgotPasswordView.js';
import { renderResetPassword, bindResetPasswordEvents } from './views/client/resetPasswordView.js';

// Client Portal Views
import { renderClientDashboard } from './views/client/dashboardView.js';
import { renderClientServices } from './views/client/servicesView.js';
import { renderClientServiceDetail, bindClientServiceDetailEvents } from './views/client/serviceDetailView.js';
import { renderClientDocuments } from './views/client/documentsView.js';
import { renderClientPayments } from './views/client/paymentsView.js';
import { renderClientNewServices, bindClientNewServicesEvents } from './views/client/newServiceView.js';
import { renderClientQuoteRequests } from './views/client/quoteRequestsView.js';
import { renderClientSupport } from './views/client/supportView.js';
import { renderClientProfile, bindClientProfileEvents } from './views/client/profileView.js';

// Admin Portal Views
import { renderAdminDashboard } from './views/admin/dashboardView.js';
import { renderAdminClients, bindAdminClientsEvents } from './views/admin/clientsView.js';
import { renderAdminClientDetail, bindAdminClientDetailEvents } from './views/admin/clientDetailView.js';
import { renderAdminServicesConfig, bindAdminServicesConfigEvents } from './views/admin/servicesConfigView.js';
import { renderAdminServiceDetail, bindAdminServiceDetailEvents } from './views/admin/serviceDetailView.js';
import { renderAdminDocuments, bindAdminDocumentsEvents } from './views/admin/documentsView.js';
import { renderAdminSpocs } from './views/admin/spocsView.js';
import { renderAdminQuoteRequests, bindAdminQuoteRequestsEvents } from './views/admin/quoteRequestsView.js';
import { renderAdminNotifications, bindAdminNotificationEvents } from './views/admin/notificationsView.js';
import { renderAdminCrmSync, bindAdminCrmSyncEvents } from './views/admin/crmSyncView.js';
import { renderAdminSettings, bindAdminSettingsEvents } from './views/admin/settingsView.js';

class App {
  constructor() {
    this.root = document.getElementById('app-root');
    this.currentRoute = 'client/dashboard';
  }

  async init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    bindDemoBarEvents((route) => this.navigate(route));

    // Re-verify session with authoritative backend if token exists
    if (authService.isAuthenticated()) {
      try {
        await authService.getMe();
      } catch (e) {
        // Fallback handled by authService
      }
    }

    this.handleRoute();
  }

  navigate(route) {
    const targetHash = `#${route}`;
    if (window.location.hash === targetHash) return;
    window.location.hash = targetHash;
  }

  async handleRoute() {
    let fullHash = window.location.hash.replace(/^#\/?/, '').trim();
    if (!fullHash) {
      fullHash = authService.isAdmin() ? 'admin/dashboard' : 'client/dashboard';
    }

    const cleanRoute = fullHash.split('?')[0].trim();
    this.currentRoute = fullHash;

    // 1. Evaluate route access through centralized authGuard
    const access = authGuard.evaluateRoute(fullHash);
    if (!access.allowed && access.redirectTo) {
      if (access.reason === 'FIRST_LOGIN_MANDATORY') {
        toast.warning('Security Setup', 'Please set your permanent password to continue.');
      } else if (access.reason === 'FORBIDDEN_CLIENT_ROLE') {
        toast.error('Access Denied', 'Administrative privileges required.');
      }
      this.navigate(access.redirectTo);
      return;
    }

    // 2. Render Public & Dedicated Auth Screens
    if (cleanRoute === 'client/login') {
      this.root.innerHTML = renderClientLogin();
      bindClientLoginEvents((route) => this.navigate(route));
      return;
    }

    if (cleanRoute === 'client/register') {
      this.root.innerHTML = renderClientRegister();
      bindClientRegisterEvents((route) => this.navigate(route));
      return;
    }

    if (cleanRoute === 'admin/login') {
      this.root.innerHTML = renderAdminLogin();
      bindAdminLoginEvents((route) => this.navigate(route));
      return;
    }

    if (cleanRoute === 'client/change-password') {
      this.root.innerHTML = renderChangePassword();
      bindChangePasswordEvents((route) => this.navigate(route));
      return;
    }

    if (cleanRoute === 'client/forgot-password') {
      this.root.innerHTML = renderForgotPassword();
      bindForgotPasswordEvents((route) => this.navigate(route));
      return;
    }

    if (cleanRoute === 'client/reset-password') {
      this.root.innerHTML = renderResetPassword();
      bindResetPasswordEvents((route) => this.navigate(route));
      return;
    }

    // 3. Parse Portal Page Route Parameters
    const parts = cleanRoute.split('/');
    const portal = parts[0];
    const page = parts[1] || 'dashboard';
    const paramId = parts[2] || null;

    let viewHtml = '';
    let pageTitle = 'Dashboard';
    let breadcrumbs = [page];

    try {
      if (portal === 'client') {
        if (page === 'dashboard') {
          pageTitle = 'Dashboard';
          breadcrumbs = ['Dashboard'];
          viewHtml = await renderClientDashboard();
        } else if (page === 'services') {
          if (paramId) {
            pageTitle = 'Service Details';
            breadcrumbs = ['My Services', paramId];
            viewHtml = await renderClientServiceDetail(paramId);
          } else {
            pageTitle = 'My Services';
            breadcrumbs = ['My Services'];
            viewHtml = await renderClientServices();
          }
        } else if (page === 'documents') {
          pageTitle = 'Documents';
          breadcrumbs = ['Documents'];
          viewHtml = await renderClientDocuments();
        } else if (page === 'payments') {
          pageTitle = 'Payments';
          breadcrumbs = ['Payments'];
          viewHtml = await renderClientPayments();
        } else if (page === 'new-service') {
          pageTitle = 'Avail New Services';
          breadcrumbs = ['Avail New Services'];
          viewHtml = await renderClientNewServices();
        } else if (page === 'quote-requests') {
          pageTitle = 'Quote Requests';
          breadcrumbs = ['Quote Requests'];
          viewHtml = await renderClientQuoteRequests();
        } else if (page === 'support') {
          pageTitle = 'Support Desk';
          breadcrumbs = ['Support'];
          viewHtml = await renderClientSupport();
        } else if (page === 'profile') {
          pageTitle = 'Profile & Security';
          breadcrumbs = ['Profile'];
          viewHtml = await renderClientProfile();
        }
      } else if (portal === 'admin') {
        if (page === 'dashboard') {
          pageTitle = 'Operations Dashboard';
          breadcrumbs = ['Dashboard'];
          viewHtml = await renderAdminDashboard();
        } else if (page === 'clients') {
          if (paramId) {
            pageTitle = 'Client Profile';
            breadcrumbs = ['Clients', paramId];
            viewHtml = await renderAdminClientDetail(paramId);
          } else {
            pageTitle = 'Clients Master Directory';
            breadcrumbs = ['Clients'];
            viewHtml = await renderAdminClients();
          }
        } else if (page === 'services') {
          if (paramId) {
            pageTitle = 'Service Stage Management';
            breadcrumbs = ['Services', paramId];
            viewHtml = await renderAdminServiceDetail(paramId);
          } else {
            pageTitle = 'Service Offerings Catalog';
            breadcrumbs = ['Services'];
            viewHtml = await renderAdminServicesConfig();
          }
        } else if (page === 'documents') {
          pageTitle = 'Document Verification Workspace';
          breadcrumbs = ['Document Workspace'];
          viewHtml = await renderAdminDocuments();
        } else if (page === 'spocs') {
          pageTitle = 'SPOC Team Directory';
          breadcrumbs = ['SPOC Team'];
          viewHtml = await renderAdminSpocs();
        } else if (page === 'quote-requests') {
          pageTitle = 'Quote Requests Management';
          breadcrumbs = ['Quote Requests'];
          viewHtml = await renderAdminQuoteRequests();
        } else if (page === 'notifications') {
          pageTitle = 'Notification Delivery Logs';
          breadcrumbs = ['Notifications'];
          viewHtml = await renderAdminNotifications();
        } else if (page === 'sync') {
          pageTitle = 'Zoho CRM Sync Status';
          breadcrumbs = ['CRM Sync'];
          viewHtml = await renderAdminCrmSync();
        } else if (page === 'settings') {
          pageTitle = 'Settings';
          breadcrumbs = ['Settings'];
          viewHtml = await renderAdminSettings();
        }
      }
    } catch (e) {
      console.error('Render error:', e);
      viewHtml = `<div class="empty-state"><h3>Something went wrong</h3><p>${e.message}</p></div>`;
    }

    // 4. Assemble standard authenticated layout shell
    this.root.innerHTML = `
      ${renderDemoBar(this.currentRoute)}
      <div class="layout-wrapper">
        ${renderSidebar(this.currentRoute)}
        <div class="main-wrapper">
          ${renderHeader(pageTitle, breadcrumbs)}
          <main class="content-area">
            ${viewHtml}
          </main>
        </div>
      </div>
    `;

    // 5. Bind global navigation and interactive handlers
    this.bindGlobalEvents();
  }

  bindGlobalEvents() {
    // Mobile Drawer Hamburger Toggle
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (toggleBtn && sidebar && backdrop) {
      const openDrawer = () => {
        sidebar.classList.add('open');
        backdrop.classList.add('active');
      };
      const closeDrawer = () => {
        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
      };

      toggleBtn.onclick = openDrawer;
      backdrop.onclick = closeDrawer;

      sidebar.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', closeDrawer);
      });
    }

    // Centralized Logout Handlers
    const logoutBtns = document.querySelectorAll('.js-logout-btn');
    logoutBtns.forEach(btn => {
      btn.onclick = async (e) => {
        e.preventDefault();
        btn.disabled = true;
        await authService.logout();
        toast.info('Signed Out', 'You have been successfully signed out.');
        this.navigate('client/login');
      };
    });

    // View-specific event bindings
    bindHeaderEvents();
    bindClientServiceDetailEvents();
    bindClientNewServicesEvents();
    bindClientProfileEvents();
    bindAdminClientsEvents();
    bindAdminClientDetailEvents();
    bindAdminServiceDetailEvents();
    bindAdminServicesConfigEvents();
    bindAdminDocumentsEvents();
    bindAdminQuoteRequestsEvents();
   if (typeof bindAdminNotificationEvents === 'function') {
  bindAdminNotificationEvents();
}
    bindAdminCrmSyncEvents();
    bindAdminSettingsEvents();
  }
}

// Instantiate and launch application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
