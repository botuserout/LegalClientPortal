/**
 * Legal Sthal - Main Application Entry & Hash Router
 */

import { authService } from './services/authService.js';
import { dataStore } from './services/dataStore.js';
import { renderSidebar } from './ui/sidebar.js';
import { renderHeader } from './ui/header.js';
import { renderDemoBar, bindDemoBarEvents } from './ui/demoBar.js';
import { toast } from './ui/toast.js';

// Client Views
import { renderClientLogin, bindClientLoginEvents } from './views/client/loginView.js';
import { renderClientDashboard } from './views/client/dashboardView.js';
import { renderClientServices } from './views/client/servicesView.js';
import { renderClientServiceDetail, bindClientServiceDetailEvents } from './views/client/serviceDetailView.js';
import { renderClientDocuments } from './views/client/documentsView.js';
import { renderClientPayments } from './views/client/paymentsView.js';
import { renderClientNewServices, bindClientNewServicesEvents } from './views/client/newServiceView.js';
import { renderClientQuoteRequests } from './views/client/quoteRequestsView.js';
import { renderClientSupport } from './views/client/supportView.js';
import { renderClientProfile, bindClientProfileEvents } from './views/client/profileView.js';

// Admin Views
import { renderAdminLogin, bindAdminLoginEvents } from './views/admin/loginView.js';
import { renderAdminDashboard } from './views/admin/dashboardView.js';
import { renderAdminClients, bindAdminClientsEvents } from './views/admin/clientsView.js';
import { renderAdminClientDetail, bindAdminClientDetailEvents } from './views/admin/clientDetailView.js';
import { renderAdminServicesConfig, bindAdminServicesConfigEvents } from './views/admin/servicesConfigView.js';
import { renderAdminServiceDetail, bindAdminServiceDetailEvents } from './views/admin/serviceDetailView.js';
import { renderAdminDocuments, bindAdminDocumentsEvents } from './views/admin/documentsView.js';
import { renderAdminSpocs } from './views/admin/spocsView.js';
import { renderAdminQuoteRequests, bindAdminQuoteRequestsEvents } from './views/admin/quoteRequestsView.js';
import { renderAdminNotifications } from './views/admin/notificationsView.js';
import { renderAdminCrmSync, bindAdminCrmSyncEvents } from './views/admin/crmSyncView.js';
import { renderAdminSettings, bindAdminSettingsEvents } from './views/admin/settingsView.js';

class App {
  constructor() {
    this.root = document.getElementById('app-root');
    this.currentRoute = 'client/dashboard';
  }

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    bindDemoBarEvents((route) => this.navigate(route));
    this.handleRoute();
  }

  navigate(route) {
    window.location.hash = `#${route}`;
  }

  async handleRoute() {
    let hash = window.location.hash.replace(/^#\/?/, '').trim();
    if (!hash) {
      hash = authService.isAdmin() ? 'admin/dashboard' : 'client/dashboard';
    }

    this.currentRoute = hash;

    // Check login screens
    if (hash === 'client/login') {
      this.root.innerHTML = renderClientLogin();
      bindClientLoginEvents(() => this.navigate('client/dashboard'));
      return;
    }

    if (hash === 'admin/login') {
      this.root.innerHTML = renderAdminLogin();
      bindAdminLoginEvents(() => this.navigate('admin/dashboard'));
      return;
    }

    // Role safety redirection
    if (hash.startsWith('admin') && !authService.isAdmin()) {
      authService.switchRole('admin');
    } else if (hash.startsWith('client') && !authService.isClient()) {
      authService.switchRole('client', 'CL001');
    }

    // Parse route parameters
    const parts = hash.split('/');
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

    // Assemble full standard layout shell
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

    // Bind event listeners
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

      // Auto-close sidebar on mobile nav click
      sidebar.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', closeDrawer);
      });
    }

    // Logout button
    const logoutBtns = document.querySelectorAll('.js-logout-btn');
    logoutBtns.forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        authService.logout();
        toast.info('Logged Out', 'You have been signed out.');
        this.navigate('client/login');
      };
    });

    // View specific event binding
    bindClientServiceDetailEvents();
    bindClientNewServicesEvents();
    bindClientProfileEvents();
    bindAdminClientsEvents();
    bindAdminClientDetailEvents();
    bindAdminServiceDetailEvents();
    bindAdminServicesConfigEvents();
    bindAdminDocumentsEvents();
    bindAdminQuoteRequestsEvents();
    bindAdminCrmSyncEvents();
    bindAdminSettingsEvents();
  }
}

// Instantiate and start app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
