/**
 * Legal Sthal - Header Topbar Renderer
 */

import { authService } from '../services/authService.js';
import { icons } from './components.js';

export function renderHeader(title = 'Dashboard', breadcrumbs = []) {
  const user = authService.getCurrentUser();
  const isAdmin = authService.isAdmin();

  const userName = isAdmin ? (user ? user.name : 'Admin') : (user ? user.companyName : 'ABC Technologies Pvt Ltd');
  const userSub = isAdmin ? 'Operations Admin' : (user ? `Contact: ${user.contactPerson}` : 'Client ID: CL001');

  return `
    <header class="topbar">
      <div class="topbar-left">
        <button class="menu-toggle-btn" id="mobile-menu-toggle" aria-label="Toggle Navigation">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </button>

        <div class="breadcrumbs">
          <span>${isAdmin ? 'Admin' : 'Client'}</span>
          <span class="crumb-sep">/</span>
          ${breadcrumbs.map((b, idx) => `
            <span class="${idx === breadcrumbs.length - 1 ? 'crumb-active' : ''}">${b}</span>
            ${idx < breadcrumbs.length - 1 ? '<span class="crumb-sep">/</span>' : ''}
          `).join('')}
        </div>
      </div>

      <div class="topbar-right">
        <div class="search-box">
          ${icons.search}
          <input type="text" placeholder="Search services, docs..." id="global-search-input" />
        </div>

        <div class="user-profile-badge js-user-menu-btn">
          <div class="avatar-circle">
            ${userName.substring(0, 2).toUpperCase()}
          </div>
          <div class="user-info">
            <span class="user-name">${userName}</span>
            <span class="user-role-tag">${userSub}</span>
          </div>
        </div>
      </div>
    </header>
  `;
}
