import confetti from 'canvas-confetti';
import { spawnFloatingEmojis, runEmojiAcrossBottomWithTrail, pulseEmojiCenter } from './core';

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

export function fireGamepadConfetti(): void {
  spawnFloatingEmojis(['🎮', '🅰️', '🅱️', '⬆️'], 11, 1600);
  setTimeout(() => {
    confetti({ particleCount: 40, startVelocity: 44, spread: 55, angle: 315, origin: { x: 0.08, y: 0.15 }, colors: ['#7e57c2', '#42a5f5', '#66bb6a', '#ffca28'], shapes: ['square', 'circle'], scalar: 0.95, gravity: 0.55, ticks: 260 });
    confetti({ particleCount: 40, startVelocity: 44, spread: 55, angle: 135, origin: { x: 0.92, y: 0.85 }, colors: ['#7e57c2', '#42a5f5', '#66bb6a', '#ffca28'], shapes: ['square', 'circle'], scalar: 0.95, gravity: 0.55, ticks: 260 });
  }, 0);
  setTimeout(() => {
    confetti({ particleCount: 40, startVelocity: 44, spread: 55, angle: 225, origin: { x: 0.92, y: 0.15 }, colors: ['#ef5350', '#ff8a65', '#ffca28', '#ab47bc'], shapes: ['square', 'circle'], scalar: 0.95, gravity: 0.55, ticks: 260 });
    confetti({ particleCount: 40, startVelocity: 44, spread: 55, angle: 45,  origin: { x: 0.08, y: 0.85 }, colors: ['#ef5350', '#ff8a65', '#ffca28', '#ab47bc'], shapes: ['square', 'circle'], scalar: 0.95, gravity: 0.55, ticks: 260 });
  }, 180);
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

export function fireSparklesTrailConfetti(): void {
  spawnFloatingEmojis(['✨', '🌟', '💫'], 12, 2000);
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

export function fireMatrixConfetti(): void {
  const green = ['#00ff41', '#00cc33', '#009900', '#33ff66', '#66ff99', '#ccffcc'];
  for (let col = 0; col < 30; col++) {
    setTimeout(() => {
      confetti({
        particleCount: 3,
        startVelocity: 32,
        spread: 8,
        angle: 270,
        origin: { x: col / 30, y: -0.05 },
        colors: [green[Math.floor(Math.random() * green.length)]],
        shapes: ['square'],
        scalar: 0.5 - Math.random() * 0.2,
        gravity: 0.65,
        ticks: 100,
      });
    }, col * 24);
  }
  setTimeout(() => {
    [0.2, 0.5, 0.8].forEach((x) => {
      confetti({
        particleCount: 40,
        startVelocity: 50,
        spread: 120,
        origin: { x, y: 0.1 },
        colors: ['#00ff41', '#00cc33'],
        shapes: ['square'],
        scalar: 0.7,
        gravity: 0.3,
        ticks: 300,
      });
    });
  }, 320);
  setTimeout(() => {
    confetti({
      particleCount: 70,
      startVelocity: 45,
      spread: 70,
      angle: 90,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#00ff41', '#ffffff', '#00cc33'],
      shapes: ['star'],
      scalar: 1.1,
      ticks: 200,
      gravity: 0.8,
    });
  }, 600);
}

export function firePixelConfetti(): void {
  [[0.25, 0.15, 45], [0.75, 0.15, 135], [0.15, 0.45, 315], [0.85, 0.45, 225], [0.5, 0.3, 270]].forEach(
    ([x, y, a], i) => {
      setTimeout(() => {
        confetti({
          particleCount: 20,
          startVelocity: 14,
          spread: 8,
          angle: Number(a),
          origin: { x: Number(x), y: Number(y) },
          colors: ['#ff0', '#0ff', '#f0f', '#0f0', '#f00', '#00f', '#fff'],
          shapes: ['square'],
          scalar: 2.0,
          gravity: 0.55,
          ticks: 200,
        });
      }, i * 100);
    },
  );
  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      confetti({
        particleCount: 12,
        startVelocity: 18,
        spread: 360,
        origin: { x: Math.random(), y: Math.random() * 0.6 },
        colors: ['#ff0', '#0ff', '#f0f', '#0f0', '#f00', '#00f', '#fff'],
        shapes: ['square'],
        scalar: 1.0,
        gravity: 0.4,
        ticks: 250,
      });
    }, 500 + i * 80);
  }
}

export function fireGithubConfetti(): void {
  const gray = ['#6e7681', '#8b949e', '#c9d1d9', '#f0f6fc', '#ffffff', '#58a6ff'];
  [[0.25, 0.55, 35], [0.75, 0.55, 145], [0.5, 0.3, 270]].forEach(([x, y, a], i) => {
    setTimeout(() => {
      confetti({
        particleCount: 60,
        startVelocity: 30,
        spread: 45,
        angle: Number(a),
        origin: { x: Number(x), y: Number(y) },
        colors: gray,
        shapes: ['square'],
        scalar: 1.0,
        gravity: 0.7,
        ticks: 250,
      });
    }, i * 140);
  });
  setTimeout(() => {
    confetti({
      particleCount: 90,
      startVelocity: 55,
      spread: 360,
      origin: { x: 0.5, y: 0.5 },
      colors: [...gray, '#ffd700', '#30d158'],
      shapes: ['star', 'square'],
      scalar: 1.1,
      gravity: 0.5,
      ticks: 350,
    });
  }, 500);
}
