/**
 * Legal Sthal - Header Topbar Renderer (header.js)
 * Version: 2.1.0 (Step 8 Notifications & Automation Core)
 */

import { authService } from '../services/authService.js';
import { notificationService } from '../services/notificationService.js';
import { icons } from './components.js';

export function renderHeader(title = 'Dashboard', breadcrumbs = []) {
  const user = authService.getCurrentUser();
  const isAdmin = authService.isAdmin();

  const userName = user ? (user.companyName || user.name || user.email || 'User') : (isAdmin ? 'Operations Admin' : 'Client');
  const userSub = isAdmin ? (user ? `Role: ${user.role}` : 'Operations Admin') : (user ? (user.clientId ? `Client ID: ${user.clientId}` : `Contact: ${user.contactPerson || user.email}`) : 'Client Portal');

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

        <!-- Notification Bell & In-App Dropdown -->
        <div class="header-notif-wrapper" style="position: relative; margin-right: 0.75rem;">
          <button class="icon-btn js-toggle-notifs-btn" aria-label="Notifications" style="position: relative; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-main);">
            ${icons.bell}
            <span class="notif-badge js-notif-badge" style="display: none; position: absolute; top: -4px; right: -4px; background: #e11d48; color: #fff; font-size: 0.6875rem; font-weight: 700; min-width: 18px; height: 18px; border-radius: 9px; line-height: 18px; text-align: center; padding: 0 4px;">0</span>
          </button>

          <div class="notif-dropdown js-notif-dropdown" style="display: none;">
            <div class="notif-dropdown-header">
              <h4 class="notif-dropdown-title">Notifications</h4>
              <button class="btn-link js-mark-all-read-btn" style="font-size: 0.75rem; color: var(--accent-gold, #d4af37); background: none; border: none; cursor: pointer; text-decoration: underline;">Mark all as read</button>
            </div>
            <div class="notif-list js-notif-list">
              <div style="padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">Loading notifications...</div>
            </div>
          </div>
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

let headerEventsBound = false;

export function bindHeaderEvents() {
  const toggleBtn = document.querySelector('.js-toggle-notifs-btn');
  const dropdown = document.querySelector('.js-notif-dropdown');
  const notifList = document.querySelector('.js-notif-list');
  const badge = document.querySelector('.js-notif-badge');
  const markAllBtn = document.querySelector('.js-mark-all-read-btn');

  if (!toggleBtn || !dropdown) return;

  if (headerEventsBound) return;
  headerEventsBound = true;

  toggleBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';

    if (!isVisible) {
      try {
        const notifs = await notificationService.getNotifications();
        if (!notifs || notifs.length === 0) {
          notifList.innerHTML = `
            <div style="padding: 2.5rem 1rem; text-align: center; color: var(--text-muted);">
              <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔔</div>
              <div style="font-weight: 600; margin-bottom: 0.25rem;">No notifications</div>
              <div style="font-size: 0.8125rem;">You are completely caught up!</div>
            </div>
          `;
          return;
        }

        notifList.innerHTML = notifs.map(n => `
          <div class="notif-item js-notif-item ${!n.isRead ? 'unread' : ''}" data-id="${n.id}" data-type="${n.relatedEntityType}" style="padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-color); cursor: pointer; background: ${n.isRead ? 'transparent' : 'rgba(11, 19, 37, 0.03)'}; transition: background 0.15s ease;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.25rem;">
              <span style="font-size: 0.8125rem; font-weight: 600; color: ${n.isRead ? 'var(--text-main)' : 'var(--primary-main)'};">${n.title}</span>
              <span style="font-size: 0.6875rem; color: var(--text-muted);">${n.date}</span>
            </div>
            <p style="margin: 0; font-size: 0.8125rem; color: var(--text-muted); line-height: 1.4;">${n.message}</p>
          </div>
        `).join('');

      } catch (err) {
        notifList.innerHTML = `<div style="padding: 1.5rem 1rem; text-align: center; color: var(--error-main); font-size: 0.8125rem;">Failed to load notifications</div>`;
      }
    }
  });

  // Mark single item read & navigate
  if (notifList) {
    notifList.addEventListener('click', (e) => {
      const item = e.target.closest('.js-notif-item');
      if (item) {
        const id = item.dataset.id;
        const type = item.dataset.type;
        notificationService.markNotificationRead(id).then(() => {
          item.style.background = 'transparent';
          if (badge) {
            const cur = parseInt(badge.textContent, 10) || 0;
            if (cur > 1) badge.textContent = cur - 1;
            else badge.style.display = 'none';
          }
        });

        // Navigate to related view if appropriate
        const isAdmin = authService.isAdmin();
        if (type === 'DOCUMENT') window.location.hash = isAdmin ? '#admin/documents' : '#client/documents';
        else if (type === 'QUOTE_REQUEST') window.location.hash = isAdmin ? '#admin/quote-requests' : '#client/quote-requests';
        else if (type === 'SERVICE') window.location.hash = isAdmin ? '#admin/services' : '#client/services';
        dropdown.style.display = 'none';
      }
    });
  }

  // Mark all as read
  if (markAllBtn) {
    markAllBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notificationService.markAllNotificationsRead().then(() => {
        if (badge) badge.style.display = 'none';
        document.querySelectorAll('.js-notif-item').forEach(el => {
          el.style.background = 'transparent';
        });
      });
    });
  }

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !toggleBtn.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}
