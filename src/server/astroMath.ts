import type { HouseSystem } from '../types';

export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
] as const;

export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
  'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha',
  'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
] as const;

export const NAKSHATRA_SPAN = 360.0 / 27.0;
export const PADA_SPAN = NAKSHATRA_SPAN / 4.0;

export function norm(degrees: number): number {
  let r = degrees % 360.0;
  if (r < 0) r += 360.0;
  return r >= 360.0 ? 0.0 : r;
}

export function sign(longitude: number): number {
  return Math.min(11, Math.floor(norm(longitude) / 30.0));
}

export function house(longitude: number, ascendant: number, system: HouseSystem = 'WHOLE_SIGN'): number {
  if (system === 'EQUAL') {
    return Math.min(12, Math.floor(norm(longitude - ascendant) / 30.0) + 1);
  }
  return 1 + ((sign(longitude) - sign(ascendant) + 120) % 12);
}

export function divisionalSign(longitude: number, division: number): number {
  const lon = norm(longitude);
  const s = sign(lon);
  const withinSign = lon - s * 30.0;
  let part: number;
  let start: number;

  switch (division) {
    case 1:
      return s;
    case 2:
      part = Math.min(1, Math.floor(withinSign / 15.0));
      return s % 2 === 0 ? (part === 0 ? 4 : 3) : (part === 0 ? 3 : 4);
    case 3:
      part = segment(withinSign, 3) * 4;
      start = s;
      break;
    case 4:
      part = segment(withinSign, 4) * 3;
      start = s;
      break;
    case 7:
      part = segment(withinSign, 7);
      start = s + (s % 2 === 0 ? 0 : 6);
      break;
    case 9:
      part = segment(withinSign, 9);
      start = s % 3 === 0 ? s : s % 3 === 1 ? s + 8 : s + 4;
      break;
    case 10:
      part = segment(withinSign, 10);
      start = s + (s % 2 === 0 ? 0 : 8);
      break;
    case 12:
      part = segment(withinSign, 12);
      start = s;
      break;
    case 16:
      part = segment(withinSign, 16);
      start = s % 3 === 0 ? 0 : s % 3 === 1 ? 4 : 8;
      break;
    case 20:
      part = segment(withinSign, 20);
      start = s % 3 === 0 ? 0 : s % 3 === 1 ? 8 : 4;
      break;
    case 24:
      part = segment(withinSign, 24);
      start = s % 2 === 0 ? 4 : 3;
      break;
    case 27:
      part = segment(withinSign, 27);
      start = (s % 4) * 3;
      break;
    case 30:
      return trimsamsaSign(s, withinSign);
    case 40:
      part = segment(withinSign, 40);
      start = s % 2 === 0 ? 0 : 6;
      break;
    case 45:
      part = segment(withinSign, 45);
      start = s % 3 === 0 ? 0 : s % 3 === 1 ? 4 : 8;
      break;
    case 60:
      part = segment(withinSign, 60);
      start = s;
      break;
    default:
      throw new Error(`Unsupported divisional chart D${division}.`);
  }

  return (start + part + 120) % 12;
}

function segment(withinSign: number, division: number): number {
  return Math.min(division - 1, Math.floor((withinSign * division) / 30.0));
}

function trimsamsaSign(s: number, degree: number): number {
  const odd = s % 2 === 0;
  const limits = odd ? [5, 10, 18, 25, 30] : [5, 12, 20, 25, 30];
  const rulers = odd ? [0, 10, 8, 2, 6] : [1, 5, 11, 9, 7];
  for (let i = 0; i < limits.length; i++) {
    if (degree < limits[i]) return rulers[i];
  }
  return rulers[rulers.length - 1];
}

export function navamsaSign(longitude: number): number {
  return divisionalSign(longitude, 9);
}

export function signName(index: number): string {
  return SIGNS[(index + 120) % 12];
}

export function nakshatraIndex(longitude: number): number {
  return Math.min(26, Math.floor(norm(longitude) / NAKSHATRA_SPAN));
}

export function nakshatra(longitude: number): string {
  return NAKSHATRAS[nakshatraIndex(longitude)];
}

export function pada(longitude: number): number {
  const within = norm(longitude) - nakshatraIndex(longitude) * NAKSHATRA_SPAN;
  return Math.max(1, Math.min(4, Math.floor(within / PADA_SPAN) + 1));
}
