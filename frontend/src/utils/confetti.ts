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

// ── DOM helpers ───────────────────────────────────────────────────────────────

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

    setTimeout(() => { el.style.opacity = '0'; }, durationMs - 180);
  }

  setTimeout(() => layer.remove(), durationMs + 100);
}

/** Run an emoji across the bottom of the screen, calling trailFn at regular
 *  intervals so callers can fire confetti that trails behind the runner. */
function runEmojiAcrossBottomWithTrail(
  emoji: string,
  direction: 'left' | 'right',
  durationMs: number,
  trailFn: (progress: number) => void,
): void {
  if (typeof document === 'undefined') return;
  const runner = document.createElement('div');
  runner.textContent = emoji;
  runner.style.position = 'fixed';
  runner.style.bottom = '18px';
  runner.style.fontSize = '42px';
  runner.style.pointerEvents = 'none';
  runner.style.zIndex = '10000';
  runner.style.transition = `transform ${durationMs}ms linear`;

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

  const trailInterval = 220;
  const steps = Math.floor(durationMs / trailInterval);
  for (let i = 0; i < steps; i++) {
    setTimeout(() => trailFn(i / steps), i * trailInterval + 80);
  }

  setTimeout(() => runner.remove(), durationMs + 100);
}

function flashStormOverlay(intensity = 0.7): void {
  if (typeof document === 'undefined') return;
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = '#ffffff';
  overlay.style.opacity = '0';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '9998';
  overlay.style.transition = 'opacity 60ms ease';
  document.body.appendChild(overlay);

  const flashes = [0, 80, 180, 320, 480, 620, 820, 940];
  flashes.forEach((t, i) => {
    setTimeout(() => {
      overlay.style.transition = i % 2 === 0 ? 'opacity 30ms ease' : 'opacity 100ms ease';
      overlay.style.opacity = i % 2 === 0 ? String(intensity * (1 - i * 0.08)) : '0';
    }, t);
  });
  setTimeout(() => overlay.remove(), 1200);
}

function pulseEmojiCenter(emoji: string, pulses: number, totalMs: number): void {
  if (typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.textContent = emoji;
  el.style.position = 'fixed';
  el.style.left = '50%';
  el.style.top = '50%';
  el.style.transform = 'translate(-50%, -50%) scale(0.5)';
  el.style.fontSize = '64px';
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '10000';
  document.body.appendChild(el);

  const stepMs = totalMs / (pulses * 2);
  for (let p = 0; p < pulses; p++) {
    const tIn = p * stepMs * 2;
    const tOut = tIn + stepMs;
    setTimeout(() => {
      el.style.transition = `transform ${stepMs * 0.8}ms ease-out, opacity ${stepMs * 0.6}ms ease`;
      el.style.opacity = '1';
      el.style.transform = `translate(-50%, -50%) scale(${1.1 + p * 0.08})`;
    }, tIn);
    setTimeout(() => {
      el.style.transition = `transform ${stepMs * 0.8}ms ease-in, opacity ${stepMs * 0.8}ms ease`;
      el.style.opacity = p === pulses - 1 ? '0' : '0.5';
      el.style.transform = `translate(-50%, -50%) scale(0.7)`;
    }, tOut);
  }
  setTimeout(() => el.remove(), totalMs + 100);
}

// ── Animals ───────────────────────────────────────────────────────────────────

/** Cat: runs right→left leaving a trail of warm confetti bursts, exits with a pop */
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
  // Exit burst when cat disappears off the left
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

/** Dog: runs left→right with a wagging trail, exits with an excited explosion */
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
  // Excited tail-wag explosion on exit
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

/** Fox: runs right→left with a flutter of autumn leaves trailing behind */
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
  // Leaf scatter burst on exit
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

/** Octopus: ink-splat — DOM blob expands + fast radial bursts + diagonal ink jets */
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
  // Main ink explosion — 3 waves at increasing velocity
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
  // Diagonal ink jets
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

/** Bee: zigzag flight path — bursts trace the bee's erratic route across the screen */
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
  // Final pollen burst
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

/** Penguin: runs right→left spraying ice across the ground as it belly-slides */
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
  // Final ice explosion
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

// ── Nature & Weather ──────────────────────────────────────────────────────────

/** Sun: golden rays radiate outward from center in a starburst */
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

/** Moon: silver/blue moonlight filters down, star twinkles pop across the sky */
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
  // Moonlight — slow, wide, drifting silver/blue circles from top
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
  // Twinkling star pops from random positions across the sky
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

/** Cloud: fluffy white/gray puffs billowing down with heavy random drift */
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

/** Lightning: rapid-fire blinding bolt strikes, screen flash, ground shockwaves */
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
  // Ground-level shockwave bursts
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

// ── Space ─────────────────────────────────────────────────────────────────────

/** Rocket: launches upward from bottom-center with exhaust trail, explodes at top */
export function fireRocketConfetti(): void {
  if (typeof document !== 'undefined') {
    const rocket = document.createElement('div');
    rocket.textContent = '🚀';
    rocket.style.position = 'fixed';
    rocket.style.left = '50%';
    rocket.style.bottom = '20px';
    rocket.style.transform = 'translateX(-50%) translateY(0) rotate(-45deg)';
    rocket.style.fontSize = '44px';
    rocket.style.pointerEvents = 'none';
    rocket.style.zIndex = '10000';
    rocket.style.transition = 'transform 1400ms cubic-bezier(0.4, 0, 0.2, 1)';
    document.body.appendChild(rocket);
    requestAnimationFrame(() => {
      rocket.style.transform = `translateX(-50%) translateY(-${window.innerHeight + 100}px) rotate(-45deg)`;
    });
    setTimeout(() => rocket.remove(), 1500);
  }
  // Exhaust trail — rapid small bursts from launch point
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      confetti({
        particleCount: 18,
        startVelocity: 20,
        spread: 35,
        angle: 90,
        origin: { x: 0.5, y: 0.95 - i * 0.03 },
        colors: ['#ff6d00', '#ffab40', '#ff3d00', '#ffd740', '#ffffff'],
        shapes: ['circle', 'square'],
        scalar: 0.7,
        gravity: 0.9,
        ticks: 130,
      });
    }, i * 120);
  }
  // Explosion at top when rocket exits
  setTimeout(() => {
    [0, 80, 160].forEach((delay) => {
      setTimeout(() => {
        confetti({
          particleCount: 80,
          startVelocity: 65,
          spread: 360,
          origin: { x: 0.5, y: 0.05 },
          colors: ['#90caf9', '#b39ddb', '#f48fb1', '#fff176', '#ffffff', '#ff8a65'],
          shapes: ['star'],
          scalar: 1.2,
          gravity: 0.38,
          ticks: 420,
        });
      }, delay);
    });
  }, 1380);
}

/** Planet: slow orbital rings radiate outward from center, shooting star streaks */
export function firePlanetConfetti(): void {
  pulseEmojiCenter('🪐', 1, 1200);
  [0, 350].forEach((delay, wave) => {
    setTimeout(() => {
      confetti({
        particleCount: 100,
        startVelocity: 28 + wave * 10,
        spread: 360,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#90caf9', '#b39ddb', '#f48fb1', '#80cbc4', '#fff9c4'],
        shapes: ['circle'],
        scalar: 0.9 + wave * 0.2,
        gravity: 0.05,
        ticks: 600,
      });
    }, delay);
  });
  // Shooting star streaks
  [[0.1, 0.2], [0.9, 0.3], [0.5, 0.1]].forEach(([x, y], i) => {
    setTimeout(() => {
      confetti({
        particleCount: 20,
        startVelocity: 55,
        spread: 12,
        angle: 200 + i * 30,
        origin: { x, y },
        colors: ['#ffffff', '#fffde7'],
        shapes: ['star'],
        scalar: 0.7,
        gravity: 0.5,
        ticks: 200,
      });
    }, 500 + i * 150);
  });
}

/** Stars: twinkling star pops scattered across the entire screen */
export function fireStarsConfetti(): void {
  spawnFloatingEmojis(['⭐', '🌟', '✨', '💫'], 14, 1800);
  for (let i = 0; i < 14; i++) {
    setTimeout(() => {
      confetti({
        particleCount: 8,
        startVelocity: 18,
        spread: 360,
        origin: { x: 0.05 + Math.random() * 0.9, y: 0.05 + Math.random() * 0.8 },
        colors: ['#ffffff', '#fff9c4', '#fffde7', '#ffd700', '#e8eaf6'],
        shapes: ['star'],
        scalar: 0.85,
        gravity: 0.15,
        ticks: 300,
        drift: (Math.random() - 0.5) * 1.5,
      });
    }, i * 85);
  }
}

/** Comet: streaks diagonally across screen with a particle tail, impact explosion */
export function fireCometConfetti(): void {
  if (typeof document !== 'undefined') {
    const comet = document.createElement('div');
    comet.textContent = '☄️';
    comet.style.position = 'fixed';
    comet.style.right = '-64px';
    comet.style.top = '8%';
    comet.style.fontSize = '44px';
    comet.style.pointerEvents = 'none';
    comet.style.zIndex = '10000';
    comet.style.transition = 'transform 1600ms linear';
    document.body.appendChild(comet);
    requestAnimationFrame(() => {
      comet.style.transform = `translate(-${window.innerWidth + 140}px, ${window.innerHeight * 0.5}px)`;
    });
    setTimeout(() => comet.remove(), 1700);
  }
  // Particle tail along the diagonal path
  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      const progress = i / 10;
      confetti({
        particleCount: 20,
        startVelocity: 35,
        spread: 20,
        angle: 210,
        origin: { x: 0.95 - progress * 0.85, y: 0.08 + progress * 0.42 },
        colors: ['#ffffff', '#b3e5fc', '#ce93d8', '#80deea', '#fff9c4'],
        shapes: ['star'],
        scalar: 0.9,
        gravity: 0.35,
        ticks: 280,
      });
    }, i * 130);
  }
  // Impact explosion at end
  setTimeout(() => {
    confetti({
      particleCount: 110,
      startVelocity: 55,
      spread: 360,
      origin: { x: 0.1, y: 0.58 },
      colors: ['#ffffff', '#b3e5fc', '#ce93d8', '#ffd740', '#ff6d00'],
      shapes: ['star', 'circle'],
      scalar: 1.2,
      gravity: 0.4,
      ticks: 400,
    });
  }, 1550);
}

/** UFO: sweeps across, fires a tractor beam mid-screen, abduction flash, space explosion */
export function fireUfoSweepConfetti(): void {
  if (typeof document !== 'undefined') {
    const ufo = document.createElement('div');
    ufo.textContent = '🛸';
    ufo.style.position = 'fixed';
    ufo.style.left = '-72px';
    ufo.style.top = '14%';
    ufo.style.fontSize = '46px';
    ufo.style.pointerEvents = 'none';
    ufo.style.zIndex = '10000';
    ufo.style.transition = 'transform 2200ms ease-in-out';
    document.body.appendChild(ufo);
    requestAnimationFrame(() => {
      ufo.style.transform = `translate(${window.innerWidth + 140}px, 18px)`;
    });
    setTimeout(() => ufo.remove(), 2300);

    // Tractor beam when UFO is near center
    setTimeout(() => {
      const beam = document.createElement('div');
      beam.style.position = 'fixed';
      beam.style.left = '50%';
      beam.style.top = '18%';
      beam.style.transform = 'translateX(-50%)';
      beam.style.width = '0';
      beam.style.height = '0';
      beam.style.borderLeft = '28px solid transparent';
      beam.style.borderRight = '28px solid transparent';
      beam.style.borderTop = '120px solid rgba(100,255,120,0.22)';
      beam.style.filter = 'blur(4px)';
      beam.style.pointerEvents = 'none';
      beam.style.zIndex = '9999';
      beam.style.opacity = '0';
      beam.style.transition = 'opacity 300ms ease';
      document.body.appendChild(beam);
      requestAnimationFrame(() => { beam.style.opacity = '1'; });
      setTimeout(() => { beam.style.opacity = '0'; }, 700);
      setTimeout(() => beam.remove(), 1100);

      // Beam particles rising upward
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          confetti({
            particleCount: 12,
            startVelocity: 22,
            spread: 10,
            angle: 90,
            origin: { x: 0.5, y: 0.85 - i * 0.06 },
            colors: ['#69ff7a', '#b3ffb8', '#ffffff'],
            shapes: ['circle'],
            scalar: 0.6,
            gravity: -0.4,
            ticks: 200,
          });
        }, i * 80);
      }

      // Abduction flash
      setTimeout(() => {
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.inset = '0';
        flash.style.background = '#afffb8';
        flash.style.opacity = '0.55';
        flash.style.pointerEvents = 'none';
        flash.style.zIndex = '9998';
        flash.style.transition = 'opacity 220ms ease';
        document.body.appendChild(flash);
        setTimeout(() => { flash.style.opacity = '0'; }, 80);
        setTimeout(() => flash.remove(), 400);
      }, 540);
    }, 1000);
  }
  // Space explosion after UFO passes
  setTimeout(() => {
    [0, 120, 240].forEach((delay) => {
      setTimeout(() => {
        confetti({
          particleCount: 70,
          startVelocity: 60,
          spread: 360,
          origin: { x: 0.3 + Math.random() * 0.4, y: 0.2 + Math.random() * 0.3 },
          colors: ['#90caf9', '#b39ddb', '#69ff7a', '#fff176', '#ffffff'],
          shapes: ['star'],
          scalar: 1.1,
          gravity: 0.35,
          ticks: 380,
        });
      }, delay);
    });
  }, 1700);
}

// ── Food & Drinks ─────────────────────────────────────────────────────────────

/** Coffee: anchored cup with three narrow steam columns rising convincingly */
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

/** Pizza: DOM pizza spins at center while 8 slice-bursts radiate outward */
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

/** Donut: DOM donut pulses + two concentric waves of sprinkles fly outward */
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

/** Ramen: long noodle-ribbon strands rain down with heavy side drift */
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

/** Taco: DOM taco flips and spins while ingredient confetti erupts from 4 corners */
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

// ── Tech & Play ───────────────────────────────────────────────────────────────

/** Robot: spinning gear DOM element + compass-point gear-bursts collide at center */
export function fireRobotConfetti(): void {
  if (typeof document !== 'undefined') {
    const gear = document.createElement('div');
    gear.textContent = '⚙️';
    gear.style.position = 'fixed';
    gear.style.left = '50%';
    gear.style.top = '50%';
    gear.style.transform = 'translate(-50%, -50%) rotate(0deg)';
    gear.style.fontSize = '60px';
    gear.style.opacity = '0';
    gear.style.pointerEvents = 'none';
    gear.style.zIndex = '10000';
    document.body.appendChild(gear);
    let angle = 0;
    let opacity = 0;
    const start = Date.now();
    function spinFrame() {
      const elapsed = Date.now() - start;
      if (elapsed < 1400) {
        angle += 8;
        opacity = elapsed < 200 ? elapsed / 200 : elapsed > 1100 ? 1 - (elapsed - 1100) / 300 : 1;
        gear.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
        gear.style.opacity = String(opacity);
        requestAnimationFrame(spinFrame);
      } else {
        gear.remove();
      }
    }
    requestAnimationFrame(spinFrame);
  }
  // 4 compass-point bursts firing inward
  [[0.5, 0, 270], [0.5, 1, 90], [0, 0.5, 0], [1, 0.5, 180]].forEach(([x, y, ang], i) => {
    setTimeout(() => {
      confetti({
        particleCount: 45,
        startVelocity: 52,
        spread: 28,
        angle: Number(ang),
        origin: { x: Number(x), y: Number(y) },
        colors: ['#90a4ae', '#80deea', '#b0bec5', '#ffd54f', '#546e7a'],
        shapes: ['square'],
        scalar: 1.0,
        gravity: 0.5,
        ticks: 280,
      });
    }, i * 80);
  });
  // Center collision burst
  setTimeout(() => {
    confetti({
      particleCount: 70,
      startVelocity: 35,
      spread: 360,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#80deea', '#ffd54f', '#b0bec5'],
      shapes: ['square'],
      scalar: 0.85,
      gravity: 0.45,
      ticks: 260,
    });
  }, 400);
}

/** Gamepad: X-pattern button combo — corner pairs fire simultaneously, then center */
export function fireGamepadConfetti(): void {
  spawnFloatingEmojis(['🎮', '🅰️', '🅱️', '⬆️'], 11, 1600);
  // TL + BR simultaneously
  setTimeout(() => {
    confetti({ particleCount: 40, startVelocity: 44, spread: 55, angle: 315, origin: { x: 0.08, y: 0.15 }, colors: ['#7e57c2', '#42a5f5', '#66bb6a', '#ffca28'], shapes: ['square', 'circle'], scalar: 0.95, gravity: 0.55, ticks: 260 });
    confetti({ particleCount: 40, startVelocity: 44, spread: 55, angle: 135, origin: { x: 0.92, y: 0.85 }, colors: ['#7e57c2', '#42a5f5', '#66bb6a', '#ffca28'], shapes: ['square', 'circle'], scalar: 0.95, gravity: 0.55, ticks: 260 });
  }, 0);
  // TR + BL simultaneously
  setTimeout(() => {
    confetti({ particleCount: 40, startVelocity: 44, spread: 55, angle: 225, origin: { x: 0.92, y: 0.15 }, colors: ['#ef5350', '#ff8a65', '#ffca28', '#ab47bc'], shapes: ['square', 'circle'], scalar: 0.95, gravity: 0.55, ticks: 260 });
    confetti({ particleCount: 40, startVelocity: 44, spread: 55, angle: 45,  origin: { x: 0.08, y: 0.85 }, colors: ['#ef5350', '#ff8a65', '#ffca28', '#ab47bc'], shapes: ['square', 'circle'], scalar: 0.95, gravity: 0.55, ticks: 260 });
  }, 180);
  // Center explosion
  setTimeout(() => {
    confetti({
      particleCount: 90,
      startVelocity: 55,
      spread: 360,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#7e57c2', '#42a5f5', '#ef5350', '#66bb6a', '#ffca28'],
      shapes: ['star'],
      scalar: 1.1,
      gravity: 0.4,
      ticks: 350,
    });
  }, 380);
}

/** Joystick: runner + arcade score explosion on exit */
export function fireJoystickConfetti(): void {
  spawnFloatingEmojis(['🕹️', '👾', '💥'], 9, 2000);
  runEmojiAcrossBottomWithTrail('🕹️', 'right', 1800, (progress) => {
    const x = 0.08 + progress * 0.8;
    confetti({
      particleCount: 10,
      startVelocity: 22,
      spread: 50,
      angle: 60 + Math.random() * 60,
      origin: { x: Math.min(0.95, x), y: 0.9 },
      colors: ['#ef5350', '#ab47bc', '#42a5f5', '#ffca28'],
      shapes: ['square'],
      scalar: 0.8,
      gravity: 0.65,
      ticks: 180,
    });
  });
  // Arcade "INSERT COIN" score explosion on exit
  setTimeout(() => {
    confetti({
      particleCount: 120,
      startVelocity: 72,
      spread: 360,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#ef5350', '#ab47bc', '#42a5f5', '#ffca28', '#66bb6a', '#ffffff'],
      shapes: ['star'],
      scalar: 1.5,
      gravity: 0.38,
      ticks: 420,
    });
  }, 1820);
}

/** Pixel Heart: 3 pulses, each emitting a confetti ring outward from center */
export function firePixelHeartConfetti(): void {
  if (typeof document !== 'undefined') {
    const heart = document.createElement('div');
    heart.textContent = '🧡';
    heart.style.position = 'fixed';
    heart.style.left = '50%';
    heart.style.top = '50%';
    heart.style.transform = 'translate(-50%, -50%) scale(0.5)';
    heart.style.fontSize = '58px';
    heart.style.opacity = '0';
    heart.style.pointerEvents = 'none';
    heart.style.zIndex = '10000';
    document.body.appendChild(heart);

    [0, 320, 640].forEach((t, p) => {
      setTimeout(() => {
        heart.style.transition = 'transform 160ms ease-out, opacity 160ms ease';
        heart.style.opacity = '1';
        heart.style.transform = `translate(-50%, -50%) scale(${1.2 + p * 0.1})`;
      }, t);
      setTimeout(() => {
        heart.style.transition = 'transform 140ms ease-in, opacity 140ms ease';
        heart.style.opacity = p === 2 ? '0' : '0.6';
        heart.style.transform = `translate(-50%, -50%) scale(0.75)`;
      }, t + 170);
    });
    setTimeout(() => heart.remove(), 1200);
  }
  // Each pulse fires a ring outward from center
  [0, 320, 640].forEach((t, p) => {
    setTimeout(() => {
      confetti({
        particleCount: 40 + p * 15,
        startVelocity: 22 + p * 12,
        spread: 360,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#ff8a65', '#ffcc80', '#f48fb1', '#fff176', '#ff6b9d'],
        shapes: ['circle'],
        scalar: 0.85,
        gravity: 0.3,
        ticks: 300 + p * 50,
      });
    }, t);
  });
  spawnFloatingEmojis(['🧡', '💖', '✨'], 10, 1800);
}

/** Sparkles Trail: dramatic comet-sweep with a second trailing wave */
export function fireSparklesTrailConfetti(): void {
  spawnFloatingEmojis(['✨', '🌟', '💫'], 12, 2000);
  // First wave: left-to-right sweep, alternating top/mid height
  [0.08, 0.28, 0.50, 0.72, 0.92].forEach((x, i) => {
    setTimeout(() => {
      confetti({
        particleCount: 38,
        startVelocity: 28,
        spread: 80,
        angle: 270,
        origin: { x, y: i % 2 === 0 ? 0.05 : 0.42 },
        colors: ['#ffffff', '#fff176', '#ce93d8', '#80deea', '#f8bbd0'],
        shapes: ['star'],
        scalar: 1.1,
        ticks: 380,
        gravity: 0.28,
      });
    }, i * 200);
  });
  // Second trailing wave
  [0.15, 0.38, 0.60, 0.82].forEach((x, i) => {
    setTimeout(() => {
      confetti({
        particleCount: 20,
        startVelocity: 18,
        spread: 55,
        angle: 270,
        origin: { x, y: i % 2 === 0 ? 0.18 : 0.55 },
        colors: ['#ffffff', '#fffde7', '#e8eaf6', '#b39ddb'],
        shapes: ['star'],
        scalar: 0.8,
        ticks: 280,
        gravity: 0.32,
      });
    }, 400 + i * 200);
  });
}

// ── Memes ─────────────────────────────────────────────────────────────────────

/** Nyan Cat: pixel-art DOM sprite runs across screen trailing a rainbow */
export function fireNyanCatConfetti(): void {
  if (typeof document === 'undefined') return;

  const PX = 5; // one "pixel" in CSS px
  type C = string | null;
  const T: C = null;
  const K = '#222222';  // black outline
  const W = '#ffffff';  // white
  const G = '#999999';  // cat gray
  const Lg = '#cccccc'; // light gray (cat face/chest)
  const Fp = '#ff99bb'; // frosting pink
  const Ps = '#ffcc99'; // pop-tart tan/sand
  const Sp = '#ff6699'; // pink sprinkle
  const Sr = '#ff3333'; // red sprinkle
  const Sb = '#3399ff'; // blue sprinkle
  const Sg = '#33cc33'; // green sprinkle
  const Nc = '#ff9999'; // nose/cheek pink
  const Dg = '#666666'; // dark gray (ear inner)

  // 26-column × 13-row sprite — cat faces LEFT, head on left, tail on right
  // Row 0 = top. Cat head occupies cols 0-8, tart cols 8-23, tail cols 23-25
  const sprite: C[][] = [
    // row 0 — ears above head
    [T,  T,  K,  K,  T,  T,  K,  K,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    // row 1 — ear detail
    [T,  K,  Dg, K,  T,  K,  Dg, K,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    // row 2 — top of head + top of tart
    [T,  T,  K,  G,  G,  K,  G,  G,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  T,  T],
    // row 3 — head eyes row + frosting top
    [T,  K,  G,  W,  G,  W,  G,  G,  K,  Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, K,  T,  T],
    // row 4 — head eyes (pupils) + frosting sprinkles
    [T,  K,  G,  K,  G,  K,  G,  G,  K,  Fp, Sp, Fp, Fp, Sb, Fp, Fp, Sg, Fp, Fp, Sr, Fp, Fp, Fp, K,  T,  T],
    // row 5 — nose/cheeks + frosting bottom
    [T,  K,  G,  Nc, K,  Nc, G,  G,  K,  Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, K,  T,  T],
    // row 6 — lower head + tart body top
    [T,  T,  K,  G,  G,  G,  G,  K,  K,  Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, K,  T,  T,  T],
    // row 7 — tart body
    [T,  T,  T,  K,  G,  G,  K,  T,  K,  Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, K,  T,  T,  T],
    // row 8 — tart body bottom + tail base
    [T,  T,  T,  T,  T,  T,  T,  T,  K,  Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, K,  G,  K],
    // row 9 — bottom outline of tart
    [T,  T,  T,  T,  T,  T,  T,  T,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  T,  T],
    // row 10 — legs (front pair under head-side, back pair under tail-side)
    [T,  K,  Lg, K,  T,  K,  Lg, K,  T,  T,  T,  K,  Lg, K,  T,  T,  T,  K,  Lg, K,  T,  T,  T,  T,  T,  T],
    // row 11 — leg bottoms
    [T,  K,  Lg, K,  T,  K,  Lg, K,  T,  T,  T,  K,  Lg, K,  T,  T,  T,  K,  Lg, K,  T,  T,  T,  T,  T,  T],
    // row 12 — tail curl tip (top-right)
    [T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  K,  G,  K],
  ];

  const COLS = sprite[0].length;
  const ROWS = sprite.length;
  const spriteW = COLS * PX;
  const spriteH = ROWS * PX;

  const RAINBOW = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#004dff', '#750787'];
  const bandH = 5;
  const totalTrailH = RAINBOW.length * bandH;
  // Vertically center the rainbow on the tart body (rows 2-9 = 8 rows from top of sprite)
  const spriteTop = window.innerHeight * 0.74 - spriteH / 2;
  const tartMidY = spriteTop + (5 * PX); // approx middle of tart body rows
  const trailTop = tartMidY - totalTrailH / 2;

  // Container: starts off left edge, moves right
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = `${spriteTop}px`;
  container.style.left = `-${spriteW + 20}px`;
  container.style.pointerEvents = 'none';
  container.style.zIndex = '10001';
  document.body.appendChild(container);

  // Rainbow trail: right edge = left edge of sprite, grows leftward as cat moves right
  const trail = document.createElement('div');
  trail.style.position = 'fixed';
  trail.style.top = `${trailTop}px`;
  trail.style.left = '0px';
  trail.style.width = '0px';
  trail.style.display = 'flex';
  trail.style.flexDirection = 'column';
  trail.style.pointerEvents = 'none';
  trail.style.zIndex = '10000';
  RAINBOW.forEach((color) => {
    const band = document.createElement('div');
    band.style.height = `${bandH}px`;
    band.style.width = '100%';
    band.style.background = color;
    trail.appendChild(band);
  });
  document.body.appendChild(trail);

  // Pixel grid
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = `repeat(${COLS}, ${PX}px)`;
  grid.style.gridTemplateRows = `repeat(${ROWS}, ${PX}px)`;
  grid.style.transform = 'scaleX(-1)'; // flip horizontally so cat faces right
  container.appendChild(grid);

  sprite.forEach((row) => {
    row.forEach((color) => {
      const cell = document.createElement('div');
      cell.style.width = `${PX}px`;
      cell.style.height = `${PX}px`;
      if (color) cell.style.background = color;
      grid.appendChild(cell);
    });
  });

  // Animation loop — slide sprite left to right
  const totalMs = 2600;
  const startTime = Date.now();

  function animateNyan() {
    const elapsed = Date.now() - startTime;
    if (elapsed > totalMs + 200) {
      container.remove();
      trail.remove();
      return;
    }
    const progress = Math.min(elapsed / totalMs, 1);
    const travelDist = window.innerWidth + spriteW + 40;
    const moved = progress * travelDist;

    // Sprite left edge in viewport
    const spriteLeft = -spriteW - 20 + moved;
    container.style.left = `${spriteLeft}px`;

    // Trail fills from viewport left up to the sprite's left edge (head),
    // stopping spriteW short so rainbow doesn't bleed in front of the cat
    const trailWidth = Math.max(0, spriteLeft);
    trail.style.width = `${trailWidth}px`;

    requestAnimationFrame(animateNyan);
  }
  requestAnimationFrame(animateNyan);

  // Confetti rainbow bursts track cat position (left to right)
  for (let i = 0; i < 12; i++) {
    setTimeout(() => {
      const progress = i / 12;
      confetti({
        particleCount: 18,
        startVelocity: 16,
        spread: 70,
        angle: 270,
        origin: { x: Math.min(0.99, progress), y: 0.82 },
        colors: RAINBOW,
        shapes: ['circle'],
        scalar: 0.85,
        gravity: 0.3,
        ticks: 300,
      });
    }, i * 180 + 100);
  }

  // Exit rainbow explosion
  setTimeout(() => {
    confetti({
      particleCount: 150,
      startVelocity: 55,
      spread: 360,
      origin: { x: 0.95, y: 0.8 },
      colors: RAINBOW,
      shapes: ['star', 'circle'],
      scalar: 1.2,
      gravity: 0.35,
      ticks: 450,
    });
  }, totalMs - 100);
}

/** Doge: runs across with floating "wow such" Comic Sans text labels */
export function fireDogeConfetti(): void {
  const phrases = ['wow', 'such flair', 'very badge', 'amaze', 'much confetti', 'so celebrate', 'wow'];
  const dogeColors = ['#ffd700', '#ffec8b', '#ffa500', '#ffe066', '#fffacd'];

  if (typeof document !== 'undefined') {
    const layer = document.createElement('div');
    layer.style.position = 'fixed';
    layer.style.inset = '0';
    layer.style.pointerEvents = 'none';
    layer.style.zIndex = '9999';
    document.body.appendChild(layer);

    phrases.forEach((phrase, i) => {
      setTimeout(() => {
        const el = document.createElement('span');
        el.textContent = phrase;
        el.style.position = 'absolute';
        el.style.left = `${10 + Math.random() * 78}%`;
        el.style.top = `${40 + Math.random() * 40}%`;
        el.style.fontSize = `${13 + Math.random() * 14}px`;
        el.style.fontFamily = '"Comic Sans MS", "Comic Sans", cursive';
        el.style.color = dogeColors[i % dogeColors.length];
        el.style.fontWeight = 'bold';
        el.style.textShadow = '1px 1px 2px rgba(0,0,0,0.6)';
        el.style.opacity = '0';
        el.style.transition = 'transform 1400ms ease-out, opacity 1400ms ease-out';
        layer.appendChild(el);
        requestAnimationFrame(() => {
          el.style.opacity = '1';
          el.style.transform = `translate(${(Math.random() - 0.5) * 80}px, -${80 + Math.random() * 140}px) rotate(${(Math.random() - 0.5) * 30}deg)`;
        });
        setTimeout(() => { el.style.opacity = '0'; }, 1200);
      }, i * 220);
    });

    setTimeout(() => layer.remove(), 2600);
  }

  runEmojiAcrossBottomWithTrail('🐕', 'right', 2000, (progress) => {
    const x = 0.08 + progress * 0.8;
    confetti({
      particleCount: 12,
      startVelocity: 20,
      spread: 45,
      angle: 80 + Math.random() * 20,
      origin: { x: Math.min(0.95, x), y: 0.9 },
      colors: dogeColors,
      shapes: ['circle'],
      scalar: 0.85,
      gravity: 0.5,
      ticks: 200,
    });
  });

  setTimeout(() => {
    confetti({
      particleCount: 100,
      startVelocity: 60,
      spread: 360,
      origin: { x: 0.5, y: 0.5 },
      colors: dogeColors,
      shapes: ['star'],
      scalar: 1.3,
      gravity: 0.35,
      ticks: 400,
    });
  }, 2050);
}

/** Trollface: appears center, shakes/wiggles, then unleashes total chaos */
export function fireTrollfaceConfetti(): void {
  if (typeof document !== 'undefined') {
    const troll = document.createElement('div');
    troll.textContent = '😈';
    troll.style.position = 'fixed';
    troll.style.left = '50%';
    troll.style.top = '40%';
    troll.style.fontSize = '72px';
    troll.style.opacity = '0';
    troll.style.pointerEvents = 'none';
    troll.style.zIndex = '10001';
    troll.style.transform = 'translate(-50%, -50%) scale(0.2)';
    troll.style.transition = 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease';
    document.body.appendChild(troll);

    requestAnimationFrame(() => {
      troll.style.opacity = '1';
      troll.style.transform = 'translate(-50%, -50%) scale(1.1)';
    });

    // Shake/wiggle
    [-12, 12, -10, 10, -8, 8, -5, 5, 0].forEach((deg, i) => {
      setTimeout(() => {
        troll.style.transition = 'transform 60ms ease';
        troll.style.transform = `translate(-50%, -50%) scale(1.1) rotate(${deg}deg)`;
      }, 350 + i * 65);
    });

    setTimeout(() => {
      troll.style.transition = 'transform 200ms ease-in, opacity 200ms ease';
      troll.style.opacity = '0';
      troll.style.transform = 'translate(-50%, -50%) scale(2)';
    }, 1000);
    setTimeout(() => troll.remove(), 1250);
  }

  // Chaos: random bursts with random everything
  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      confetti({
        particleCount: 35 + Math.floor(Math.random() * 40),
        startVelocity: 30 + Math.random() * 55,
        spread: 40 + Math.random() * 320,
        angle: Math.random() * 360,
        origin: { x: Math.random(), y: Math.random() * 0.8 },
        colors: [
          `hsl(${Math.random() * 360}, 90%, 55%)`,
          `hsl(${Math.random() * 360}, 90%, 55%)`,
          `hsl(${Math.random() * 360}, 90%, 55%)`,
        ],
        shapes: [(['star', 'circle', 'square'] as const)[Math.floor(Math.random() * 3)]],
        scalar: 0.7 + Math.random() * 1.2,
        gravity: Math.random() * 1.2,
        drift: (Math.random() - 0.5) * 4,
        ticks: 180 + Math.floor(Math.random() * 250),
      });
    }, 900 + i * 80);
  }
}

/** Among Us: CSS crewmate waddles across then vents mid-screen */
export function fireAmongUsConfetti(): void {
  if (typeof document === 'undefined') return;

  const crewColors = ['#c51111', '#132ed2', '#117f2d', '#ed54ba', '#ef7d0e', '#6b2fbb', '#71491e', '#385cc7'];
  const bodyColor = crewColors[Math.floor(Math.random() * crewColors.length)];

  const crew = document.createElement('div');
  crew.style.position = 'fixed';
  crew.style.bottom = '30px';
  crew.style.left = '-60px';
  crew.style.width = '36px';
  crew.style.height = '48px';
  crew.style.pointerEvents = 'none';
  crew.style.zIndex = '10001';

  const body = document.createElement('div');
  body.style.position = 'absolute';
  body.style.bottom = '0';
  body.style.left = '0';
  body.style.width = '36px';
  body.style.height = '44px';
  body.style.background = bodyColor;
  body.style.borderRadius = '14px 14px 8px 8px';

  const visor = document.createElement('div');
  visor.style.position = 'absolute';
  visor.style.top = '4px';
  visor.style.left = '6px';
  visor.style.width = '22px';
  visor.style.height = '14px';
  visor.style.background = '#7fffff';
  visor.style.borderRadius = '8px 8px 4px 4px';
  visor.style.opacity = '0.85';

  const pack = document.createElement('div');
  pack.style.position = 'absolute';
  pack.style.top = '16px';
  pack.style.right = '-10px';
  pack.style.width = '12px';
  pack.style.height = '22px';
  pack.style.background = bodyColor;
  pack.style.borderRadius = '4px';
  pack.style.filter = 'brightness(0.75)';

  crew.appendChild(body);
  body.appendChild(visor);
  crew.appendChild(pack);
  document.body.appendChild(crew);

  // Waddle bob
  let waddleAngle = 0;
  const waddleInterval = setInterval(() => {
    waddleAngle = waddleAngle === -6 ? 6 : -6;
    crew.style.transform = `rotate(${waddleAngle}deg)`;
  }, 160);

  const travelMs = 2200;
  crew.style.transition = `left ${travelMs}ms linear`;
  requestAnimationFrame(() => {
    crew.style.left = `${window.innerWidth + 80}px`;
  });

  // Footstep confetti trail
  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      confetti({
        particleCount: 8,
        startVelocity: 12,
        spread: 40,
        angle: 270,
        origin: { x: 0.05 + (i / 10) * 0.88, y: 0.95 },
        colors: [bodyColor, '#7fffff', '#ffffff'],
        shapes: ['circle'],
        scalar: 0.6,
        gravity: 0.8,
        ticks: 120,
      });
    }, i * (travelMs / 10) + 80);
  }

  // Vent mid-screen
  const ventTime = travelMs * 0.52;
  setTimeout(() => {
    clearInterval(waddleInterval);
    const centerX = window.innerWidth * 0.52;
    crew.style.transition = 'left 0ms, transform 300ms ease-in, opacity 300ms ease';
    crew.style.left = `${centerX}px`;
    setTimeout(() => {
      crew.style.transform = 'scaleY(0)';
      crew.style.opacity = '0';
    }, 100);
    setTimeout(() => crew.remove(), 500);

    // Vent particles shoot up
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        confetti({
          particleCount: 20,
          startVelocity: 35 - i * 4,
          spread: 22,
          angle: 90,
          origin: { x: 0.52, y: 0.88 - i * 0.04 },
          colors: [bodyColor, '#7fffff', '#ffffff', '#aaaaaa'],
          shapes: ['circle', 'square'],
          scalar: 0.75,
          gravity: -0.2,
          ticks: 260,
        });
      }, i * 70 + 150);
    }

    // SUS flash
    const susFlash = document.createElement('div');
    susFlash.style.position = 'fixed';
    susFlash.style.inset = '0';
    susFlash.style.background = '#ff0000';
    susFlash.style.opacity = '0.18';
    susFlash.style.pointerEvents = 'none';
    susFlash.style.zIndex = '9998';
    susFlash.style.transition = 'opacity 300ms ease';
    document.body.appendChild(susFlash);
    setTimeout(() => { susFlash.style.opacity = '0'; }, 100);
    setTimeout(() => susFlash.remove(), 500);
  }, ventTime);

  setTimeout(() => {
    clearInterval(waddleInterval);
    crew.remove();
  }, travelMs + 200);
}

/** Party Parrot: rapid rainbow color-cycle bursts emulating the GIF's speed */
export function firePartyParrotConfetti(): void {
  spawnFloatingEmojis(['🦜', '🎉', '🎊', '🦜'], 12, 1800);
  const parrotColors = [
    '#e40303', '#ff8c00', '#ffed00', '#008026', '#004dff', '#750787',
    '#ff69b4', '#00ffff', '#ff00ff', '#ffff00',
  ];
  for (let i = 0; i < 18; i++) {
    setTimeout(() => {
      confetti({
        particleCount: 14,
        startVelocity: 26,
        spread: 360,
        origin: { x: 0.5, y: 0.45 },
        colors: [
          parrotColors[i % parrotColors.length],
          parrotColors[(i + 1) % parrotColors.length],
          parrotColors[(i + 2) % parrotColors.length],
        ],
        shapes: ['circle'],
        scalar: 0.75,
        gravity: 0.4,
        ticks: 220,
      });
    }, i * 55);
  }
  // Final party burst
  setTimeout(() => {
    confetti({
      particleCount: 120,
      startVelocity: 50,
      spread: 360,
      origin: { x: 0.5, y: 0.5 },
      colors: parrotColors,
      shapes: ['star', 'circle'],
      scalar: 1.1,
      gravity: 0.35,
      ticks: 400,
    });
  }, 1100);
}

/** Rickroll: confetti that just keeps going. Never gonna give you up. */
export function fireRickrollConfetti(): void {
  spawnFloatingEmojis(['🎵', '🎶', '🎵', '🎶', '🎤'], 16, 3200);
  const rickColors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#cc5de8'];

  // First wave — seems normal
  [0.2, 0.5, 0.8].forEach((x, i) => {
    setTimeout(() => {
      confetti({
        particleCount: 60,
        startVelocity: 38,
        spread: 100,
        angle: 270,
        origin: { x, y: 0 },
        colors: rickColors,
        shapes: ['star'],
        scalar: 1.1,
        gravity: 0.4,
        ticks: 320,
      });
    }, i * 160);
  });

  // It stops... then comes back. Never gonna give you up.
  setTimeout(() => {
    [0.15, 0.45, 0.75].forEach((x, i) => {
      setTimeout(() => {
        confetti({
          particleCount: 70,
          startVelocity: 44,
          spread: 360,
          origin: { x, y: 0.3 },
          colors: rickColors,
          shapes: ['star', 'circle'],
          scalar: 1.2,
          gravity: 0.35,
          ticks: 380,
        });
      }, i * 140);
    });
  }, 900);

  // Never gonna let you down.
  setTimeout(() => {
    confetti({
      particleCount: 140,
      startVelocity: 55,
      spread: 360,
      origin: { x: 0.5, y: 0.5 },
      colors: rickColors,
      shapes: ['star'],
      scalar: 1.3,
      gravity: 0.3,
      ticks: 500,
    });
  }, 1900);

  // Never gonna run around and desert you.
  setTimeout(() => {
    [0.1, 0.3, 0.5, 0.7, 0.9].forEach((x, i) => {
      setTimeout(() => {
        confetti({
          particleCount: 45,
          startVelocity: 48,
          spread: 80,
          angle: 270,
          origin: { x, y: 0 },
          colors: rickColors,
          shapes: ['star', 'circle'],
          scalar: 1.0,
          gravity: 0.38,
          ticks: 420,
        });
      }, i * 120);
    });
  }, 2800);
}

/** This Is Fine: dog sits calmly center-screen while flames rise around it */
export function fireThisIsFineConfetti(): void {
  if (typeof document === 'undefined') return;

  const dog = document.createElement('div');
  dog.textContent = '🐶';
  dog.style.position = 'fixed';
  dog.style.left = '50%';
  dog.style.bottom = '80px';
  dog.style.transform = 'translateX(-50%)';
  dog.style.fontSize = '52px';
  dog.style.opacity = '0';
  dog.style.pointerEvents = 'none';
  dog.style.zIndex = '10001';
  dog.style.transition = 'opacity 400ms ease';
  document.body.appendChild(dog);
  requestAnimationFrame(() => { dog.style.opacity = '1'; });
  setTimeout(() => {
    dog.style.opacity = '0';
    setTimeout(() => dog.remove(), 500);
  }, 2600);

  const mug = document.createElement('div');
  mug.textContent = '☕';
  mug.style.position = 'fixed';
  mug.style.left = 'calc(50% + 48px)';
  mug.style.bottom = '76px';
  mug.style.fontSize = '28px';
  mug.style.opacity = '0';
  mug.style.pointerEvents = 'none';
  mug.style.zIndex = '10001';
  mug.style.transition = 'opacity 400ms ease';
  document.body.appendChild(mug);
  requestAnimationFrame(() => { mug.style.opacity = '1'; });
  setTimeout(() => { mug.style.opacity = '0'; setTimeout(() => mug.remove(), 500); }, 2600);

  // Flames rising from multiple points — slow, organic, ongoing
  const fireColors = ['#ff4500', '#ff6d00', '#ff8f00', '#ffc107', '#ff3d00', '#ffab40'];
  for (let wave = 0; wave < 5; wave++) {
    setTimeout(() => {
      [0.2, 0.35, 0.5, 0.65, 0.8].forEach((x) => {
        confetti({
          particleCount: 12,
          startVelocity: 14,
          spread: 30,
          angle: 270,
          origin: { x, y: 1 },
          colors: fireColors,
          shapes: ['circle'],
          scalar: 1.2,
          gravity: -0.15,
          drift: (Math.random() - 0.5) * 2.5,
          ticks: 400,
        });
      });
    }, wave * 460);
  }

  // "This is fine." text
  const text = document.createElement('div');
  text.textContent = 'This is fine.';
  text.style.position = 'fixed';
  text.style.left = '50%';
  text.style.top = '38%';
  text.style.transform = 'translateX(-50%)';
  text.style.fontFamily = 'serif';
  text.style.fontSize = '22px';
  text.style.color = '#ff6d00';
  text.style.fontWeight = 'bold';
  text.style.textShadow = '1px 1px 3px rgba(0,0,0,0.7)';
  text.style.opacity = '0';
  text.style.pointerEvents = 'none';
  text.style.zIndex = '10001';
  text.style.transition = 'opacity 600ms ease';
  document.body.appendChild(text);
  setTimeout(() => { text.style.opacity = '1'; }, 500);
  setTimeout(() => { text.style.opacity = '0'; setTimeout(() => text.remove(), 700); }, 2200);
}
