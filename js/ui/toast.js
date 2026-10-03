/**
 * Legal Sthal - Toast Notification Renderer
 */

import { icons } from './components.js';

class ToastManager {
  constructor() {
    this.container = null;
  }

  initContainer() {
    if (!this.container) {
      let el = document.getElementById('toast-container');
      if (!el) {
        el = document.createElement('div');
        el.id = 'toast-container';
        document.body.appendChild(el);
      }
      this.container = el;
    }
  }

  show(type = 'success', title = '', message = '', duration = 4000) {
    this.initContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconHtml = icons.check;
    if (type === 'error') iconHtml = icons.alert;
    if (type === 'warning') iconHtml = icons.alert;
    if (type === 'info') iconHtml = icons.quotes;

    toast.innerHTML = `
      <div class="toast-icon">${iconHtml}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <div class="toast-close">&times;</div>
    `;

    this.container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.dismiss(toast));

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }
  }

  dismiss(toast) {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });
  }

  success(title, message) { this.show('success', title, message); }
  error(title, message) { this.show('error', title, message); }
  warning(title, message) { this.show('warning', title, message); }
  info(title, message) { this.show('info', title, message); }
}

export const toast = new ToastManager();
