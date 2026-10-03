/**
 * Legal Sthal - Modal Manager
 */

class ModalManager {
  constructor() {
    this.backdrop = null;
    this.dialog = null;
    this.titleEl = null;
    this.bodyEl = null;
    this.footerEl = null;
    this.init();
  }

  init() {
    let backdrop = document.getElementById('global-modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'global-modal-backdrop';
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `
        <div class="modal-dialog" id="global-modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title" id="global-modal-title">Modal Title</h3>
            <button class="modal-close-btn" id="global-modal-close-btn">&times;</button>
          </div>
          <div class="modal-body" id="global-modal-body"></div>
          <div class="modal-footer" id="global-modal-footer"></div>
        </div>
      `;
      document.body.appendChild(backdrop);
    }

    this.backdrop = backdrop;
    this.dialog = document.getElementById('global-modal-dialog');
    this.titleEl = document.getElementById('global-modal-title');
    this.bodyEl = document.getElementById('global-modal-body');
    this.footerEl = document.getElementById('global-modal-footer');

    const closeBtn = document.getElementById('global-modal-close-btn');
    closeBtn.addEventListener('click', () => this.close());

    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.backdrop.classList.contains('active')) {
        this.close();
      }
    });
  }

  open({ title = '', bodyHtml = '', footerHtml = '', size = 'md', onOpen = null }) {
    this.titleEl.textContent = title;
    this.bodyEl.innerHTML = bodyHtml;
    this.footerEl.innerHTML = footerHtml;

    if (size === 'lg') {
      this.dialog.classList.add('modal-lg');
    } else {
      this.dialog.classList.remove('modal-lg');
    }

    this.backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (typeof onOpen === 'function') {
      onOpen(this.dialog);
    }
  }

  close() {
    this.backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }
}

export const modal = new ModalManager();
