import confetti from 'canvas-confetti';
import { pulseEmojiCenter, spawnFloatingEmojis } from './core';

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
