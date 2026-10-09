/**
 * Legal Sthal - Opulent Theme Manager (theme.js)
 * Supports Executive Nocturnal (Dark) & Luxury Ivory (Light) modes
 */

import { icons } from './components.js';

const STORAGE_KEY = 'legalsthal_theme';
const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';

export function getTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === THEME_LIGHT || saved === THEME_DARK) {
      return saved;
    }
  } catch (e) {
    // fallback if localStorage is blocked
  }
  return THEME_DARK;
}

export function setTheme(theme) {
  const finalTheme = theme === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;
  document.documentElement.setAttribute('data-theme', finalTheme);
  
  try {
    localStorage.setItem(STORAGE_KEY, finalTheme);
  } catch (e) {
    // Ignore storage errors
  }

  // Update mobile browser header tint
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', finalTheme === THEME_LIGHT ? '#ffffff' : '#0b1325');
  }

  // Update all toggle buttons in DOM
  updateAllThemeButtons(finalTheme);

  // Dispatch custom event for views that listen
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: finalTheme } }));
}

export function toggleTheme() {
  const current = getTheme();
  const next = current === THEME_LIGHT ? THEME_DARK : THEME_LIGHT;
  setTheme(next);
  return next;
}

export function updateAllThemeButtons(theme = getTheme()) {
  const isLight = theme === THEME_LIGHT;
  const buttons = document.querySelectorAll('.js-theme-toggle-btn');
  buttons.forEach((btn) => {
    btn.innerHTML = isLight ? icons.moon : icons.sun;
    btn.setAttribute('title', isLight ? 'Switch to Nocturnal Dark Mode' : 'Switch to Luxury Light Mode');
    btn.setAttribute('aria-label', isLight ? 'Switch to Nocturnal Dark Mode' : 'Switch to Luxury Light Mode');
  });
}

export function renderThemeToggle(extraClass = '', extraStyle = '') {
  const isLight = getTheme() === THEME_LIGHT;
  return `
    <button class="icon-btn js-theme-toggle-btn ${extraClass}" 
            type="button"
            id="theme-toggle-btn"
            aria-label="${isLight ? 'Switch to Nocturnal Dark Mode' : 'Switch to Luxury Light Mode'}"
            title="${isLight ? 'Switch to Nocturnal Dark Mode' : 'Switch to Luxury Light Mode'}"
            style="${extraStyle}">
      ${isLight ? icons.moon : icons.sun}
    </button>
  `;
}

let isInitialized = false;

export function initTheme() {
  // Apply current theme attribute immediately
  const initial = getTheme();
  document.documentElement.setAttribute('data-theme', initial);

  if (isInitialized) return;
  isInitialized = true;

  // Global delegated click listener for any theme toggle button
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.js-theme-toggle-btn');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      toggleTheme();
    }
  });

  // Keep state synchronized if opened across multiple browser tabs
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && (e.newValue === THEME_LIGHT || e.newValue === THEME_DARK)) {
      setTheme(e.newValue);
    }
  });
}
