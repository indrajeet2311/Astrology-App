import { norm } from './astroMath';

const EXALTATION: Record<string, number> = {
  Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6,
};

const OWN: Record<string, number[]> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5],
  Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
};

const COMBUST_ORB: Record<string, [number, number]> = {
  Moon: [12, 12], Mars: [17, 17], Mercury: [14, 12],
  Jupiter: [11, 11], Venus: [10, 8], Saturn: [15, 15],
};

const SIGN_LORD = [
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter',
] as const;

export function signLord(signIndex: number): string {
  return SIGN_LORD[(signIndex + 120) % 12];
}

export function dignity(body: string, signIndex: number): 'EXALTED' | 'DEBILITATED' | 'OWN' | null {
  const exalted = EXALTATION[body];
  if (exalted === undefined) return null;
  if (signIndex === exalted) return 'EXALTED';
  if (signIndex === (exalted + 6) % 12) return 'DEBILITATED';
  const ownSigns = OWN[body] || [];
  if (ownSigns.includes(signIndex)) return 'OWN';
  return null;
}

export function isCombust(body: string, longitude: number, retrograde: boolean, sunLongitude: number): boolean {
  const orb = COMBUST_ORB[body];
  if (!orb || isNaN(sunLongitude)) return false;
  const diff = Math.abs(norm(longitude) - norm(sunLongitude));
  const separation = Math.min(diff, 360.0 - diff);
  return separation <= orb[retrograde ? 1 : 0];
}
