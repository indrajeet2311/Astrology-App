import type { Position, Yoga, Manglik } from '../types';
import { norm } from './astroMath';
import { signLord } from './dignity';

const SEVEN = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const;
const KAAL_SARP = [
  'Anant', 'Kulik', 'Vasuki', 'Shankhpal', 'Padma', 'Mahapadma',
  'Takshak', 'Karkotak', 'Shankhachur', 'Ghatak', 'Vishdhar', 'Sheshnag'
];
const MANGAL_HOUSES = new Set([1, 2, 4, 7, 8, 12]);

function ordinal(n: number): string {
  switch (n) {
    case 1: return '1st';
    case 2: return '2nd';
    case 3: return '3rd';
    default: return `${n}th`;
  }
}

function find(planets: Position[], name: string): Position {
  const p = planets.find((x) => x.name === name);
  if (!p) throw new Error(`Planet ${name} not found`);
  return p;
}

function relativeHouse(from: Position, to: Position): number {
  return ((to.signNumber - from.signNumber + 120) % 12) + 1;
}

function isKendra(h: number): boolean {
  return h === 1 || h === 4 || h === 7 || h === 10;
}

export function mangal(planets: Position[]): Manglik {
  const mars = find(planets, 'Mars');
  const moon = find(planets, 'Moon');
  const venus = find(planets, 'Venus');
  const factors: string[] = [];
  let sources = 0;

  const fromLagna = MANGAL_HOUSES.has(mars.house);
  if (fromLagna) {
    sources++;
    factors.push(`Mars is in the ${ordinal(mars.house)} house from the Ascendant.`);
  }

  const fromMoon = relativeHouse(moon, mars);
  if (MANGAL_HOUSES.has(fromMoon)) {
    sources++;
    factors.push(`Mars is in the ${ordinal(fromMoon)} house from the Moon.`);
  }

  const fromVenus = relativeHouse(venus, mars);
  if (MANGAL_HOUSES.has(fromVenus)) {
    sources++;
    factors.push(`Mars is in the ${ordinal(fromVenus)} house from Venus.`);
  }

  if (sources === 0) {
    return { present: false, level: 'None', factors: [], cancellations: [] };
  }

  const cancellations: string[] = [];
  if (mars.dignity === 'OWN' || mars.dignity === 'EXALTED') {
    cancellations.push('Mars is in its own or exalted sign.');
  }

  let placementException = false;
  switch (mars.house) {
    case 2: placementException = [3, 6].includes(mars.signNumber); break;
    case 4: placementException = [1, 8].includes(mars.signNumber); break;
    case 7: placementException = [4, 10].includes(mars.signNumber); break;
    case 8: placementException = [9, 12].includes(mars.signNumber); break;
    case 12: placementException = [2, 7].includes(mars.signNumber); break;
  }
  if (placementException) {
    cancellations.push('Mars sits in a sign where the dosha is classically cancelled for that house.');
  }

  const jupiter = find(planets, 'Jupiter');
  const jupToMars = relativeHouse(jupiter, mars);
  if (jupToMars === 1 || jupToMars === 5 || jupToMars === 7 || jupToMars === 9) {
    cancellations.push('Jupiter conjoins or aspects Mars.');
  }

  if (mars.signNumber === moon.signNumber) {
    cancellations.push('Mars is conjunct the Moon.');
  }

  const saturn = find(planets, 'Saturn');
  if (MANGAL_HOUSES.has(saturn.house) && fromLagna) {
    cancellations.push('Saturn also occupies a Mangal house, which is traditionally said to offset the dosha.');
  }

  const level: Manglik['level'] = cancellations.length > 0
    ? 'Cancelled'
    : sources >= 2 ? 'High' : fromLagna ? 'Medium' : 'Low';

  return { present: true, level, factors, cancellations };
}

export function addDoshas(yogas: Yoga[], ascendant: Position, planets: Position[]): void {
  kemadruma(yogas, ascendant, planets);
  neechaBhanga(yogas, ascendant, planets);
  parivartana(yogas, planets);
  kaalSarp(yogas, planets);
  pitraDosha(yogas, ascendant, planets);

  const m = mangal(planets);
  const mars = find(planets, 'Mars');
  if (m.present && !MANGAL_HOUSES.has(mars.house)) {
    yogas.push({
      name: 'Mangal Dosha (from Moon/Venus)',
      description: m.factors.join(' '),
      planets: ['Mars']
    });
  }
  if (m.present && m.cancellations.length > 0) {
    yogas.push({
      name: 'Mangal Dosha Bhanga (cancellation)',
      description: m.cancellations.join(' '),
      planets: ['Mars']
    });
  }
}

function kemadruma(yogas: Yoga[], ascendant: Position, planets: Position[]): void {
  const moon = find(planets, 'Moon');
  const support = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  for (const name of support) {
    const rel = relativeHouse(moon, find(planets, name));
    if (rel === 1 || rel === 2 || rel === 12) return;
  }
  let cancelled = false;
  for (const name of support) {
    const p = find(planets, name);
    if (isKendra(relativeHouse(moon, p)) || isKendra(relativeHouse(ascendant, p))) {
      cancelled = true;
    }
  }
  if (isKendra(relativeHouse(ascendant, moon))) cancelled = true;

  yogas.push({
    name: cancelled ? 'Kemadruma (cancelled)' : 'Kemadruma Yoga',
    description: 'No planet other than the Sun and nodes lies in the 2nd or 12th from, or with, the Moon.'
      + (cancelled ? ' A planet or the Moon in a kendra cancels it.' : ''),
    planets: ['Moon']
  });
}

function neechaBhanga(yogas: Yoga[], ascendant: Position, planets: Position[]): void {
  const moon = find(planets, 'Moon');
  for (const name of SEVEN) {
    const p = find(planets, name);
    if (p.dignity !== 'DEBILITATED') continue;
    const reasons: string[] = [];
    const debilitatedSign = p.signNumber - 1;
    const lordDeb = signLord(debilitatedSign);
    const lordExalt = signLord((debilitatedSign + 6) % 12);

    for (const [desc, lordName] of [
      ['lord of the debilitation sign', lordDeb],
      ['lord of the exaltation sign', lordExalt]
    ] as const) {
      const lord = find(planets, lordName);
      if (isKendra(relativeHouse(ascendant, lord)) || isKendra(relativeHouse(moon, lord))) {
        reasons.push(`The ${desc} (${lordName}) is in a kendra from the Ascendant or Moon.`);
      }
    }
    if (isKendra(relativeHouse(ascendant, p)) || isKendra(relativeHouse(moon, p))) {
      reasons.push(`${name} itself is in a kendra from the Ascendant or Moon.`);
    }
    if (reasons.length > 0) {
      yogas.push({
        name: `Neecha Bhanga Raja Yoga (${name})`,
        description: `${name} is debilitated, but the debilitation is cancelled. ${reasons.join(' ')}`,
        planets: [name]
      });
    }
  }
}

function parivartana(yogas: Yoga[], planets: Position[]): void {
  for (let i = 0; i < SEVEN.length; i++) {
    for (let j = i + 1; j < SEVEN.length; j++) {
      const a = find(planets, SEVEN[i]);
      const b = find(planets, SEVEN[j]);
      if (signLord(a.signNumber - 1) !== b.name) continue;
      if (signLord(b.signNumber - 1) !== a.name) continue;
      const dainya = [6, 8, 12].includes(a.house) || [6, 8, 12].includes(b.house);
      const khala = a.house === 3 || b.house === 3;
      const type = dainya ? 'Dainya' : khala ? 'Khala' : 'Maha';
      yogas.push({
        name: `${type} Parivartana Yoga`,
        description: `${a.name} and ${b.name} exchange signs (houses ${a.house} and ${b.house}).`,
        planets: [a.name, b.name]
      });
    }
  }
}

function kaalSarp(yogas: Yoga[], planets: Position[]): void {
  const rahu = find(planets, 'Rahu');
  let forward = true;
  let reverse = true;
  for (const name of SEVEN) {
    const d = norm(find(planets, name).longitude - rahu.longitude);
    if (d > 180) forward = false;
    if (d < 180) reverse = false;
  }
  if (!forward && !reverse) return;
  const kind = KAAL_SARP[rahu.house - 1];
  yogas.push({
    name: `Kaal Sarp Yoga (${kind})`,
    description: `All seven planets lie between Rahu and Ketu${forward ? ' (Rahu to Ketu).' : ' (Ketu to Rahu).'} Rahu is in the ${ordinal(rahu.house)} house.`,
    planets: ['Rahu', 'Ketu']
  });
}

function pitraDosha(yogas: Yoga[], ascendant: Position, planets: Position[]): void {
  const sun = find(planets, 'Sun');
  const rahu = find(planets, 'Rahu');
  const ketu = find(planets, 'Ketu');
  const factors: string[] = [];

  if (sun.signNumber === rahu.signNumber || sun.signNumber === ketu.signNumber) {
    factors.push('The Sun is conjunct a lunar node.');
  }
  if (rahu.house === 9 || ketu.house === 9) {
    factors.push('A lunar node occupies the 9th house.');
  }
  const ninthLord = signLord((ascendant.signNumber - 1 + 8) % 12);
  const lord = find(planets, ninthLord);
  if (lord.signNumber === rahu.signNumber || lord.signNumber === ketu.signNumber) {
    factors.push(`The 9th lord (${ninthLord}) is conjunct a lunar node.`);
  }
  if (sun.house === 9 && find(planets, 'Saturn').signNumber === sun.signNumber) {
    factors.push('The Sun and Saturn are together in the 9th house.');
  }
  if (factors.length > 0) {
    yogas.push({
      name: 'Pitra Dosha',
      description: factors.join(' '),
      planets: ['Sun', 'Rahu', 'Ketu']
    });
  }
}
