import confetti from 'canvas-confetti';
import { pulseEmojiCenter, spawnFloatingEmojis, flashStormOverlay } from './core';

export function fireSunConfetti(): void {
  pulseEmojiCenter('☀️', 2, 900);
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      confetti({
        particleCount: 38,
        startVelocity: 62,
        spread: 22,
        angle: i * 45,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#ffd700', '#ffec44', '#ff9800', '#fff176', '#ffe082'],
        shapes: ['star'],
        scalar: 1.1,
        gravity: 0.3,
        ticks: 300,
      });
    }, i * 55);
  }
}

export function fireMoonConfetti(): void {
  if (typeof document !== 'undefined') {
    const moon = document.createElement('div');
    moon.textContent = '🌙';
    moon.style.position = 'fixed';
    moon.style.left = '50%';
    moon.style.top = '15%';
    moon.style.transform = 'translateX(-50%) scale(0.5)';
    moon.style.fontSize = '52px';
    moon.style.opacity = '0';
    moon.style.pointerEvents = 'none';
    moon.style.zIndex = '10000';
    moon.style.transition = 'transform 700ms ease-out, opacity 700ms ease';
    document.body.appendChild(moon);
    requestAnimationFrame(() => {
      moon.style.opacity = '1';
      moon.style.transform = 'translateX(-50%) scale(1)';
    });
    setTimeout(() => { moon.style.opacity = '0'; }, 1600);
    setTimeout(() => moon.remove(), 2400);
  }
  [0.2, 0.4, 0.6, 0.8].forEach((x, i) => {
    setTimeout(() => {
      confetti({
        particleCount: 28,
        startVelocity: 6,
        spread: 60,
        angle: 270,
        origin: { x, y: 0 },
        colors: ['#c0c8d8', '#dde6f0', '#b8c8e8', '#9baec8', '#ffffff'],
        shapes: ['circle'],
        scalar: 1.4,
        gravity: 0.12,
        drift: (Math.random() - 0.5) * 2.5,
        ticks: 700,
      });
    }, i * 140);
  });
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      confetti({
        particleCount: 12,
        startVelocity: 22,
        spread: 360,
        origin: { x: 0.1 + Math.random() * 0.8, y: 0.1 + Math.random() * 0.5 },
        colors: ['#ffffff', '#fffde7', '#e8eaf6'],
        shapes: ['star'],
        scalar: 0.8,
        gravity: 0.2,
        ticks: 280,
      });
    }, 200 + i * 180);
  }
}

export function fireCloudConfetti(): void {
  if (typeof document !== 'undefined') {
    const cloud = document.createElement('div');
    cloud.textContent = '☁️';
    cloud.style.position = 'fixed';
    cloud.style.left = '50%';
    cloud.style.top = '8%';
    cloud.style.transform = 'translateX(-50%)';
    cloud.style.fontSize = '64px';
    cloud.style.opacity = '0';
    cloud.style.pointerEvents = 'none';
    cloud.style.zIndex = '10000';
    cloud.style.transition = 'opacity 500ms ease';
    document.body.appendChild(cloud);
    requestAnimationFrame(() => { cloud.style.opacity = '0.9'; });
    setTimeout(() => { cloud.style.opacity = '0'; }, 1400);
    setTimeout(() => cloud.remove(), 2000);
  }
  [0, 180, 360, 540].forEach((delay, wave) => {
    setTimeout(() => {
      [0.15, 0.4, 0.65, 0.88].forEach((x) => {
        confetti({
          particleCount: 8,
          startVelocity: 3 + Math.random() * 5,
          spread: 50,
          angle: 270,
          origin: { x, y: 0 },
          colors: ['#ffffff', '#eceff1', '#f5f5f5', '#e0e0e0', '#cfd8dc'],
          shapes: ['circle'],
          scalar: 2.2 - wave * 0.2,
          gravity: 0.08,
          drift: (Math.random() - 0.5) * 4.5,
          ticks: 800 - wave * 80,
        });
      });
    }, delay);
  });
}

export function fireLightningStormConfetti(): void {
  flashStormOverlay(0.85);
  spawnFloatingEmojis(['⚡', '⚡', '⚡', '💥'], 12, 1200);
  const boltXs = [0.12, 0.28, 0.51, 0.67, 0.84, 0.39, 0.73, 0.22];
  boltXs.forEach((x, i) => {
    setTimeout(() => {
      confetti({
        particleCount: 50,
        startVelocity: 90,
        spread: 6,
        angle: 270,
        origin: { x, y: 0 },
        colors: ['#ffffff', '#e8f4ff', '#b3d9ff'],
        shapes: ['square'],
        scalar: 0.6,
        gravity: 1.8,
        ticks: 140,
      });
    }, i * 65);
  });
  setTimeout(() => {
    [0.2, 0.5, 0.8].forEach((x, i) => {
      setTimeout(() => {
        confetti({
          particleCount: 45,
          startVelocity: 38,
          spread: 160,
          angle: 90,
          origin: { x, y: 1 },
          colors: ['#ffffff', '#b3d9ff', '#9ecfff'],
          shapes: ['square', 'circle'],
          scalar: 0.7,
          gravity: 0.6,
          ticks: 200,
        });
      }, i * 80);
    });
  }, 400);
}
