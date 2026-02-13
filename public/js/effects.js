const CHARS = 'アイウエオカキクケコ0123456789';

let animId = null;
let frameCount = 0;

export function initAppBackground() {
  const canvas = document.getElementById('app-matrix-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const fontSize = 12;
  const columns = Math.floor(canvas.width / fontSize);
  const drops = new Array(columns).fill(1).map(() => Math.random() * -100);

  function draw() {
    frameCount++;
    // Only draw every 3rd frame for performance
    if (frameCount % 3 !== 0) {
      animId = requestAnimationFrame(draw);
      return;
    }

    ctx.fillStyle = 'rgba(10, 14, 23, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
      if (drops[i] < 0) {
        drops[i] += 0.3;
        continue;
      }
      if (Math.random() > 0.1) {
        drops[i] += 0.3;
        continue;
      }
      const char = CHARS[Math.floor(Math.random() * CHARS.length)];
      ctx.fillText(char, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.99) {
        drops[i] = 0;
      }
      drops[i] += 0.3;
    }

    animId = requestAnimationFrame(draw);
  }

  draw();
}

export function destroyAppBackground() {
  if (animId) cancelAnimationFrame(animId);
  animId = null;
}

// Matrix rain for the login screen (subtle)
let loginAnimId = null;

export function initLoginMatrix() {
  const canvas = document.getElementById('login-matrix-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();

  const fontSize = 14;
  const columns = Math.floor(canvas.width / fontSize);
  const drops = new Array(columns).fill(1).map(() => Math.random() * -30);

  function draw() {
    ctx.fillStyle = 'rgba(10, 14, 23, 0.06)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(0, 212, 255, 0.4)';
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
      if (drops[i] < 0) {
        drops[i] += 0.3;
        continue;
      }
      const char = CHARS[Math.floor(Math.random() * CHARS.length)];
      ctx.fillText(char, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.98) {
        drops[i] = 0;
      }
      drops[i] += 0.6;
    }

    loginAnimId = requestAnimationFrame(draw);
  }

  draw();
}

export function destroyLoginMatrix() {
  if (loginAnimId) cancelAnimationFrame(loginAnimId);
  loginAnimId = null;
}
