import React from 'react';
import {
  fireRainbowConfetti, fireProgressConfetti, fireLesbianConfetti,
  fireTransConfetti, fireBisexualConfetti, firePansexualConfetti,
  fireNonbinaryConfetti, fireAsexualConfetti, fireGenderfluidConfetti,
  fireGenderqueerConfetti, fireAromanticConfetti, fireIntersexConfetti,
  fireChristmasConfetti, fireHanukkahConfetti, fireNewYearConfetti,
  fireValentineConfetti, fireStPatricksConfetti, fireEasterConfetti,
  fireJuly4Confetti, fireHalloweenConfetti, fireThanksgivingConfetti,
  fireDiwaliConfetti,
  fireCatRunnerConfetti, fireDogConfetti, fireFoxConfetti,
  fireOctopusConfetti, fireBeeConfetti, firePenguinConfetti,
  fireSunConfetti, fireMoonConfetti, fireCloudConfetti, fireLightningStormConfetti,
  fireRocketConfetti, firePlanetConfetti, fireStarsConfetti, fireCometConfetti, fireUfoSweepConfetti,
  fireCoffeeSteamConfetti, firePizzaConfetti, fireDonutConfetti, fireRamenConfetti, fireTacoConfetti,
  fireRobotConfetti, fireGamepadConfetti, fireJoystickConfetti, firePixelHeartConfetti, fireSparklesTrailConfetti,
  fireNyanCatConfetti, fireDogeConfetti, fireTrollfaceConfetti, fireAmongUsConfetti,
  firePartyParrotConfetti, fireRickrollConfetti, fireThisIsFineConfetti,
} from './confetti';

export const BADGE_CONFIG: Record<string, { title: string; fire: () => void; icon: React.ReactNode }> = {
  rainbow: {
    title: '🌈',
    fire: fireRainbowConfetti,
    icon: <span className="text-base leading-none select-none">🌈</span>,
  },
  progress: {
    title: 'Progress Pride',
    fire: fireProgressConfetti,
    icon: (
      <svg width="22" height="15" viewBox="0 0 22 15" style={{ display: 'block', borderRadius: 2 }}>
        <rect y="0"     width="22" height="2.5"  fill="#e40303"/>
        <rect y="2.5"   width="22" height="2.5"  fill="#ff8c00"/>
        <rect y="5"     width="22" height="2.5"  fill="#ffed00"/>
        <rect y="7.5"   width="22" height="2.5"  fill="#008026"/>
        <rect y="10"    width="22" height="2.5"  fill="#004dff"/>
        <rect y="12.5"  width="22" height="2.5"  fill="#750787"/>
        <polygon points="0,0 7.5,7.5 0,15"   fill="#000000"/>
        <polygon points="0,0 6.2,7.5 0,15"   fill="#784f17"/>
        <polygon points="0,0 4.9,7.5 0,15"   fill="#ffffff"/>
        <polygon points="0,0 3.6,7.5 0,15"   fill="#ffafc8"/>
        <polygon points="0,0 2.3,7.5 0,15"   fill="#74d7ee"/>
      </svg>
    ),
  },
  lesbian: {
    title: 'Lesbian Pride',
    fire: fireLesbianConfetti,
    icon: (
      <svg width="22" height="15" viewBox="0 0 22 15" style={{ display: 'block', borderRadius: 2 }}>
        <rect y="0"  width="22" height="3" fill="#d52d00"/>
        <rect y="3"  width="22" height="3" fill="#ff9a56"/>
        <rect y="6"  width="22" height="3" fill="#ffffff"/>
        <rect y="9"  width="22" height="3" fill="#d362a4"/>
        <rect y="12" width="22" height="3" fill="#a50062"/>
      </svg>
    ),
  },
  trans: {
    title: 'Trans Pride',
    fire: fireTransConfetti,
    icon: (
      <svg width="22" height="15" viewBox="0 0 22 15" style={{ display: 'block', borderRadius: 2 }}>
        <rect y="0"  width="22" height="3" fill="#74d7ee"/>
        <rect y="3"  width="22" height="3" fill="#ffafc8"/>
        <rect y="6"  width="22" height="3" fill="#ffffff"/>
        <rect y="9"  width="22" height="3" fill="#ffafc8"/>
        <rect y="12" width="22" height="3" fill="#74d7ee"/>
      </svg>
    ),
  },
  bisexual: {
    title: 'Bisexual Pride',
    fire: fireBisexualConfetti,
    icon: (
      <svg width="22" height="15" viewBox="0 0 22 15" style={{ display: 'block', borderRadius: 2 }}>
        <rect y="0"  width="22" height="6"  fill="#d60270"/>
        <rect y="6"  width="22" height="3"  fill="#9b4f96"/>
        <rect y="9"  width="22" height="6"  fill="#0038a8"/>
      </svg>
    ),
  },
  pansexual: {
    title: 'Pansexual Pride',
    fire: firePansexualConfetti,
    icon: (
      <svg width="22" height="15" viewBox="0 0 22 15" style={{ display: 'block', borderRadius: 2 }}>
        <rect y="0"  width="22" height="5" fill="#ff218c"/>
        <rect y="5"  width="22" height="5" fill="#ffd800"/>
        <rect y="10" width="22" height="5" fill="#21b1ff"/>
      </svg>
    ),
  },
  nonbinary: {
    title: 'Non-binary Pride',
    fire: fireNonbinaryConfetti,
    icon: (
      <svg width="22" height="16" viewBox="0 0 22 16" style={{ display: 'block', borderRadius: 2 }}>
        <rect y="0"  width="22" height="4" fill="#fcf434"/>
        <rect y="4"  width="22" height="4" fill="#ffffff"/>
        <rect y="8"  width="22" height="4" fill="#9c59d1"/>
        <rect y="12" width="22" height="4" fill="#2d2d2d"/>
      </svg>
    ),
  },
  asexual: {
    title: 'Asexual Pride',
    fire: fireAsexualConfetti,
    icon: (
      <svg width="22" height="16" viewBox="0 0 22 16" style={{ display: 'block', borderRadius: 2 }}>
        <rect y="0"  width="22" height="4" fill="#000000"/>
        <rect y="4"  width="22" height="4" fill="#a4a4a4"/>
        <rect y="8"  width="22" height="4" fill="#ffffff"/>
        <rect y="12" width="22" height="4" fill="#810081"/>
      </svg>
    ),
  },
  genderfluid: {
    title: 'Genderfluid Pride',
    fire: fireGenderfluidConfetti,
    icon: (
      <svg width="22" height="15" viewBox="0 0 22 15" style={{ display: 'block', borderRadius: 2 }}>
        <rect y="0"  width="22" height="3" fill="#ff76a4"/>
        <rect y="3"  width="22" height="3" fill="#ffffff"/>
        <rect y="6"  width="22" height="3" fill="#c011d7"/>
        <rect y="9"  width="22" height="3" fill="#000000"/>
        <rect y="12" width="22" height="3" fill="#2c2ecc"/>
      </svg>
    ),
  },
  genderqueer: {
    title: 'Genderqueer Pride',
    fire: fireGenderqueerConfetti,
    icon: (
      <svg width="22" height="15" viewBox="0 0 22 15" style={{ display: 'block', borderRadius: 2 }}>
        <rect y="0"  width="22" height="5" fill="#b77fdd"/>
        <rect y="5"  width="22" height="5" fill="#ffffff"/>
        <rect y="10" width="22" height="5" fill="#49821e"/>
      </svg>
    ),
  },
  aromantic: {
    title: 'Aromantic Pride',
    fire: fireAromanticConfetti,
    icon: (
      <svg width="22" height="15" viewBox="0 0 22 15" style={{ display: 'block', borderRadius: 2 }}>
        <rect y="0"  width="22" height="3" fill="#3da542"/>
        <rect y="3"  width="22" height="3" fill="#a8d47a"/>
        <rect y="6"  width="22" height="3" fill="#ffffff"/>
        <rect y="9"  width="22" height="3" fill="#a9a9a9"/>
        <rect y="12" width="22" height="3" fill="#000000"/>
      </svg>
    ),
  },
  intersex: {
    title: 'Intersex Pride',
    fire: fireIntersexConfetti,
    icon: (
      <svg width="22" height="15" viewBox="0 0 22 15" style={{ display: 'block', borderRadius: 2 }}>
        <rect width="22" height="15" fill="#ffd800"/>
        <circle cx="11" cy="7.5" r="5" fill="none" stroke="#7902aa" strokeWidth="2"/>
      </svg>
    ),
  },
  xmas: {
    title: 'Christmas',
    fire: fireChristmasConfetti,
    icon: <span className="text-xl leading-none select-none">🎄</span>,
  },
  hanukkah: {
    title: 'Hanukkah',
    fire: fireHanukkahConfetti,
    icon: <span className="text-xl leading-none select-none">🕎</span>,
  },
  newyear: {
    title: "New Year's",
    fire: fireNewYearConfetti,
    icon: <span className="text-xl leading-none select-none">✨</span>,
  },
  valentine: {
    title: "Valentine's Day",
    fire: fireValentineConfetti,
    icon: <span className="text-xl leading-none select-none">❤️</span>,
  },
  stpatricks: {
    title: "St. Patrick's Day",
    fire: fireStPatricksConfetti,
    icon: <span className="text-xl leading-none select-none">🍀</span>,
  },
  easter: {
    title: 'Easter',
    fire: fireEasterConfetti,
    icon: <span className="text-xl leading-none select-none">🐣</span>,
  },
  july4: {
    title: '4th of July',
    fire: fireJuly4Confetti,
    icon: <span className="text-xl leading-none select-none">🎆</span>,
  },
  halloween: {
    title: 'Halloween',
    fire: fireHalloweenConfetti,
    icon: <span className="text-xl leading-none select-none">🎃</span>,
  },
  thanksgiving: {
    title: 'Thanksgiving',
    fire: fireThanksgivingConfetti,
    icon: <span className="text-xl leading-none select-none">🦃</span>,
  },
  diwali: {
    title: 'Diwali',
    fire: fireDiwaliConfetti,
    icon: <span className="text-xl leading-none select-none">🪔</span>,
  },
  cat: {
    title: 'Cat',
    fire: fireCatRunnerConfetti,
    icon: <span className="text-xl leading-none select-none">🐱</span>,
  },
  dog: {
    title: 'Dog',
    fire: fireDogConfetti,
    icon: <span className="text-xl leading-none select-none">🐶</span>,
  },
  fox: {
    title: 'Fox',
    fire: fireFoxConfetti,
    icon: <span className="text-xl leading-none select-none">🦊</span>,
  },
  octopus: {
    title: 'Octopus',
    fire: fireOctopusConfetti,
    icon: <span className="text-xl leading-none select-none">🐙</span>,
  },
  bee: {
    title: 'Bee',
    fire: fireBeeConfetti,
    icon: <span className="text-xl leading-none select-none">🐝</span>,
  },
  penguin: {
    title: 'Penguin',
    fire: firePenguinConfetti,
    icon: <span className="text-xl leading-none select-none">🐧</span>,
  },
  sun: {
    title: 'Sun',
    fire: fireSunConfetti,
    icon: <span className="text-xl leading-none select-none">☀️</span>,
  },
  moon: {
    title: 'Moon',
    fire: fireMoonConfetti,
    icon: <span className="text-xl leading-none select-none">🌙</span>,
  },
  cloud: {
    title: 'Cloud',
    fire: fireCloudConfetti,
    icon: <span className="text-xl leading-none select-none">☁️</span>,
  },
  lightning: {
    title: 'Lightning',
    fire: fireLightningStormConfetti,
    icon: <span className="text-xl leading-none select-none">⚡</span>,
  },
  rocket: {
    title: 'Rocket',
    fire: fireRocketConfetti,
    icon: <span className="text-xl leading-none select-none">🚀</span>,
  },
  planet: {
    title: 'Planet',
    fire: firePlanetConfetti,
    icon: <span className="text-xl leading-none select-none">🪐</span>,
  },
  stars: {
    title: 'Stars',
    fire: fireStarsConfetti,
    icon: <span className="text-xl leading-none select-none">🌟</span>,
  },
  comet: {
    title: 'Comet',
    fire: fireCometConfetti,
    icon: <span className="text-xl leading-none select-none">☄️</span>,
  },
  ufo: {
    title: 'UFO',
    fire: fireUfoSweepConfetti,
    icon: <span className="text-xl leading-none select-none">🛸</span>,
  },
  coffee: {
    title: 'Coffee',
    fire: fireCoffeeSteamConfetti,
    icon: <span className="text-xl leading-none select-none">☕</span>,
  },
  pizza: {
    title: 'Pizza',
    fire: firePizzaConfetti,
    icon: <span className="text-xl leading-none select-none">🍕</span>,
  },
  donut: {
    title: 'Donut',
    fire: fireDonutConfetti,
    icon: <span className="text-xl leading-none select-none">🍩</span>,
  },
  ramen: {
    title: 'Ramen',
    fire: fireRamenConfetti,
    icon: <span className="text-xl leading-none select-none">🍜</span>,
  },
  taco: {
    title: 'Taco',
    fire: fireTacoConfetti,
    icon: <span className="text-xl leading-none select-none">🌮</span>,
  },
  robot: {
    title: 'Robot',
    fire: fireRobotConfetti,
    icon: <span className="text-xl leading-none select-none">🤖</span>,
  },
  gamepad: {
    title: 'Gamepad',
    fire: fireGamepadConfetti,
    icon: <span className="text-xl leading-none select-none">🎮</span>,
  },
  joystick: {
    title: 'Joystick',
    fire: fireJoystickConfetti,
    icon: <span className="text-xl leading-none select-none">🕹️</span>,
  },
  pixelheart: {
    title: 'Pixel Heart',
    fire: firePixelHeartConfetti,
    icon: <span className="text-xl leading-none select-none">🧡</span>,
  },
  sparkles: {
    title: 'Sparkles',
    fire: fireSparklesTrailConfetti,
    icon: <span className="text-xl leading-none select-none">✨</span>,
  },
  nyancat: {
    title: 'Nyan Cat',
    fire: fireNyanCatConfetti,
    icon: <span className="text-xl leading-none select-none">🌈</span>,
  },
  doge: {
    title: 'Doge',
    fire: fireDogeConfetti,
    icon: <span className="text-xl leading-none select-none">🐕</span>,
  },
  trollface: {
    title: 'Trollface',
    fire: fireTrollfaceConfetti,
    icon: <span className="text-xl leading-none select-none">😈</span>,
  },
  amongus: {
    title: 'Among Us',
    fire: fireAmongUsConfetti,
    icon: <span className="text-xl leading-none select-none">🔴</span>,
  },
  partyparrot: {
    title: 'Party Parrot',
    fire: firePartyParrotConfetti,
    icon: <span className="text-xl leading-none select-none">🦜</span>,
  },
  rickroll: {
    title: 'Rickroll',
    fire: fireRickrollConfetti,
    icon: <span className="text-xl leading-none select-none">🎵</span>,
  },
  thisisfine: {
    title: 'This Is Fine',
    fire: fireThisIsFineConfetti,
    icon: <span className="text-xl leading-none select-none">🔥</span>,
  },
};
