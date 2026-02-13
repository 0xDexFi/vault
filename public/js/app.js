import { initLoading, destroyLoading } from './loading.js';
import { initLogin, destroyLogin } from './login.js';
import { initLoginMatrix, destroyLoginMatrix, initAppBackground } from './effects.js';
import { initNotes } from './notes.js';
import { initFolders } from './folders.js';
import { initTags } from './tags.js';
import { initSearch } from './search.js';
import { initDragDrop } from './dragdrop.js';
import { api } from './api.js';

const phases = {
  loading: document.getElementById('phase-loading'),
  login: document.getElementById('phase-login'),
  app: document.getElementById('phase-app')
};

function switchPhase(name) {
  Object.entries(phases).forEach(([key, el]) => {
    if (key === name) {
      el.classList.add('active');
      el.classList.add('phase-enter');
      setTimeout(() => el.classList.remove('phase-enter'), 500);
    } else {
      el.classList.remove('active');
    }
  });
}

async function bootApp() {
  initAppBackground();
  await initFolders();
  await initNotes();
  initTags();
  initSearch();
  initDragDrop();
}

async function boot() {
  // Phase 1: Loading
  initLoading();

  // Wait for loading animation + check auth
  const [, authResult] = await Promise.all([
    new Promise(r => setTimeout(r, 3500)),
    api.get('/api/auth/check').catch(() => ({ authenticated: false }))
  ]);

  destroyLoading();

  if (authResult.authenticated) {
    // Skip login
    switchPhase('app');
    await bootApp();
  } else {
    // Phase 2: Login
    switchPhase('login');
    initLoginMatrix();

    initLogin(async () => {
      destroyLogin();
      destroyLoginMatrix();
      switchPhase('app');
      await bootApp();
    });
  }
}

boot();
