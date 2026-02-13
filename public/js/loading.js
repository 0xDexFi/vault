let matrixAnimId = null;
let particleAnimId = null;
let statusInterval = null;

const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const STATUS_MESSAGES = [
  'INITIALIZING SYSTEMS...',
  'DECRYPTING VAULT...',
  'LOADING NEURAL INTERFACE...',
  'SCANNING MEMORY BANKS...',
  'ESTABLISHING SECURE TUNNEL...',
  'CALIBRATING ENCRYPTION...',
  'SYNCHRONIZING DATA STREAMS...',
  'ACCESS GRANTED'
];

export function initLoading() {
  initMatrixRain();
  initParticles();
  initProgressBar();
}

function initMatrixRain() {
  const canvas = document.getElementById('matrix-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const fontSize = 14;
  const columns = Math.floor(canvas.width / fontSize);
  const drops = new Array(columns).fill(1).map(() => Math.random() * -50);

  function draw() {
    ctx.fillStyle = 'rgba(10, 14, 23, 0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00d4ff';
    ctx.font = `${fontSize}px monospace`;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 2;

    for (let i = 0; i < drops.length; i++) {
      if (drops[i] < 0) {
        drops[i] += 0.5;
        continue;
      }
      const char = CHARS[Math.floor(Math.random() * CHARS.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      // Brighter for the head of the stream
      const alpha = 0.6 + Math.random() * 0.4;
      ctx.fillStyle = `rgba(0, 212, 255, ${alpha})`;
      ctx.fillText(char, x, y);

      if (y > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }

    ctx.shadowBlur = 0;
    matrixAnimId = requestAnimationFrame(draw);
  }

  draw();
}

function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = [];
  const count = 50;
  const maxDist = 120;

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 1
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.15;
          ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw and update particles
    for (const p of particles) {
      ctx.fillStyle = 'rgba(0, 212, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    }

    particleAnimId = requestAnimationFrame(draw);
  }

  draw();
}

function initProgressBar() {
  const progress = document.getElementById('loading-progress');
  const percent = document.getElementById('loading-percent');
  const status = document.getElementById('loading-status');
  if (!progress || !percent || !status) return;

  let currentProgress = 0;
  let messageIndex = 0;

  const interval = setInterval(() => {
    const increment = Math.random() * 12 + 3;
    currentProgress = Math.min(currentProgress + increment, 100);

    progress.style.width = `${currentProgress}%`;
    percent.textContent = `${Math.floor(currentProgress)}%`;

    // Update status message
    const targetIndex = Math.floor((currentProgress / 100) * (STATUS_MESSAGES.length - 1));
    if (targetIndex > messageIndex) {
      messageIndex = targetIndex;
      status.textContent = STATUS_MESSAGES[messageIndex];
    }

    if (currentProgress >= 100) {
      clearInterval(interval);
      status.textContent = STATUS_MESSAGES[STATUS_MESSAGES.length - 1];
      percent.textContent = '100%';
    }
  }, 350);

  statusInterval = interval;
}

export function destroyLoading() {
  if (matrixAnimId) cancelAnimationFrame(matrixAnimId);
  if (particleAnimId) cancelAnimationFrame(particleAnimId);
  if (statusInterval) clearInterval(statusInterval);
  matrixAnimId = null;
  particleAnimId = null;
  statusInterval = null;
}
