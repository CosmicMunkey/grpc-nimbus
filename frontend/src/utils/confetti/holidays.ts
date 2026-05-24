import confetti from 'canvas-confetti';
import { burst } from './core';

export function fireChristmasConfetti(): void {
  const end = Date.now() + 5500;
  const colors = ['#ffffff', '#c8e6f5', '#e8f4fb', '#b0d4e8'];
  (function snowFrame() {
    confetti({
      particleCount: 4,
      startVelocity: 2,
      ticks: 700,
      origin: { x: Math.random(), y: 0 },
      colors,
      shapes: ['circle'],
      scalar: 0.4 + Math.random() * 0.5,
      drift: (Math.random() - 0.5) * 3,
      gravity: 0.42,
      spread: 15,
    });
    if (Date.now() < end) requestAnimationFrame(snowFrame);
  })();
}

export function fireHanukkahConfetti(): void {
  const colors = ['#003e80', '#0066cc', '#4da6ff', '#c0c0c0', '#ffd700', '#ffffff'];
  [0, 1, 2].forEach((i) => {
    setTimeout(() => {
      confetti({
        particleCount: 55,
        startVelocity: 42,
        spread: 40,
        angle: 80 + i * 20,
        origin: { x: 0.3 + i * 0.2, y: 0.65 },
        colors,
        shapes: ['star'],
        scalar: 1.1,
        ticks: 300,
        gravity: 0.5,
      });
    }, i * 160);
  });
}

export function fireNewYearConfetti(): void {
  const colors = ['#ffd700', '#ffffff', '#c0c0c0', '#ff4500', '#00bfff', '#ff69b4', '#7cfc00'];
  [[0.2, 0.25], [0.8, 0.25], [0.5, 0.1], [0.35, 0.45], [0.65, 0.45]].forEach(([x, y], i) => {
    setTimeout(() => {
      confetti({
        particleCount: 75,
        startVelocity: 60,
        spread: 360,
        origin: { x, y },
        colors,
        shapes: ['star'],
        scalar: 1.1,
        ticks: 350,
        gravity: 0.4,
      });
    }, i * 180);
  });
}

export function fireValentineConfetti(): void {
  const colors = ['#ff0055', '#ff69b4', '#ff1493', '#ff6b9d', '#ffb3d1', '#ffffff'];
  confetti({
    particleCount: 110,
    startVelocity: 12,
    spread: 120,
    angle: 270,
    origin: { x: 0.5, y: 0 },
    colors,
    shapes: ['star'],
    scalar: 1.3,
    ticks: 450,
    gravity: 0.28,
  });
  setTimeout(() => {
    burst(0.05, 0.5, 50, colors);
    burst(0.95, 0.5, 130, colors);
  }, 350);
}

export function fireStPatricksConfetti(): void {
  const colors = ['#009a44', '#00b050', '#2eb82e', '#90ee90', '#ffd700', '#ffffff'];
  burst(0.08, 0.7, 55, colors);
  setTimeout(() => {
    confetti({
      particleCount: 85,
      startVelocity: 38,
      spread: 360,
      origin: { x: 0.5, y: 0.4 },
      colors,
      shapes: ['star'],
      scalar: 1.2,
      ticks: 320,
      gravity: 0.55,
    });
  }, 120);
  setTimeout(() => burst(0.92, 0.7, 125, colors), 240);
}

export function fireEasterConfetti(): void {
  const colors = ['#ffb3d9', '#b3d9ff', '#b3ffb3', '#ffffb3', '#d9b3ff', '#ffccb3', '#aaffee'];
  [0.2, 0.5, 0.8].forEach((x, i) => {
    setTimeout(() => {
      confetti({
        particleCount: 45,
        startVelocity: 18,
        spread: 65,
        angle: 270,
        origin: { x, y: 0 },
        colors,
        shapes: ['circle', 'star'],
        scalar: 1.1,
        ticks: 380,
        gravity: 0.4,
      });
    }, i * 160);
  });
}

export function fireJuly4Confetti(): void {
  const colors = ['#bf0a30', '#ffffff', '#002868', '#ff4444', '#6699ff'];
  [[0.25, 0.2], [0.75, 0.2], [0.5, 0.3], [0.15, 0.42], [0.85, 0.42]].forEach(([x, y], i) => {
    setTimeout(() => {
      confetti({
        particleCount: 80,
        startVelocity: 58,
        spread: 360,
        origin: { x, y },
        colors,
        shapes: ['star'],
        scalar: 1.1,
        ticks: 310,
        gravity: 0.45,
      });
    }, i * 160);
  });
}

export function fireHalloweenConfetti(): void {
  const colors = ['#ff6600', '#ff9900', '#7700bb', '#9900ff', '#cc3300', '#ff4400'];
  confetti({
    particleCount: 85,
    startVelocity: 18,
    spread: 360,
    origin: { x: 0.5, y: 0.35 },
    colors,
    shapes: ['star', 'circle'],
    scalar: 1.4,
    ticks: 550,
    gravity: 0.18,
    drift: 1.2,
  });
  setTimeout(() => {
    burst(0.1, 0.5, 45, colors);
    burst(0.9, 0.5, 135, colors);
  }, 450);
}

export function fireThanksgivingConfetti(): void {
  const colors = ['#c45e0a', '#e87722', '#f5a623', '#8b4513', '#d4a017', '#daa520'];
  [0.15, 0.38, 0.62, 0.85].forEach((x, i) => {
    setTimeout(() => {
      confetti({
        particleCount: 32,
        startVelocity: 7,
        spread: 45,
        angle: 270,
        origin: { x, y: 0 },
        colors,
        shapes: ['circle'],
        scalar: 1.5,
        ticks: 450,
        gravity: 0.32,
        drift: (Math.random() - 0.5) * 2,
      });
    }, i * 130);
  });
}

export function fireDiwaliConfetti(): void {
  const colors = ['#ffd700', '#ff8c00', '#ff4500', '#ff6347', '#ffa500', '#ffec8b', '#ff0000'];
  [[0.5, 0.25], [0.25, 0.5], [0.75, 0.5], [0.5, 0.6]].forEach(([x, y], i) => {
    setTimeout(() => {
      confetti({
        particleCount: 65,
        startVelocity: 52,
        spread: 360,
        origin: { x, y },
        colors,
        shapes: ['star'],
        scalar: 1.2,
        ticks: 360,
        gravity: 0.38,
      });
    }, i * 200);
  });
}
