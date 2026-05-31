import confetti from 'canvas-confetti';
import { spawnFloatingEmojis, runEmojiAcrossBottomWithTrail } from './core';

export function fireCatRunnerConfetti(): void {
  spawnFloatingEmojis(['🐾', '🐟', '🧶'], 10, 2000);
  runEmojiAcrossBottomWithTrail('🐈', 'left', 1900, (progress) => {
    const x = 0.85 - progress * 0.75;
    confetti({
      particleCount: 12,
      startVelocity: 14,
      spread: 40,
      angle: 80 + Math.random() * 20,
      origin: { x: Math.max(0.05, x), y: 0.92 },
      colors: ['#ffb347', '#ffd1dc', '#fff176', '#ffccaa'],
      shapes: ['circle'],
      scalar: 0.7,
      gravity: 0.7,
      ticks: 160,
    });
  });
  setTimeout(() => {
    confetti({
      particleCount: 55,
      startVelocity: 32,
      spread: 120,
      angle: 30,
      origin: { x: 0.03, y: 0.85 },
      colors: ['#ffb347', '#ffd1dc', '#ff8c69', '#fff176'],
      shapes: ['circle', 'star'],
      scalar: 1.0,
      gravity: 0.55,
      ticks: 280,
    });
  }, 1850);
}

export function fireDogConfetti(): void {
  spawnFloatingEmojis(['🐾', '🦴', '🎾'], 10, 2000);
  runEmojiAcrossBottomWithTrail('🐕', 'right', 1900, (progress) => {
    const x = 0.1 + progress * 0.75;
    confetti({
      particleCount: 14,
      startVelocity: 16,
      spread: 50,
      angle: 95 + Math.random() * 30,
      origin: { x: Math.min(0.95, x), y: 0.9 },
      colors: ['#d7a86e', '#f5deb3', '#8d6e63', '#fff59d'],
      shapes: ['circle'],
      scalar: 0.75,
      gravity: 0.65,
      ticks: 170,
    });
  });
  setTimeout(() => {
    confetti({
      particleCount: 80,
      startVelocity: 45,
      spread: 160,
      angle: 150,
      origin: { x: 0.97, y: 0.8 },
      colors: ['#d7a86e', '#f5deb3', '#ffd700', '#ff9a3c'],
      shapes: ['circle', 'star'],
      scalar: 1.1,
      gravity: 0.5,
      ticks: 320,
    });
  }, 1870);
}

export function fireFoxConfetti(): void {
  spawnFloatingEmojis(['🍂', '🦊', '🌲'], 10, 2000);
  runEmojiAcrossBottomWithTrail('🦊', 'left', 1900, (progress) => {
    const x = 0.85 - progress * 0.75;
    confetti({
      particleCount: 10,
      startVelocity: 10,
      spread: 80,
      angle: 270,
      origin: { x: Math.max(0.05, x + 0.07), y: 0.88 },
      colors: ['#ff8c42', '#d2691e', '#ffe0b2', '#8bc34a', '#c0392b'],
      shapes: ['circle'],
      scalar: 1.1,
      gravity: 0.28,
      drift: (Math.random() - 0.5) * 3.5,
      ticks: 380,
    });
  });
  setTimeout(() => {
    [0, 1, 2].forEach((i) => {
      setTimeout(() => {
        confetti({
          particleCount: 30,
          startVelocity: 20,
          spread: 100,
          angle: 270,
          origin: { x: 0.05 + i * 0.1, y: 0.1 },
          colors: ['#ff8c42', '#d2691e', '#ffe0b2', '#c0392b', '#e67e22'],
          shapes: ['circle'],
          scalar: 1.3,
          gravity: 0.3,
          drift: (Math.random() - 0.5) * 4,
          ticks: 500,
        });
      }, i * 100);
    });
  }, 1800);
}

export function fireOctopusConfetti(): void {
  if (typeof document !== 'undefined') {
    const blob = document.createElement('div');
    blob.style.position = 'fixed';
    blob.style.left = '50%';
    blob.style.top = '50%';
    blob.style.transform = 'translate(-50%, -50%) scale(0)';
    blob.style.width = '120px';
    blob.style.height = '80px';
    blob.style.borderRadius = '50%';
    blob.style.background = 'radial-gradient(ellipse, #4a0080 0%, #1a0040 60%, transparent 100%)';
    blob.style.opacity = '0.85';
    blob.style.pointerEvents = 'none';
    blob.style.zIndex = '10000';
    blob.style.transition = 'transform 300ms ease-out, opacity 600ms ease';
    document.body.appendChild(blob);
    requestAnimationFrame(() => {
      blob.style.transform = 'translate(-50%, -50%) scale(1.6)';
    });
    setTimeout(() => { blob.style.opacity = '0'; }, 400);
    setTimeout(() => blob.remove(), 1100);
  }
  spawnFloatingEmojis(['🐙', '🫧', '🌊'], 10, 1800);
  [0, 120, 260].forEach((delay, wave) => {
    setTimeout(() => {
      confetti({
        particleCount: 70,
        startVelocity: 55 - wave * 10,
        spread: 360,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#4a0080', '#7b1fa2', '#1a0040', '#00838f', '#006064'],
        shapes: ['circle'],
        scalar: 1.0 + wave * 0.15,
        gravity: 0.45,
        ticks: 320,
      });
    }, delay);
  });
  [[30, 0.2, 0.7], [150, 0.8, 0.7], [200, 0.5, 0.9]].forEach(([angle, x, y], i) => {
    setTimeout(() => {
      confetti({
        particleCount: 35,
        startVelocity: 48,
        spread: 18,
        angle: Number(angle),
        origin: { x: Number(x), y: Number(y) },
        colors: ['#6a1b9a', '#4a148c', '#00acc1'],
        shapes: ['circle'],
        scalar: 0.85,
        gravity: 0.5,
        ticks: 260,
      });
    }, i * 80 + 80);
  });
}

export function fireBeeConfetti(): void {
  spawnFloatingEmojis(['🐝', '🌼', '🍯'], 9, 1600);
  const zigzag = [
    { x: 0.15, y: 0.75, a: 45 },
    { x: 0.38, y: 0.25, a: 315 },
    { x: 0.55, y: 0.65, a: 30 },
    { x: 0.72, y: 0.2,  a: 330 },
    { x: 0.88, y: 0.55, a: 15 },
  ];
  zigzag.forEach(({ x, y, a }, i) => {
    setTimeout(() => {
      confetti({
        particleCount: 22,
        startVelocity: 28,
        spread: 35,
        angle: a,
        origin: { x, y },
        colors: ['#ffeb3b', '#fbc02d', '#f9a825', '#212121'],
        shapes: ['square'],
        scalar: 0.75,
        gravity: 0.55,
        ticks: 200,
      });
    }, i * 150);
  });
  setTimeout(() => {
    confetti({
      particleCount: 60,
      startVelocity: 38,
      spread: 360,
      origin: { x: 0.88, y: 0.55 },
      colors: ['#ffeb3b', '#fff9c4', '#fffde7', '#fbc02d'],
      shapes: ['circle'],
      scalar: 0.8,
      gravity: 0.3,
      ticks: 350,
    });
  }, 900);
}

export function firePenguinConfetti(): void {
  spawnFloatingEmojis(['❄️', '🐟', '🧊'], 10, 2000);
  runEmojiAcrossBottomWithTrail('🐧', 'left', 1900, (progress) => {
    const x = 0.85 - progress * 0.75;
    confetti({
      particleCount: 18,
      startVelocity: 28,
      spread: 160,
      angle: 180,
      origin: { x: Math.max(0.05, x + 0.04), y: 0.95 },
      colors: ['#e3f2fd', '#90caf9', '#ffffff', '#b3e5fc'],
      shapes: ['circle'],
      scalar: 0.65,
      gravity: 1.1,
      ticks: 120,
    });
  });
  setTimeout(() => {
    confetti({
      particleCount: 90,
      startVelocity: 50,
      spread: 200,
      angle: 20,
      origin: { x: 0.02, y: 0.9 },
      colors: ['#e3f2fd', '#90caf9', '#ffffff', '#37474f', '#b3e5fc'],
      shapes: ['circle', 'star'],
      scalar: 1.0,
      gravity: 0.4,
      ticks: 340,
    });
  }, 1870);
}
