import confetti from 'canvas-confetti';
import { spawnFloatingEmojis, runEmojiAcrossBottomWithTrail } from './core';

export function fireNyanCatConfetti(): void {
  if (typeof document === 'undefined') return;

  const PX = 5;
  type C = string | null;
  const T: C = null;
  const K = '#222222';
  const W = '#ffffff';
  const G = '#999999';
  const Lg = '#cccccc';
  const Fp = '#ff99bb';
  const Ps = '#ffcc99';
  const Sp = '#ff6699';
  const Sr = '#ff3333';
  const Sb = '#3399ff';
  const Sg = '#33cc33';
  const Nc = '#ff9999';
  const Dg = '#666666';

  const sprite: C[][] = [
    [T,  T,  K,  K,  T,  T,  K,  K,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  K,  Dg, K,  T,  K,  Dg, K,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T],
    [T,  T,  K,  G,  G,  K,  G,  G,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  T,  T],
    [T,  K,  G,  W,  G,  W,  G,  G,  K,  Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, K,  T,  T],
    [T,  K,  G,  K,  G,  K,  G,  G,  K,  Fp, Sp, Fp, Fp, Sb, Fp, Fp, Sg, Fp, Fp, Sr, Fp, Fp, Fp, K,  T,  T],
    [T,  K,  G,  Nc, K,  Nc, G,  G,  K,  Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, Fp, K,  T,  T],
    [T,  T,  K,  G,  G,  G,  G,  K,  K,  Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, K,  T,  T,  T],
    [T,  T,  T,  K,  G,  G,  K,  T,  K,  Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, K,  T,  T,  T],
    [T,  T,  T,  T,  T,  T,  T,  T,  K,  Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps, K,  G,  K],
    [T,  T,  T,  T,  T,  T,  T,  T,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  T,  T],
    [T,  K,  Lg, K,  T,  K,  Lg, K,  T,  T,  T,  K,  Lg, K,  T,  T,  T,  K,  Lg, K,  T,  T,  T,  T,  T,  T],
    [T,  K,  Lg, K,  T,  K,  Lg, K,  T,  T,  T,  K,  Lg, K,  T,  T,  T,  K,  Lg, K,  T,  T,  T,  T,  T,  T],
    [T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  T,  K,  G,  K],
  ];

  const COLS = sprite[0].length;
  const ROWS = sprite.length;
  const spriteW = COLS * PX;
  const spriteH = ROWS * PX;

  const RAINBOW = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#004dff', '#750787'];
  const bandH = 5;
  const totalTrailH = RAINBOW.length * bandH;
  const spriteTop = window.innerHeight * 0.74 - spriteH / 2;
  const tartMidY = spriteTop + (5 * PX);
  const trailTop = tartMidY - totalTrailH / 2;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = `${spriteTop}px`;
  container.style.left = `-${spriteW + 20}px`;
  container.style.pointerEvents = 'none';
  container.style.zIndex = '10001';
  document.body.appendChild(container);

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

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = `repeat(${COLS}, ${PX}px)`;
  grid.style.gridTemplateRows = `repeat(${ROWS}, ${PX}px)`;
  grid.style.transform = 'scaleX(-1)';
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

    const spriteLeft = -spriteW - 20 + moved;
    container.style.left = `${spriteLeft}px`;

    const trailWidth = Math.max(0, spriteLeft);
    trail.style.width = `${trailWidth}px`;

    requestAnimationFrame(animateNyan);
  }
  requestAnimationFrame(animateNyan);

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

export function fireRickrollConfetti(): void {
  spawnFloatingEmojis(['🎵', '🎶', '🎵', '🎶', '🎤'], 16, 3200);
  const rickColors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#cc5de8'];

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
