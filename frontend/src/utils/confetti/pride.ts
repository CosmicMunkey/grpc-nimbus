import { FLAG_COLORS, firePrideConfetti } from './core';

export const fireRainbowConfetti     = () => firePrideConfetti(FLAG_COLORS.rainbow);
export const fireProgressConfetti    = () => firePrideConfetti(FLAG_COLORS.progress);
export const fireLesbianConfetti     = () => firePrideConfetti(FLAG_COLORS.lesbian);
// @deprecated Use fireLesbianConfetti instead (this is a typo variant kept for backward compatibility)
export const fireLesibianConfetti    = fireLesbianConfetti;
export const fireTransConfetti       = () => firePrideConfetti(FLAG_COLORS.trans);
export const fireBisexualConfetti    = () => firePrideConfetti(FLAG_COLORS.bisexual);
export const firePansexualConfetti   = () => firePrideConfetti(FLAG_COLORS.pansexual);
export const fireNonbinaryConfetti   = () => firePrideConfetti(FLAG_COLORS.nonbinary);
export const fireAsexualConfetti     = () => firePrideConfetti(FLAG_COLORS.asexual);
export const fireGenderfluidConfetti = () => firePrideConfetti(FLAG_COLORS.genderfluid);
export const fireGenderqueerConfetti = () => firePrideConfetti(FLAG_COLORS.genderqueer);
export const fireAromanticConfetti   = () => firePrideConfetti(FLAG_COLORS.aromantic);
export const fireIntersexConfetti    = () => firePrideConfetti(FLAG_COLORS.intersex);
