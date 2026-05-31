import confetti from 'canvas-confetti';
import { spawnFloatingEmojis, pulseEmojiCenter } from './core';

export function fireCoffeeSteamConfetti(): void {
  if (typeof document !== 'undefined') {
    const cup = document.createElement('div');
    cup.textContent = '☕';
    cup.style.position = 'fixed';
    cup.style.left = '50%';
    cup.style.bottom = '24px';
    cup.style.transform = 'translateX(-50%)';
    cup.style.fontSize = '46px';
    cup.style.pointerEvents = 'none';
    cup.style.zIndex = '10000';
    document.body.appendChild(cup);
    setTimeout(() => cup.remove(), 2000);
  }
  spawnFloatingEmojis(['💨', '☁️', '💨'], 8, 1800);
  [-0.04, 0, 0.04].forEach((offset, col) => {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        confetti({
          particleCount: 7,
          startVelocity: 10 + Math.random() * 4,
          spread: 10,
          angle: 270,
          origin: { x: 0.5 + offset, y: 0.92 - i * 0.04 },
          colors: ['#d7ccc8', '#bcaaa4', '#eeeeee', '#f5f5f5', '#ffffff'],
          shapes: ['circle'],
          scalar: 1.1 + i * 0.1,
          gravity: -0.05,
          drift: offset * 8 + (Math.random() - 0.5) * 0.5,
          ticks: 400 + i * 40,
        });
      }, col * 120 + i * 160);
    }
  });
}

export function firePizzaConfetti(): void {
  if (typeof document !== 'undefined') {
    const pizza = document.createElement('div');
    pizza.textContent = '🍕';
    pizza.style.position = 'fixed';
    pizza.style.left = '50%';
    pizza.style.top = '50%';
    pizza.style.transform = 'translate(-50%, -50%) scale(0.4) rotate(0deg)';
    pizza.style.fontSize = '72px';
    pizza.style.opacity = '0';
    pizza.style.pointerEvents = 'none';
    pizza.style.zIndex = '10000';
    pizza.style.transition = 'transform 800ms ease-out, opacity 400ms ease';
    document.body.appendChild(pizza);
    requestAnimationFrame(() => {
      pizza.style.opacity = '1';
      pizza.style.transform = 'translate(-50%, -50%) scale(1.1) rotate(360deg)';
    });
    setTimeout(() => { pizza.style.opacity = '0'; }, 700);
    setTimeout(() => pizza.remove(), 1200);
  }
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      confetti({
        particleCount: 30,
        startVelocity: 52,
        spread: 20,
        angle: i * 45,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#ff6d00', '#ff8f00', '#ffd740', '#e53935', '#a5d6a7'],
        shapes: ['circle'],
        scalar: 0.9,
        gravity: 0.45,
        ticks: 300,
      });
    }, i * 40);
  }
}

export function fireDonutConfetti(): void {
  pulseEmojiCenter('🍩', 2, 800);
  confetti({
    particleCount: 90,
    startVelocity: 62,
    spread: 360,
    origin: { x: 0.5, y: 0.5 },
    colors: ['#f8bbd0', '#f48fb1', '#ce93d8', '#ffcc02', '#a5d6a7', '#80cbc4'],
    shapes: ['circle'],
    scalar: 0.85,
    gravity: 0.4,
    ticks: 340,
  });
  setTimeout(() => {
    confetti({
      particleCount: 60,
      startVelocity: 28,
      spread: 360,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#ffffff', '#fce4ec', '#f3e5f5', '#fffde7', '#e8f5e9'],
      shapes: ['circle'],
      scalar: 1.3,
      gravity: 0.25,
      ticks: 480,
    });
  }, 180);
}

export function fireRamenConfetti(): void {
  spawnFloatingEmojis(['🍜', '🥢', '🍜'], 9, 1700);
  [0.1, 0.3, 0.5, 0.7, 0.9].forEach((x, i) => {
    setTimeout(() => {
      confetti({
        particleCount: 22,
        startVelocity: 12,
        spread: 25,
        angle: 270,
        origin: { x, y: 0 },
        colors: ['#f5deb3', '#ffe4b5', '#ffd700', '#d2691e', '#f4a460'],
        shapes: ['circle'],
        scalar: 2.8,
        gravity: 0.35,
        drift: (Math.random() - 0.5) * 5,
        ticks: 500,
      });
    }, i * 100);
  });
}

export function fireTacoConfetti(): void {
  if (typeof document !== 'undefined') {
    const taco = document.createElement('div');
    taco.textContent = '🌮';
    taco.style.position = 'fixed';
    taco.style.left = '50%';
    taco.style.top = '45%';
    taco.style.transform = 'translate(-50%, -50%) scale(0.3) rotate(-180deg)';
    taco.style.fontSize = '68px';
    taco.style.opacity = '0';
    taco.style.pointerEvents = 'none';
    taco.style.zIndex = '10000';
    taco.style.transition = 'transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease';
    document.body.appendChild(taco);
    requestAnimationFrame(() => {
      taco.style.opacity = '1';
      taco.style.transform = 'translate(-50%, -50%) scale(1.2) rotate(15deg)';
    });
    setTimeout(() => {
      taco.style.transition = 'transform 400ms ease-in, opacity 400ms ease';
      taco.style.opacity = '0';
      taco.style.transform = 'translate(-50%, -50%) scale(0.5) rotate(200deg)';
    }, 650);
    setTimeout(() => taco.remove(), 1100);
  }
  spawnFloatingEmojis(['🌮', '🌶️', '🧀'], 9, 1700);
  [[0.15, 0.55, 35], [0.85, 0.55, 145], [0.25, 0.35, 320], [0.75, 0.35, 220]].forEach(([x, y, angle], i) => {
    setTimeout(() => {
      confetti({
        particleCount: 40,
        startVelocity: 44,
        spread: 55,
        angle: Number(angle),
        origin: { x: Number(x), y: Number(y) },
        colors: ['#66bb6a', '#ef5350', '#ffca28', '#8d6e63', '#fff176'],
        shapes: ['circle', 'square'],
        scalar: 0.95,
        gravity: 0.55,
        ticks: 280,
      });
    }, i * 80);
  });
}
