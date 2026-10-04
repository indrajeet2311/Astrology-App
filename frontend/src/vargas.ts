import { SIGN_LORDS } from './constants';
import type { Chart, Position } from './types';

export const SEVEN = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const;
export type Seven = (typeof SEVEN)[number];

export type Relation = 'Own' | 'Adhi Mitra' | 'Mitra' | 'Sama' | 'Shatru' | 'Adhi Shatru';

const FRIENDS: Record<Seven, Seven[]> = {
  Sun: ['Moon', 'Mars', 'Jupiter'], Moon: ['Sun', 'Mercury'], Mars: ['Sun', 'Moon', 'Jupiter'],
  Mercury: ['Sun', 'Venus'], Jupiter: ['Sun', 'Moon', 'Mars'], Venus: ['Mercury', 'Saturn'],
  Saturn: ['Mercury', 'Venus'],
};
const ENEMIES: Record<Seven, Seven[]> = {
  Sun: ['Venus', 'Saturn'], Moon: [], Mars: ['Mercury'], Mercury: ['Moon'],
  Jupiter: ['Mercury', 'Venus'], Venus: ['Sun', 'Moon'], Saturn: ['Sun', 'Moon', 'Mars'],
};

/** Sign number (1-12) of the exaltation sign. */
export const EXALTATION_SIGN: Record<Seven, number> = {
  Sun: 1, Moon: 2, Mars: 10, Mercury: 6, Jupiter: 4, Venus: 12, Saturn: 7,
};
// Moolatrikona sign and the degree range inside it.
export const MOOLATRIKONA: Record<Seven, { sign: number; from: number; to: number }> = {
  Sun: { sign: 5, from: 0, to: 20 }, Moon: { sign: 2, from: 3, to: 30 }, Mars: { sign: 1, from: 0, to: 12 },
  Mercury: { sign: 6, from: 16, to: 20 }, Jupiter: { sign: 9, from: 0, to: 10 },
  Venus: { sign: 7, from: 0, to: 15 }, Saturn: { sign: 11, from: 0, to: 20 },
};

export const isSeven = (name: string): name is Seven => (SEVEN as readonly string[]).includes(name);

export type NaturalRelation = 'Friend' | 'Neutral' | 'Enemy';

/** Permanent (naisargika) friendship of planet a toward planet b. */
export function naturalRelation(a: Seven, b: Seven): NaturalRelation {
  return FRIENDS[a].includes(b) ? 'Friend' : ENEMIES[a].includes(b) ? 'Enemy' : 'Neutral';
}

const COMPOUND_CLASS: Record<Relation, NaturalRelation | 'Own'> = {
  Own: 'Own', 'Adhi Mitra': 'Friend', Mitra: 'Friend', Sama: 'Neutral', Shatru: 'Enemy', 'Adhi Shatru': 'Enemy',
};
const COMPOUND_LABEL: Record<Relation, string> = {
  Own: 'own sign', 'Adhi Mitra': 'great friend', Mitra: 'friend', Sama: 'neutral', Shatru: 'enemy', 'Adhi Shatru': 'great enemy',
};
const NATURAL_WORD: Record<NaturalRelation, string> = { Friend: 'friendly', Neutral: 'neutral', Enemy: 'hostile' };

export interface SignStatus {
  lord: Seven;
  natural: NaturalRelation;
  compound: Relation;
  /** True when temporary friendships move the combined (panchadha) status to another class. */
  differs: boolean;
  /** Sentence fragment, e.g. "in a friendly sign (Jupiter's)". */
  text: string;
  compoundLabel: string;
}

/** Friend/enemy standing of a planet in the sign it occupies; null for the nodes and for own, exalted or debilitated signs. */
export function signStatus(p: Position, relations: Record<Seven, Record<Seven, Relation>>): SignStatus | null {
  if (!isSeven(p.name) || p.dignity) return null;
  const lord = SIGN_LORDS[p.signNumber - 1] as Seven;
  if (lord === p.name) return null;
  const natural = naturalRelation(p.name, lord);
  const compound = relations[p.name][lord];
  const differs = COMPOUND_CLASS[compound] !== natural;
  const compoundLabel = COMPOUND_LABEL[compound];
  const text = `in a ${NATURAL_WORD[natural]} sign (${lord}'s)`
    + (differs ? `; with this chart's temporary friendships the combined status is ${compoundLabel}` : '');
  return { lord, natural, compound, differs, text, compoundLabel };
}

/** Panchadha (compound) relationship of each planet to every other, from natural and temporary friendship. */
export function compoundRelations(chart: Chart, division = 'D1'): Record<Seven, Record<Seven, Relation>> {
  const sign = (name: Seven) => {
    const p = chart.planets.find((planet) => planet.name === name)!;
    return p.divisionalSigns[division] ?? p.signNumber;
  };
  const result = {} as Record<Seven, Record<Seven, Relation>>;
  for (const a of SEVEN) {
    result[a] = {} as Record<Seven, Relation>;
    for (const b of SEVEN) {
      if (a === b) { result[a][b] = 'Own'; continue; }
      const natural = FRIENDS[a].includes(b) ? 1 : ENEMIES[a].includes(b) ? -1 : 0;
      const distance = ((sign(b) - sign(a) + 12) % 12) + 1;
      const temporary = [2, 3, 4, 10, 11, 12].includes(distance) ? 1 : -1;
      const score = natural + temporary;
      result[a][b] = score === 2 ? 'Adhi Mitra' : score === 1 ? 'Mitra' : score === 0 ? 'Sama'
        : score === -1 ? 'Shatru' : 'Adhi Shatru';
    }
  }
  return result;
}

/** Relationship of a planet placed in a sign to that sign's lord. */
export function signRelation(
  planet: Seven, signNumber: number, relations: Record<Seven, Record<Seven, Relation>>,
): Relation {
  const lord = SIGN_LORDS[signNumber - 1] as Seven;
  return lord === planet ? 'Own' : relations[planet][lord];
}

export function vargaSign(chart: Chart, planet: string, division: string): number {
  const p = chart.planets.find((x) => x.name === planet)!;
  return p.divisionalSigns[division] ?? p.signNumber;
}
