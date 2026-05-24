import confetti from 'canvas-confetti';

export const FLAG_COLORS: Record<string, string[]> = {
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

export function burst(originX: number, originY: number, angle: number, colors: string[]) {
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

export function firePrideConfetti(colors: string[]): void {
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

export function spawnFloatingEmojis(emojis: string[], count: number, durationMs: number): void {
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

export function runEmojiAcrossBottomWithTrail(
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

export function flashStormOverlay(intensity = 0.7): void {
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

export function pulseEmojiCenter(emoji: string, pulses: number, totalMs: number): void {
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
