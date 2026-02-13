import { api } from './api.js';

let onSuccessCallback = null;

export function initLogin(onSuccess) {
  onSuccessCallback = onSuccess;

  const input = document.getElementById('password-input');
  const btn = document.getElementById('login-btn');
  const wrapper = document.getElementById('input-wrapper');

  input.focus();

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      attemptLogin();
    }
  });

  btn.addEventListener('click', () => attemptLogin());
}

async function attemptLogin() {
  const input = document.getElementById('password-input');
  const wrapper = document.getElementById('input-wrapper');
  const error = document.getElementById('login-error');
  const password = input.value;

  if (!password) {
    showError('ENTER ACCESS CODE');
    return;
  }

  try {
    const result = await api.post('/api/auth/login', { password });

    if (result.success) {
      // Success animation
      wrapper.classList.remove('error');
      wrapper.classList.add('success');
      error.classList.remove('visible');

      // Show ACCESS GRANTED
      error.textContent = 'ACCESS GRANTED';
      error.style.color = 'var(--neon-green)';
      error.style.textShadow = 'var(--neon-green-glow)';
      error.classList.add('visible');

      // Vault unlock animation
      const vaultDoor = document.querySelector('.vault-door');
      await new Promise(r => setTimeout(r, 400));
      vaultDoor.classList.add('vault-unlocking');

      // White flash
      const flash = document.getElementById('white-flash');
      await new Promise(r => setTimeout(r, 300));
      flash.classList.add('flash');

      await new Promise(r => setTimeout(r, 500));

      if (onSuccessCallback) onSuccessCallback();
    }
  } catch (e) {
    showError('ACCESS DENIED');
    wrapper.classList.add('error');

    // Red flash
    document.getElementById('phase-login').classList.add('red-flash');

    setTimeout(() => {
      wrapper.classList.remove('error');
      document.getElementById('phase-login').classList.remove('red-flash');
    }, 600);

    setTimeout(() => {
      input.value = '';
      input.focus();
    }, 800);
  }
}

function showError(message) {
  const error = document.getElementById('login-error');
  error.textContent = message;
  error.style.color = '';
  error.style.textShadow = '';
  error.classList.add('visible');
  setTimeout(() => error.classList.remove('visible'), 2500);
}

export function destroyLogin() {
  // Cleanup if needed
}
