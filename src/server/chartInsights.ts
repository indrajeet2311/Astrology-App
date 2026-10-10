import type { Position, Aspect, Yoga, SadeSati } from '../types';
import { signLord } from './dignity';
import { addDoshas } from './doshas';

const SPECIAL_ASPECTS: Record<string, number[]> = {
  Mars: [4, 8], Jupiter: [5, 9], Saturn: [3, 10],
};

const MAHAPURUSHA: Record<string, string> = {
  Mars: 'Ruchaka', Mercury: 'Bhadra', Jupiter: 'Hamsa', Venus: 'Malavya', Saturn: 'Shasha',
};

function ordinal(n: number): string {
  switch (n) {
    case 1: return '1st';
    case 2: return '2nd';
    case 3: return '3rd';
    default: return `${n}th`;
  }
}

function aspectedHouse(h: number, n: number): number {
  return ((h - 1 + n - 1) % 12) + 1;
}

export function aspects(planets: Position[]): Aspect[] {
  const result: Aspect[] = [];
  for (const p of planets) {
    const houses: number[] = [aspectedHouse(p.house, 7)];
    for (const n of SPECIAL_ASPECTS[p.name] || []) {
      houses.push(aspectedHouse(p.house, n));
    }
    houses.sort((a, b) => a - b);
    const targets = planets
      .filter((o) => o.name !== p.name && houses.includes(o.house))
      .map((o) => o.name);
    result.push({ planet: p.name, houses, planets: targets });
  }
  return result;
}

function find(planets: Position[], name: string): Position {
  const p = planets.find((x) => x.name === name);
  if (!p) throw new Error(`Planet ${name} not found`);
  return p;
}

function isKendra(h: number): boolean {
  return h === 1 || h === 4 || h === 7 || h === 10;
}

function isStrong(p: Position): boolean {
  return p.dignity === 'OWN' || p.dignity === 'EXALTED';
}

function lordOfHouse(ascendant: Position, h: number): string {
  return signLord((ascendant.signNumber - 1 + h - 1) % 12);
}

function pairYoga(
  yogas: Yoga[], seen: Set<string>, ascendant: Position, planets: Position[],
  h1: number, h2: number, name: string
): void {
  const l1 = lordOfHouse(ascendant, h1);
  const l2 = lordOfHouse(ascendant, h2);
  if (l1 === l2) return;
  const a = find(planets, l1);
  const b = find(planets, l2);
  const key = name + (l1 < l2 ? `${l1}/${l2}` : `${l2}/${l1}`);
  const lords = `(${l1} and ${l2})`;

  if (a.signNumber === b.signNumber) {
    if (!seen.has(key + 'c')) {
      seen.add(key + 'c');
      yogas.push({
        name,
        description: `The lords of the ${ordinal(h1)} and ${ordinal(h2)} houses ${lords} share a sign.`,
        planets: [l1, l2]
      });
    }
  } else if (a.house === h2 && b.house === h1) {
    if (!seen.has(key + 'e')) {
      seen.add(key + 'e');
      yogas.push({
        name: `${name} (Parivartana)`,
        description: `The lords of the ${ordinal(h1)} and ${ordinal(h2)} houses ${lords} exchange signs.`,
        planets: [l1, l2]
      });
    }
  }
}

export function yogas(ascendant: Position, planets: Position[]): Yoga[] {
  const yogasList: Yoga[] = [];
  const sun = find(planets, 'Sun');
  const moon = find(planets, 'Moon');
  const mars = find(planets, 'Mars');
  const mercury = find(planets, 'Mercury');
  const jupiter = find(planets, 'Jupiter');

  if (isKendra(((jupiter.house - moon.house + 120) % 12) + 1)) {
    yogasList.push({
      name: 'Gaja Kesari',
      description: 'Jupiter is in a kendra (1st, 4th, 7th or 10th) from the Moon.',
      planets: ['Jupiter', 'Moon']
    });
  }
  if (sun.signNumber === mercury.signNumber) {
    yogasList.push({
      name: 'Budhaditya',
      description: 'The Sun and Mercury share a sign.',
      planets: ['Sun', 'Mercury']
    });
  }
  if (moon.signNumber === mars.signNumber) {
    yogasList.push({
      name: 'Chandra-Mangal',
      description: 'The Moon and Mars share a sign.',
      planets: ['Moon', 'Mars']
    });
  }

  for (const p of planets) {
    const maha = MAHAPURUSHA[p.name];
    if (maha && isKendra(p.house) && (p.dignity === 'OWN' || p.dignity === 'EXALTED')) {
      yogasList.push({
        name: `${maha} (Pancha Mahapurusha)`,
        description: `${p.name} is in its own or exalted sign and in a kendra from the Ascendant.`,
        planets: [p.name]
      });
    }
  }

  const seen = new Set<string>();
  const rajaPairs: [number, number][] = [
    [4, 5], [4, 9], [7, 5], [7, 9], [10, 5], [10, 9],
    [1, 4], [1, 5], [1, 7], [1, 9], [1, 10]
  ];
  for (const [p1, p2] of rajaPairs) {
    const name = p1 === 10 && p2 === 9 ? 'Dharma-Karmadhipati Yoga' : 'Raja Yoga';
    pairYoga(yogasList, seen, ascendant, planets, p1, p2, name);
  }

  const dhanaPairs: [number, number][] = [
    [2, 11], [2, 5], [2, 9], [2, 10], [5, 11], [9, 11], [1, 2], [1, 11], [5, 9]
  ];
  for (const [p1, p2] of dhanaPairs) {
    pairYoga(yogasList, seen, ascendant, planets, p1, p2, 'Dhana Yoga');
  }

  const dusthana = [6, 8, 12];
  for (const h of dusthana) {
    const lord = lordOfHouse(ascendant, h);
    const p = find(planets, lord);
    if ([6, 8, 12].includes(p.house) && !seen.has('vip' + lord)) {
      seen.add('vip' + lord);
      yogasList.push({
        name: 'Viparita Raja Yoga',
        description: `The ${ordinal(h)} lord (${lord}) sits in the ${ordinal(p.house)} house, a dusthana.`,
        planets: [lord]
      });
    }
  }

  const ninth = lordOfHouse(ascendant, 9);
  const lagnaLord = lordOfHouse(ascendant, 1);
  const ninthPos = find(planets, ninth);
  if (isStrong(ninthPos) && isKendra(ninthPos.house) && isStrong(find(planets, lagnaLord))) {
    yogasList.push({
      name: 'Lakshmi Yoga',
      description: `The 9th lord (${ninth}) is strong in a kendra and the Ascendant lord (${lagnaLord}) is in its own or exalted sign.`,
      planets: [ninth, lagnaLord]
    });
  }

  for (const p of planets) {
    if (p.name === 'Jupiter' && (p.house === 2 || p.house === 11)) {
      yogasList.push({
        name: 'Dhana Yoga',
        description: `Jupiter, the planet of wealth, occupies the ${ordinal(p.house)} house.`,
        planets: ['Jupiter']
      });
    }
  }

  if ([1, 2, 4, 7, 8, 12].includes(mars.house)) {
    yogasList.push({
      name: 'Mangal Dosha',
      description: `Mars is in the ${ordinal(mars.house)} house from the Ascendant.`,
      planets: ['Mars']
    });
  }

  addDoshas(yogasList, ascendant, planets);
  return yogasList;
}

export function sadeSati(moonSign: number, saturnSign: number): SadeSati {
  const diff = ((saturnSign - moonSign + 120) % 12);
  switch (diff) {
    case 11:
      return { active: true, phase: 'Rising', description: 'Saturn is in the sign before your Moon sign (first phase).' };
    case 0:
      return { active: true, phase: 'Peak', description: 'Saturn is transiting your Moon sign (middle phase).' };
    case 1:
      return { active: true, phase: 'Setting', description: 'Saturn is in the sign after your Moon sign (last phase).' };
    default:
      return { active: false, phase: null, description: 'Saturn is not within one sign of your Moon sign.' };
  }
}
