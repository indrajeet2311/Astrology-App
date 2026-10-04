import { compoundRelations, EXALTATION_SIGN, isSeven, signRelation } from './vargas';
import type { Seven } from './vargas';
import type { Chart, Position } from './types';

export interface Avastha {
  name: string;
  baladi: { state: string; effect: string };
  jagradadi: { state: string; effect: string } | null;
}

const BALADI = [
  { state: 'Bala (infant)', effect: 'About a quarter of its results' },
  { state: 'Kumara (youth)', effect: 'About half of its results' },
  { state: 'Yuva (adult)', effect: 'Full results' },
  { state: 'Vriddha (old)', effect: 'Little result' },
  { state: 'Mrita (dead)', effect: 'Almost no result' },
];

/** Baladi age states by 6-degree portions (reversed in even signs) and Jagradadi wakefulness by sign dignity. */
export function avasthas(chart: Chart): Avastha[] {
  const relations = compoundRelations(chart);
  return chart.planets.map((p) => {
    const part = Math.min(4, Math.floor(p.degreeInSign / 6));
    const baladi = BALADI[p.signNumber % 2 === 1 ? part : 4 - part];
    let jagradadi: Avastha['jagradadi'] = null;
    if (isSeven(p.name)) {
      const name: Seven = p.name;
      const relation = p.signNumber === EXALTATION_SIGN[name] ? 'Own' : signRelation(name, p.signNumber, relations);
      const debilitated = p.dignity === 'DEBILITATED';
      jagradadi = relation === 'Own' && !debilitated
        ? { state: 'Jagrat (awake)', effect: 'Own or exalted sign: results come fully.' }
        : debilitated || relation === 'Shatru' || relation === 'Adhi Shatru'
          ? { state: 'Sushupti (asleep)', effect: 'Enemy or debilitated sign: results are weak.' }
          : { state: 'Swapna (dreaming)', effect: 'Friendly or neutral sign: results are moderate.' };
    }
    return { name: p.name, baladi, jagradadi };
  });
}

export interface Gandanta {
  name: string;
  junction: string;
  distance: number;
  severity: 'Severe' | 'Moderate' | 'Mild';
}

const JUNCTIONS: Record<number, { junction: string; end: boolean }> = {
  4: { junction: 'Ashlesha–Magha (Cancer–Leo)', end: true },
  5: { junction: 'Ashlesha–Magha (Cancer–Leo)', end: false },
  8: { junction: 'Jyeshtha–Mula (Scorpio–Sagittarius)', end: true },
  9: { junction: 'Jyeshtha–Mula (Scorpio–Sagittarius)', end: false },
  12: { junction: 'Revati–Ashwini (Pisces–Aries)', end: true },
  1: { junction: 'Revati–Ashwini (Pisces–Aries)', end: false },
};
const GANDANTA_SPAN = 10 / 3;

/** Bodies within 3°20′ either side of a water-fire sign junction. */
export function gandantas(chart: Chart): Gandanta[] {
  const bodies: Position[] = [chart.ascendant, ...chart.planets];
  return bodies.flatMap((p) => {
    const j = JUNCTIONS[p.signNumber];
    if (!j) return [];
    const distance = j.end ? 30 - p.degreeInSign : p.degreeInSign;
    if (distance >= GANDANTA_SPAN) return [];
    const severity = distance < GANDANTA_SPAN / 3 ? 'Severe' : distance < (2 * GANDANTA_SPAN) / 3 ? 'Moderate' : 'Mild';
    return [{ name: p.name, junction: j.junction, distance, severity }];
  });
}
