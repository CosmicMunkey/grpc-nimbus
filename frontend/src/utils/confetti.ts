import confetti from 'canvas-confetti';

// Confetti color palettes for each pride flag.
// Black is omitted where present — it disappears against dark backgrounds.
const FLAG_COLORS: Record<string, string[]> = {
  rainbow:     ['#e40303', '#ff8c00', '#ffed00', '#008026', '#004dff', '#750787'],
  progress:    ['#e40303', '#ff8c00', '#ffed00', '#008026', '#004dff', '#750787', '#784f17', '#74d7ee', '#ffafc8'],
  lesbian:     ['#d52d00', '#ff9a56', '#ffffff', '#d362a4', '#a50062'],
  trans:       ['#74d7ee', '#ffafc8', '#ffffff'],
  bisexual:    ['#d60270', '#9b4f96', '#0038a8'],
  pansexual:   ['#ff218c', '#ffd800', '#21b1ff'],
  nonbinary:   ['#fcf434', '#9c59d1', '#2d2d2d'],
  asexual:     ['#a4a4a4', '#ffffff', '#810081'],
  genderfluid: ['#ff76a4', '#ffffff', '#c011d7', '#2c2ecc'],
  genderqueer: ['#b77fdd', '#ffffff', '#49821e'],
  aromantic:   ['#3da542', '#a8d47a', '#ffffff', '#a9a9a9'],
  intersex:    ['#ffd800', '#7902aa'],
};

function burst(originX: number, originY: number, angle: number, colors: string[]) {
  confetti({
    particleCount: 40,
    startVelocity: 45,
    spread: 70,
    angle,
    origin: { x: originX, y: originY },
    colors,
    shapes: ['star'],
    scalar: 1.1,
    ticks: 200,
    gravity: 0.8,
    drift: 0,
  });
}

function firePrideConfetti(colors: string[]): void {
  burst(0.05, 0.6, 60, colors);
  setTimeout(() => burst(0.95, 0.6, 120, colors), 120);
  setTimeout(() => {
    confetti({
      particleCount: 60,
      startVelocity: 30,
      spread: 100,
      angle: 270,
      origin: { x: 0.5, y: 0 },
      colors,
      shapes: ['star'],
      scalar: 0.9,
      ticks: 250,
      gravity: 0.6,
    });
  }, 250);
}

export const fireRainbowConfetti     = () => firePrideConfetti(FLAG_COLORS.rainbow);
export const fireProgressConfetti    = () => firePrideConfetti(FLAG_COLORS.progress);
export const fireLesibianConfetti    = () => firePrideConfetti(FLAG_COLORS.lesbian);
export const fireTransConfetti       = () => firePrideConfetti(FLAG_COLORS.trans);
export const fireBisexualConfetti    = () => firePrideConfetti(FLAG_COLORS.bisexual);
export const firePansexualConfetti   = () => firePrideConfetti(FLAG_COLORS.pansexual);
export const fireNonbinaryConfetti   = () => firePrideConfetti(FLAG_COLORS.nonbinary);
export const fireAsexualConfetti     = () => firePrideConfetti(FLAG_COLORS.asexual);
export const fireGenderfluidConfetti = () => firePrideConfetti(FLAG_COLORS.genderfluid);
export const fireGenderqueerConfetti = () => firePrideConfetti(FLAG_COLORS.genderqueer);
export const fireAromanticConfetti   = () => firePrideConfetti(FLAG_COLORS.aromantic);
export const fireIntersexConfetti    = () => firePrideConfetti(FLAG_COLORS.intersex);

// ── Holiday animations ────────────────────────────────────────────────────────
// Each holiday gets a distinct feel: snow fall, fireworks, hearts, etc.

/** Christmas: gentle continuous snowfall for ~4 seconds */
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

/** Hanukkah: blue, silver & gold menorah-arc bursts */
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

/** New Year's: multi-point fireworks explosion — gold, silver & vivid colors */
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

/** Valentine's Day: pink & red shower from top, lazy drift */
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

/** St. Patrick's Day: green burst from center + side cannons */
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

/** Easter: gentle pastel shower from multiple points */
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

/** 4th of July: patriotic fireworks — red, white & blue */
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

/** Halloween: slow, eerie orange & purple drift */
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

/** Thanksgiving: warm autumn colours drifting down like leaves */
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

/** Diwali: golden & fiery sparkle explosions from multiple points */
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

function spawnFloatingEmojis(emojis: string[], count: number, durationMs: number): void {
  if (typeof document === 'undefined') return;
  const layer = document.createElement('div');
  layer.style.position = 'fixed';
  layer.style.inset = '0';
  layer.style.pointerEvents = 'none';
  layer.style.zIndex = '9999';
  document.body.appendChild(layer);

  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.textContent = emojis[i % emojis.length];
    el.style.position = 'absolute';
    el.style.left = `${8 + Math.random() * 84}%`;
    el.style.top = `${55 + Math.random() * 35}%`;
    el.style.fontSize = `${18 + Math.random() * 16}px`;
    el.style.opacity = '0';
    el.style.transition = `transform ${durationMs}ms ease-out, opacity ${durationMs}ms ease-out`;
    layer.appendChild(el);

    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = `translate(${(Math.random() - 0.5) * 140}px, -${120 + Math.random() * 220}px) rotate(${(Math.random() - 0.5) * 120}deg)`;
    });

    setTimeout(() => {
      el.style.opacity = '0';
    }, durationMs - 180);
  }

  setTimeout(() => {
    layer.remove();
  }, durationMs + 100);
}

function runEmojiAcrossBottom(emoji: string, direction: 'left' | 'right'): void {
  if (typeof document === 'undefined') return;
  const runner = document.createElement('div');
  runner.textContent = emoji;
  runner.style.position = 'fixed';
  runner.style.bottom = '18px';
  runner.style.fontSize = '38px';
  runner.style.pointerEvents = 'none';
  runner.style.zIndex = '10000';
  runner.style.transition = 'transform 1700ms linear';

  if (direction === 'left') {
    runner.style.right = '-64px';
    document.body.appendChild(runner);
    requestAnimationFrame(() => {
      runner.style.transform = `translateX(-${window.innerWidth + 140}px)`;
    });
  } else {
    runner.style.left = '-64px';
    document.body.appendChild(runner);
    requestAnimationFrame(() => {
      runner.style.transform = `translateX(${window.innerWidth + 140}px)`;
    });
  }

  setTimeout(() => runner.remove(), 1800);
}

function flashStormOverlay(): void {
  if (typeof document === 'undefined') return;
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = '#0a0d1a';
  overlay.style.opacity = '0';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '9998';
  overlay.style.transition = 'opacity 120ms ease';
  document.body.appendChild(overlay);

  const flashes = [0, 150, 300, 540, 690];
  flashes.forEach((t, i) => {
    setTimeout(() => {
      overlay.style.opacity = i % 2 === 0 ? '0.45' : '0.12';
    }, t);
  });
  setTimeout(() => {
    overlay.style.opacity = '0';
  }, 860);
  setTimeout(() => overlay.remove(), 1100);
}

export function fireCatRunnerConfetti(): void {
  // Cat emoji faces left in most fonts, so run right → left.
  runEmojiAcrossBottom('🐈', 'left');
  spawnFloatingEmojis(['🐾', '🐟', '🧶'], 10, 1450);
  confetti({
    particleCount: 30,
    startVelocity: 18,
    spread: 60,
    angle: 270,
    origin: { x: 0.75, y: 1 },
    colors: ['#ffb347', '#ffd1dc', '#fff176'],
    shapes: ['circle'],
    scalar: 0.9,
    gravity: 0.58,
    ticks: 200,
  });
}

export function fireDogConfetti(): void {
  runEmojiAcrossBottom('🐕', 'right');
  spawnFloatingEmojis(['🐾', '🦴', '🎾'], 10, 1450);
  confetti({
    particleCount: 42,
    startVelocity: 24,
    spread: 80,
    angle: 270,
    origin: { x: 0.35, y: 1 },
    colors: ['#d7a86e', '#f5deb3', '#8d6e63', '#fff59d'],
    shapes: ['circle'],
    scalar: 0.95,
    gravity: 0.58,
    ticks: 240,
  });
}

export function fireFoxConfetti(): void {
  runEmojiAcrossBottom('🦊', 'left');
  spawnFloatingEmojis(['🍂', '🦊', '🌲'], 9, 1450);
  confetti({
    particleCount: 44,
    startVelocity: 26,
    spread: 85,
    angle: 250,
    origin: { x: 0.7, y: 0.95 },
    colors: ['#ff8c42', '#d2691e', '#ffe0b2', '#8bc34a'],
    shapes: ['circle'],
    scalar: 0.95,
    gravity: 0.56,
    ticks: 240,
  });
}

export function fireOctopusConfetti(): void {
  spawnFloatingEmojis(['🐙', '🫧', '🌊'], 10, 1600);
  confetti({
    particleCount: 56,
    startVelocity: 18,
    spread: 110,
    angle: 270,
    origin: { x: 0.5, y: 1 },
    colors: ['#7e57c2', '#ab47bc', '#4fc3f7', '#80deea'],
    shapes: ['circle'],
    scalar: 1.05,
    gravity: 0.34,
    ticks: 300,
  });
}

export function fireBeeConfetti(): void {
  spawnFloatingEmojis(['🐝', '🌼', '🍯'], 9, 1300);
  confetti({
    particleCount: 36,
    startVelocity: 34,
    spread: 70,
    angle: 260,
    origin: { x: 0.25, y: 0.9 },
    colors: ['#ffeb3b', '#fbc02d', '#212121', '#ffffff'],
    shapes: ['square', 'circle'],
    scalar: 0.85,
    gravity: 0.6,
    ticks: 220,
  });
}

export function firePenguinConfetti(): void {
  runEmojiAcrossBottom('🐧', 'left');
  spawnFloatingEmojis(['❄️', '🐟', '🧊'], 10, 1500);
  confetti({
    particleCount: 42,
    startVelocity: 16,
    spread: 95,
    angle: 270,
    origin: { x: 0.55, y: 1 },
    colors: ['#e3f2fd', '#90caf9', '#ffffff', '#37474f'],
    shapes: ['circle'],
    scalar: 0.9,
    gravity: 0.4,
    ticks: 280,
  });
}

export function fireNatureConfetti(): void {
  spawnFloatingEmojis(['🍃', '💧', '☀️'], 10, 1500);
  [0.2, 0.5, 0.8].forEach((x, i) => {
    setTimeout(() => {
      confetti({
        particleCount: 40,
        startVelocity: 18,
        spread: 110,
        angle: 270,
        origin: { x, y: 0 },
        colors: ['#81c784', '#4fc3f7', '#fff176', '#b39ddb'],
        shapes: ['circle'],
        scalar: 1.0,
        ticks: 320,
        gravity: 0.36,
      });
    }, i * 120);
  });
}

export function fireLightningStormConfetti(): void {
  flashStormOverlay();
  spawnFloatingEmojis(['⚡', '⚡', '💥'], 10, 900);
  [0.2, 0.45, 0.7, 0.86].forEach((x, i) => {
    setTimeout(() => {
      confetti({
        particleCount: 45,
        startVelocity: 54,
        spread: 24,
        angle: 90,
        origin: { x, y: 0 },
        colors: ['#ffffff', '#e3f2fd', '#90caf9', '#b39ddb'],
        shapes: ['square'],
        scalar: 1.15,
        gravity: 0.88,
        ticks: 180,
      });
    }, i * 120);
  });
}

export function fireSpaceConfetti(): void {
  spawnFloatingEmojis(['✨', '🪐', '🌌'], 10, 1700);
  [[0.15, 0.3], [0.85, 0.3], [0.5, 0.15]].forEach(([x, y], i) => {
    setTimeout(() => {
      confetti({
        particleCount: 48,
        startVelocity: 42,
        spread: 320,
        origin: { x, y },
        colors: ['#90caf9', '#b39ddb', '#f48fb1', '#fff176', '#ffffff'],
        shapes: ['star'],
        scalar: 1.05,
        ticks: 280,
        gravity: 0.42,
      });
    }, i * 150);
  });
}

export function fireUfoSweepConfetti(): void {
  if (typeof document !== 'undefined') {
    const ufo = document.createElement('div');
    ufo.textContent = '🛸';
    ufo.style.position = 'fixed';
    ufo.style.left = '-72px';
    ufo.style.top = '16%';
    ufo.style.fontSize = '38px';
    ufo.style.pointerEvents = 'none';
    ufo.style.zIndex = '10000';
    ufo.style.transition = 'transform 1900ms ease-in-out';
    document.body.appendChild(ufo);
    requestAnimationFrame(() => {
      ufo.style.transform = `translate(${window.innerWidth + 140}px, 26px)`;
    });
    setTimeout(() => ufo.remove(), 2000);
  }
  fireSpaceConfetti();
}

export function fireFoodConfetti(): void {
  spawnFloatingEmojis(['🍕', '🍩', '🍜', '🌮'], 10, 1500);
  confetti({
    particleCount: 58,
    startVelocity: 24,
    spread: 95,
    angle: 270,
    origin: { x: 0.5, y: 1 },
    colors: ['#ffcc80', '#ffab91', '#ffe082', '#bcaaa4'],
    shapes: ['circle'],
    scalar: 1.05,
    ticks: 260,
    gravity: 0.58,
  });
}

export function fireCoffeeSteamConfetti(): void {
  if (typeof document !== 'undefined') {
    const steam = document.createElement('div');
    steam.textContent = '☕';
    steam.style.position = 'fixed';
    steam.style.left = '50%';
    steam.style.bottom = '18px';
    steam.style.transform = 'translateX(-50%)';
    steam.style.fontSize = '38px';
    steam.style.pointerEvents = 'none';
    steam.style.zIndex = '10000';
    document.body.appendChild(steam);
    setTimeout(() => steam.remove(), 1200);
  }
  spawnFloatingEmojis(['💨', '☁️'], 8, 1300);
  confetti({
    particleCount: 32,
    startVelocity: 14,
    spread: 55,
    angle: 270,
    origin: { x: 0.5, y: 0.95 },
    colors: ['#d7ccc8', '#bcaaa4', '#eeeeee'],
    shapes: ['circle'],
    scalar: 0.9,
    ticks: 260,
    gravity: 0.18,
  });
}

export function fireTechConfetti(): void {
  spawnFloatingEmojis(['✨', '💾', '🎮'], 10, 1450);
  confetti({
    particleCount: 62,
    startVelocity: 30,
    spread: 85,
    angle: 270,
    origin: { x: 0.5, y: 1 },
    colors: ['#80d8ff', '#ce93d8', '#ffd54f', '#a5d6a7'],
    shapes: ['square', 'circle'],
    scalar: 0.95,
    ticks: 260,
    gravity: 0.56,
  });
}

export function fireRobotConfetti(): void {
  spawnFloatingEmojis(['🤖', '⚙️', '🔧'], 10, 1500);
  confetti({
    particleCount: 60,
    startVelocity: 30,
    spread: 80,
    angle: 270,
    origin: { x: 0.5, y: 1 },
    colors: ['#90a4ae', '#80deea', '#b0bec5', '#ffd54f'],
    shapes: ['square'],
    scalar: 0.95,
    ticks: 260,
    gravity: 0.55,
  });
}

export function fireGamepadConfetti(): void {
  spawnFloatingEmojis(['🎮', '🅰️', '🅱️'], 11, 1400);
  [[0.1, 0.85, 35], [0.9, 0.85, 145], [0.2, 0.2, 315], [0.8, 0.2, 225]].forEach(([x, y, angle], i) => {
    setTimeout(() => {
      confetti({
        particleCount: 30,
        startVelocity: 36,
        spread: 55,
        angle: Number(angle),
        origin: { x: Number(x), y: Number(y) },
        colors: ['#7e57c2', '#42a5f5', '#66bb6a', '#ffca28'],
        shapes: ['square', 'circle'],
        scalar: 0.9,
        ticks: 220,
        gravity: 0.62,
      });
    }, i * 90);
  });
}

export function fireJoystickConfetti(): void {
  runEmojiAcrossBottom('🕹️', 'right');
  spawnFloatingEmojis(['🕹️', '👾', '💥'], 9, 1350);
  confetti({
    particleCount: 44,
    startVelocity: 28,
    spread: 75,
    angle: 265,
    origin: { x: 0.3, y: 1 },
    colors: ['#ef5350', '#ab47bc', '#42a5f5', '#ffca28'],
    shapes: ['square'],
    scalar: 0.95,
    ticks: 230,
    gravity: 0.58,
  });
}

export function firePixelHeartConfetti(): void {
  if (typeof document !== 'undefined') {
    const heart = document.createElement('div');
    heart.textContent = '🧡';
    heart.style.position = 'fixed';
    heart.style.left = '50%';
    heart.style.top = '52%';
    heart.style.transform = 'translate(-50%, -50%) scale(0.6)';
    heart.style.fontSize = '54px';
    heart.style.opacity = '0';
    heart.style.pointerEvents = 'none';
    heart.style.zIndex = '10000';
    heart.style.transition = 'transform 550ms ease, opacity 550ms ease';
    document.body.appendChild(heart);
    requestAnimationFrame(() => {
      heart.style.opacity = '1';
      heart.style.transform = 'translate(-50%, -50%) scale(1.15)';
    });
    setTimeout(() => {
      heart.style.opacity = '0';
      heart.style.transform = 'translate(-50%, -50%) scale(0.8)';
    }, 450);
    setTimeout(() => heart.remove(), 980);
  }
  spawnFloatingEmojis(['🧡', '💖', '✨'], 10, 1300);
  confetti({
    particleCount: 46,
    startVelocity: 20,
    spread: 90,
    angle: 270,
    origin: { x: 0.5, y: 0.92 },
    colors: ['#ff8a65', '#ffcc80', '#f48fb1', '#fff176'],
    shapes: ['circle'],
    scalar: 0.95,
    ticks: 240,
    gravity: 0.5,
  });
}

export function fireSparklesTrailConfetti(): void {
  [0.15, 0.35, 0.55, 0.75, 0.9].forEach((x, i) => {
    setTimeout(() => {
      confetti({
        particleCount: 30,
        startVelocity: 18,
        spread: 45,
        angle: 270,
        origin: { x, y: 0.1 + (i % 2) * 0.18 },
        colors: ['#ffffff', '#fff176', '#ce93d8', '#80deea'],
        shapes: ['star'],
        scalar: 1.0,
        ticks: 300,
        gravity: 0.34,
      });
    }, i * 110);
  });
  spawnFloatingEmojis(['✨', '🌟'], 9, 1450);
}
