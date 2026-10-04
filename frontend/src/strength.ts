import type { Chart } from './types';

export const STRENGTH_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const;

// Sidereal longitude of each planet's deepest debilitation point.
const DEBILITATION: Record<string, number> = {
  Sun: 190, Moon: 213, Mars: 118, Mercury: 345, Jupiter: 275, Venus: 177, Saturn: 20,
};
// Angular distance from the Ascendant at which a planet has full directional strength.
const DIG_POINT: Record<string, number> = {
  Jupiter: 0, Mercury: 0, Moon: 90, Venus: 90, Saturn: 180, Sun: 270, Mars: 270,
};
const NAISARGIKA: Record<string, number> = {
  Sun: 60, Moon: 51.43, Venus: 42.85, Jupiter: 34.28, Mercury: 25.71, Mars: 17.14, Saturn: 8.57,
};

export interface PlanetStrength {
  name: string;
  uchcha: number;
  dig: number;
  naisargika: number;
  cheshta: number;
  total: number;
  max: number;
  percent: number;
  dignity: string | null;
  combust: boolean;
}

const arc = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** Simplified strength: Uchcha, Dig, Naisargika and a retrograde-based Cheshta (virupas, 0-60 each). */
export function planetStrengths(chart: Chart): PlanetStrength[] {
  return STRENGTH_PLANETS.flatMap((name) => {
    const p = chart.planets.find((x) => x.name === name);
    if (!p) return [];
    const uchcha = arc(p.longitude, DEBILITATION[name]) / 3;
    const bhava = (p.longitude - chart.ascendant.longitude + 360) % 360;
    const dig = (180 - arc(bhava, DIG_POINT[name])) / 3;
    const naisargika = NAISARGIKA[name];
    const luminary = name === 'Sun' || name === 'Moon';
    const cheshta = luminary ? 30 : p.retrograde ? 60 : 30;
    const total = uchcha + dig + naisargika + cheshta;
    const max = 60 + 60 + naisargika + 60;
    return [{
      name, uchcha, dig, naisargika, cheshta, total, max, percent: Math.round((total / max) * 100),
      dignity: p.dignity, combust: p.combust,
    }];
  });
}
