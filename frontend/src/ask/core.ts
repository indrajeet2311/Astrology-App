import { SIGN_LORDS, SIGN_NAMES } from '../constants';
import { todayIso } from '../format';
import { arudhaPadas, charaKarakas } from '../jaimini';
import { shadbala } from '../shadbala';
import { jaiminiYogas } from '../jaiminiYogas';
import type { JaiminiYoga } from '../jaiminiYogas';
import { EXALTATION_SIGN, compoundRelations, isSeven, signRelation } from '../vargas';
import type { Relation, Seven } from '../vargas';
import type { ArudhaPada, Karaka } from '../jaimini';
import type { Chart, Position } from '../types';
import type { SlowTransits } from './transitTypes';

export type Tone = 'good' | 'bad' | 'neutral';

export interface Evidence {
  text: string;
  tone: Tone;
}

export interface Peak {
  start: string;
  end: string;
  note: string;
}

export interface Window {
  system: 'Vimshottari' | 'Yogini' | 'Chara';
  md: string;
  ad: string;
  mdPlanet: string;
  adPlanet: string;
  start: string;
  end: string;
  score: number;
  confluence?: number;
  activationScore?: number;
  convergence?: { start: string; end: string; systems: Window['system'][] }[];
  /** Score relative to the best window in the same horizon (0-1). */
  relative: number;
  reasons: string[];
  /** Everyday-language explanation of why this period matters. */
  plain: string;
  peaks: Peak[];
  past: boolean;
  current: boolean;
}

export interface Context {
  chart: Chart;
  today: string;
  /** Shadbala ratio per planet (1 = meets the classical minimum). */
  strength: Record<string, number>;
  padas: ArudhaPada[];
  karakas: Karaka[];
  relations: Record<Seven, Record<Seven, Relation>>;
  jaimini: JaiminiYoga[];
  transits: SlowTransits | null;
}

export function makeContext(chart: Chart, transits: SlowTransits | null): Context {
  const strength: Record<string, number> = {};
  for (const s of shadbala(chart)) strength[s.name] = s.ratio;
  return {
    chart, today: todayIso(), strength, padas: arudhaPadas(chart), karakas: charaKarakas(chart),
    relations: compoundRelations(chart), jaimini: jaiminiYogas(chart), transits,
  };
}

export const BENEFICS = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
export const MALEFICS = ['Saturn', 'Mars', 'Sun', 'Rahu', 'Ketu'];

export const ordinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);
export const signName = (n: number) => SIGN_NAMES[n - 1];

/** Plain-language personality flavour of each sign (Aries..Pisces), used to translate placements into everyday meaning. */
export const SIGN_TRAITS = [
  'energetic, independent and direct', 'steady, sensual and value-minded', 'communicative, curious and youthful',
  'caring, emotional and home-loving', 'warm, proud and generous', 'practical, analytical and service-minded',
  'charming, balanced and partnership-oriented', 'intense, private and loyal', 'spontaneous, free-spirited and philosophical',
  'disciplined, ambitious and reserved', 'unconventional, friendly and independent-minded', 'gentle, imaginative and compassionate',
];

export function planet(ctx: Context, name: string): Position {
  return ctx.chart.planets.find((p) => p.name === name)!;
}

export function signOfHouse(ctx: Context, house: number, fromMoon = false): number {
  const base = fromMoon ? planet(ctx, 'Moon').signNumber : ctx.chart.ascendant.signNumber;
  return ((base - 1 + house - 1) % 12) + 1;
}

export function lordOfHouse(ctx: Context, house: number): string {
  return SIGN_LORDS[signOfHouse(ctx, house) - 1];
}

export function housesRuledBy(ctx: Context, name: string): number[] {
  return SIGN_LORDS.flatMap((lord, sign) => lord === name
    ? [((sign + 1 - ctx.chart.ascendant.signNumber + 12) % 12) + 1] : []);
}

export function functionalNature(ctx: Context, name: string): 'benefic' | 'malefic' | 'yogakaraka' | 'mixed' {
  const houses = housesRuledBy(ctx, name);
  const hasTrikona = houses.some((h) => [5, 9].includes(h));
  const hasKendra = houses.some((h) => [4, 7, 10].includes(h));
  const hasDifficult = houses.some((h) => [6, 8, 11].includes(h));
  if (hasTrikona && hasKendra && !hasDifficult) return 'yogakaraka';
  if (hasDifficult && hasTrikona) return 'mixed';
  if (hasDifficult) return 'malefic';
  if (hasTrikona || houses.includes(1)) return 'benefic';
  return 'mixed';
}

export function occupants(ctx: Context, house: number): string[] {
  return ctx.chart.planets.filter((p) => p.house === house).map((p) => p.name);
}

export function aspectors(ctx: Context, house: number): string[] {
  return ctx.chart.aspects.filter((a) => !['Rahu', 'Ketu'].includes(a.planet)
    && a.houses.includes(house) && planet(ctx, a.planet).house !== house).map((a) => a.planet);
}

export function houseKartari(ctx: Context, house: number): { kind: 'Paap Kartari' | 'Subha Kartari' | 'None'; planets: string[] } {
  const before = house === 1 ? 12 : house - 1;
  const after = house === 12 ? 1 : house + 1;
  const left = occupants(ctx, before);
  const right = occupants(ctx, after);
  const malefics = [...MALEFICS];
  const leftMalefics = left.filter((n) => malefics.includes(n));
  const rightMalefics = right.filter((n) => malefics.includes(n));
  if (leftMalefics.length && rightMalefics.length) return { kind: 'Paap Kartari', planets: [...leftMalefics, ...rightMalefics] };
  const leftBenefics = left.filter((n) => BENEFICS.includes(n as typeof BENEFICS[number]));
  const rightBenefics = right.filter((n) => BENEFICS.includes(n as typeof BENEFICS[number]));
  if (leftBenefics.length && rightBenefics.length) return { kind: 'Subha Kartari', planets: [...leftBenefics, ...rightBenefics] };
  return { kind: 'None', planets: [...left, ...right] };
}

export function strengthFactor(ctx: Context, name: string): number {
  const p = planet(ctx, name);
  const ratio = ctx.strength[name];
  let factor = ratio === undefined ? 1 : Math.min(1.25, Math.max(0.85, 0.75 + 0.25 * ratio));
  if (p.dignity === 'EXALTED' || p.dignity === 'OWN') factor *= 1.1;
  if (p.dignity === 'DEBILITATED' && !hasNeechaBhanga(ctx, name)) factor *= 0.85;
  if (p.combust) factor *= 0.9;
  return factor;
}

export function hasNeechaBhanga(ctx: Context, name: string): boolean {
  return ctx.chart.yogas.some((y) => y.name.startsWith('Neecha Bhanga') && y.name.includes(`(${name})`));
}

// ------------------------------------------------------------------ divisional charts

/** Sign (1-12) a planet or the Ascendant occupies in a divisional chart such as D9 or D10. */
export function vargaSign(ctx: Context, name: string, division: string): number {
  const p = name === 'Ascendant' ? ctx.chart.ascendant : planet(ctx, name);
  return p.divisionalSigns[division] ?? p.signNumber;
}

export function vargaHouseSign(ctx: Context, division: string, house: number): number {
  return ((vargaSign(ctx, 'Ascendant', division) - 1 + house - 1) % 12) + 1;
}

export function vargaLord(ctx: Context, division: string, house: number): string {
  return SIGN_LORDS[vargaHouseSign(ctx, division, house) - 1];
}

export function vargaHouseOf(ctx: Context, name: string, division: string): number {
  return ((vargaSign(ctx, name, division) - vargaSign(ctx, 'Ascendant', division) + 12) % 12) + 1;
}

export function vargaOccupants(ctx: Context, division: string, house: number): string[] {
  return ctx.chart.planets.filter((p) => vargaHouseOf(ctx, p.name, division) === house).map((p) => p.name);
}

export function vargaAspectors(ctx: Context, division: string, house: number): string[] {
  return ctx.chart.planets.filter((p) => !['Rahu', 'Ketu'].includes(p.name) && p.name !== 'Ascendant')
    .filter((p) => {
      const source = vargaHouseOf(ctx, p.name, division);
      const distance = ((house - source + 12) % 12) + 1;
      return distance === 7 || (p.name === 'Mars' && [4, 8].includes(distance))
        || (p.name === 'Jupiter' && [5, 9].includes(distance))
        || (p.name === 'Saturn' && [3, 10].includes(distance));
    }).map((p) => p.name);
}

/** Dignity of a planet in a divisional chart: Exalted, Own, Debilitated or its compound relation to the sign lord. */
export function vargaStatus(ctx: Context, name: string, division: string): Relation | 'Exalted' | 'Debilitated' | 'Node' {
  if (!isSeven(name)) return 'Node';
  const sign = vargaSign(ctx, name, division);
  if (sign === EXALTATION_SIGN[name]) return 'Exalted';
  if (sign === ((EXALTATION_SIGN[name] + 5) % 12) + 1) return 'Debilitated';
  return signRelation(name, sign, ctx.relations);
}

export function vargottama(ctx: Context, name: string, division: string): boolean {
  const p = name === 'Ascendant' ? ctx.chart.ascendant : planet(ctx, name);
  return p.signNumber === vargaSign(ctx, name, division);
}

const VARGA_FACTOR: Record<string, number> = {
  Exalted: 1.15, Own: 1.15, 'Adhi Mitra': 1.08, Mitra: 1.04, Sama: 1, Shatru: 0.92, 'Adhi Shatru': 0.85, Debilitated: 0.85, Node: 1,
};

/** Multiplier for how well a planet stands in the divisional chart that rules a theme. */
export function vargaFactor(ctx: Context, name: string, division?: string): number {
  return division ? VARGA_FACTOR[vargaStatus(ctx, name, division)] : 1;
}

/** Significators drawn from a divisional chart: the lord and occupants of its key houses. */
export function vargaExtras(ctx: Context, division: string, houses: number[], label: string): [string, number, string][] {
  const out: [string, number, string][] = [];
  for (const h of houses) {
    out.push([vargaLord(ctx, division, h), 2, `lord of the ${label} ${ordinal(h)}`]);
    for (const o of vargaOccupants(ctx, division, h)) out.push([o, 1, `in the ${label} ${ordinal(h)}`]);
  }
  return out;
}

// ------------------------------------------------------------------ significators

export interface SigSpec {
  primary: number[];
  secondary: number[];
  karakas: [string, number][];
  extras?: [string, number, string][];
}

export type Sigs = Map<string, { weight: number; reasons: string[] }>;

function add(map: Sigs, name: string, weight: number, reason: string) {
  const entry = map.get(name) ?? { weight: 0, reasons: [] };
  entry.weight += weight;
  entry.reasons.push(reason);
  map.set(name, entry);
}

/** Planets that carry a theme: lords and occupants of its houses, aspecting planets and natural karakas. */
export function significators(ctx: Context, spec: SigSpec): Sigs {
  const map: Sigs = new Map();
  for (const h of spec.primary) {
    add(map, lordOfHouse(ctx, h), 3, `lord of the ${ordinal(h)}`);
    for (const o of occupants(ctx, h)) add(map, o, 2, `in the ${ordinal(h)}`);
    for (const a of aspectors(ctx, h)) add(map, a, 1, `aspects the ${ordinal(h)}`);
  }
  for (const h of spec.secondary) {
    add(map, lordOfHouse(ctx, h), 1.5, `lord of the ${ordinal(h)}`);
    for (const o of occupants(ctx, h)) add(map, o, 1, `in the ${ordinal(h)}`);
  }
  for (const [name, weight] of spec.karakas) add(map, name, weight, 'natural significator');
  for (const [name, weight, reason] of spec.extras ?? []) add(map, name, weight, reason);
  // The nodes act through the lord of the sign they occupy.
  for (const node of ['Rahu', 'Ketu']) {
    const lord = SIGN_LORDS[planet(ctx, node).signNumber - 1];
    const lordWeight = map.get(lord)?.weight;
    if (lordWeight) add(map, node, 0.5 * lordWeight, `acts for ${lord}, lord of its sign`);
  }
  return map;
}

export const sigScore = (ctx: Context, sigs: Sigs, name: string, division?: string) =>
  (sigs.get(name)?.weight ?? 0) * strengthFactor(ctx, name) * vargaFactor(ctx, name, division);

// ------------------------------------------------------------------ dasha windows

const day = (s: string) => s.slice(0, 10);
const sameSign = (ctx: Context, a: string, b: string) => planet(ctx, a).signNumber === planet(ctx, b).signNumber;

function link(ctx: Context, a: string, b: string): [number, string] {
  if (a === b) return [0, ''];
  const pa = planet(ctx, a).signNumber;
  const pb = planet(ctx, b).signNumber;
  if (SIGN_LORDS[pa - 1] === b && SIGN_LORDS[pb - 1] === a) return [1.5, `${a} and ${b} exchange signs`];
  if (sameSign(ctx, a, b)) return [1, `${a} and ${b} sit together`];
  if (Math.abs(pa - pb) === 6) return [0.7, `${a} and ${b} face each other`];
  if (aspectors(ctx, planet(ctx, b).house).includes(a) || aspectors(ctx, planet(ctx, a).house).includes(b)) {
    return [0.7, `${a} and ${b} are linked by a Parashari aspect`];
  }
  return [0, ''];
}

function reasonFor(sigs: Sigs, lord: string, role: string): string | null {
  const s = sigs.get(lord);
  return s && s.weight >= 1.5 ? `${lord} (${role}): ${[...new Set(s.reasons)].slice(0, 3).join(', ')}` : null;
}

function periodCondition(ctx: Context, name: string, division?: string): [number, string[]] {
  const position = planet(ctx, name);
  const reasons: string[] = [];
  let adjustment = 0;
  reasons.push(`${name}: D1 ${position.sign}, house ${position.house}, ${position.dignity ?? 'no exaltation/own/debilitation status'}; functionally ${functionalNature(ctx, name)}`);
  if (ctx.strength[name] !== undefined) reasons.push(`${name} Shadbala ratio ${ctx.strength[name].toFixed(2)} (1 meets the classical minimum)`);
  if (position.dignity === 'DEBILITATED') {
    adjustment -= hasNeechaBhanga(ctx, name) ? 2 : 4;
    reasons.push(`${name} is debilitated${hasNeechaBhanga(ctx, name) ? ' with mitigating Neecha Bhanga, not full restoration' : ''}`);
  }
  if (position.combust) { adjustment -= 3; reasons.push(`${name} is combust`); }
  if ([6, 8, 12].includes(position.house)) {
    adjustment -= 2;
    reasons.push(`${name} occupies D1 house ${position.house}, requiring care`);
  }
  const companions = occupants(ctx, position.house).filter((other) => other !== name);
  const influences = [...new Set([...companions, ...aspectors(ctx, position.house).filter((other) => other !== name)])];
  for (const other of influences) {
    const nature = functionalNature(ctx, other);
    adjustment += nature === 'malefic' ? -1 : nature === 'benefic' || nature === 'yogakaraka' ? 1 : 0;
  }
  if (influences.length) reasons.push(`${name} receives D1 conjunction/aspect influences from ${influences.join(', ')}`);
  if (division) {
    const status = vargaStatus(ctx, name, division);
    const house = vargaHouseOf(ctx, name, division);
    adjustment += ['Exalted', 'Own'].includes(status) ? 2 : ['Debilitated', 'Adhi Shatru', 'Shatru'].includes(status) ? -2 : 0;
    if ([6, 8, 12].includes(house)) adjustment -= 2;
    reasons.push(`${name} in ${division}: ${status}, house ${house}`);
    const sources = [...new Set([...vargaAspectors(ctx, division, house), ...vargaOccupants(ctx, division, house)])].filter((other) => other !== name);
    for (const other of sources) {
      const nature = functionalNature(ctx, other);
      adjustment += nature === 'malefic' ? -1 : nature === 'benefic' || nature === 'yogakaraka' ? 1 : 0;
    }
    if (sources.length) reasons.push(`${division} conjunction/aspect influences to ${name}: ${sources.join(', ')}`);
  }
  return [Math.max(-8, Math.min(4, adjustment)), reasons];
}

function charaActivation(ctx: Context, sign: number, division: string | undefined, houses: number[]): [number, string[]] {
  const profile = division === 'D9' ? ['DK', 7] as const : division === 'D10' ? ['AmK', 10] as const
    : division === 'D4' ? ['MK', 4] as const : division === 'D20' ? ['AK', 9] as const : ['AK', 1] as const;
  const karaka = ctx.karakas.find((item) => item.code === profile[0]);
  const reasons: string[] = [];
  let points = 0;
  if (karaka) {
    const anchor = karaka.planet.signNumber;
    const derived = ((anchor + profile[1] - 2) % 12) + 1;
    if (sign === anchor) { points += 5; reasons.push(`Chara sign contains ${profile[0]} ${karaka.planet.name}`); }
    if (sign === derived) { points += 5; reasons.push(`Chara sign is ${ordinal(profile[1])} from ${profile[0]} ${karaka.planet.name}`); }
    if (division) {
      const vargaAnchor = vargaSign(ctx, karaka.planet.name, division);
      const vargaDerived = ((vargaAnchor + profile[1] - 2) % 12) + 1;
      if (sign === vargaAnchor || sign === vargaDerived) {
        points += 2;
        reasons.push(`Chara sign matches ${profile[0]} or ${ordinal(profile[1])} from it in ${division} (secondary corroboration)`);
      }
    }
  }
  for (const house of houses) {
    if (sign === signOfHouse(ctx, house)) { points += 3; reasons.push(`Chara sign activates the D1 ${ordinal(house)} house`); }
    if (division && sign === vargaHouseSign(ctx, division, house)) {
      points += 2;
      reasons.push(`Chara sign matches the ${division} ${ordinal(house)} house`);
    }
  }
  return [Math.min(10, points), reasons];
}

/** Scores every antardasha between `from` and `to` by how strongly its two lords carry the theme. */
export function scoreWindows(ctx: Context, sigs: Sigs, from: string, to: string, division?: string, houses: number[] = []): Window[] {
  const out: Window[] = [];
  const systems = [
    ['Vimshottari', ctx.chart.dashas],
    ['Yogini', ctx.chart.yoginiDashas],
    ['Chara', ctx.chart.charaDashas],
  ] as const;
  const yoginiPlanets: Record<string, string> = {
    Mangala: 'Moon', Pingala: 'Sun', Dhanya: 'Jupiter', Bhramari: 'Mars',
    Bhadrika: 'Mercury', Ulka: 'Saturn', Siddha: 'Venus', Sankata: 'Rahu',
  };
  const scoringLord = (lord: string, system: Window['system']) => system === 'Chara'
    ? SIGN_LORDS[SIGN_NAMES.indexOf(lord as (typeof SIGN_NAMES)[number])]
    : system === 'Yogini' ? yoginiPlanets[lord] : lord;
  for (const [system, dashas] of systems) {
    for (const md of dashas) {
      const mdPlanet = scoringLord(md.lord, system);
      if (!mdPlanet) continue;
      for (const ad of md.antardashas) {
        const adPlanet = scoringLord(ad.lord, system);
        if (!adPlanet) continue;
      const start = day(ad.start);
      const end = day(ad.end);
      if (end <= from || start >= to) continue;
      const [bonus, bonusReason] = link(ctx, mdPlanet, adPlanet);
      const mdSign = SIGN_NAMES.indexOf(md.lord) + 1;
      const adSign = SIGN_NAMES.indexOf(ad.lord) + 1;
      const [mdActivation, mdSignReasons] = system === 'Chara' ? charaActivation(ctx, mdSign, division, houses) : [0, []];
      const [adActivation, adSignReasons] = system === 'Chara' ? charaActivation(ctx, adSign, division, houses) : [0, []];
      if (!sigs.has(mdPlanet) && !sigs.has(adPlanet) && !mdActivation && !adActivation) continue;
      const mdWeight = sigScore(ctx, sigs, mdPlanet, division);
      const adWeight = sigScore(ctx, sigs, adPlanet, division);
      const maxWeight = Math.max(1, ...[...sigs.keys()].map((name) => sigScore(ctx, sigs, name, division)));
      const relevance = (0.4 * mdWeight + 0.6 * adWeight) / maxWeight;
      const [mdCondition, mdDetails] = periodCondition(ctx, mdPlanet, division);
      const [adCondition, adDetails] = periodCondition(ctx, adPlanet, division);
      const distance = ((planet(ctx, adPlanet).signNumber - planet(ctx, mdPlanet).signNumber + 12) % 12) + 1;
      const reverse = ((planet(ctx, mdPlanet).signNumber - planet(ctx, adPlanet).signNumber + 12) % 12) + 1;
      const friction = [6, 8, 12].includes(distance) || [6, 8, 12].includes(reverse);
      const divisionalDistance = division ? ((vargaSign(ctx, adPlanet, division) - vargaSign(ctx, mdPlanet, division) + 12) % 12) + 1 : 1;
      const divisionalReverse = division ? ((vargaSign(ctx, mdPlanet, division) - vargaSign(ctx, adPlanet, division) + 12) % 12) + 1 : 1;
      const divisionalFriction = [6, 8, 12].includes(divisionalDistance) || [6, 8, 12].includes(divisionalReverse);
      const activationScore = Math.max(5, Math.min(95, Math.round(20 + 60 * relevance + bonus * 4
        + (system === 'Chara' ? 0.4 * mdActivation + 0.6 * adActivation : 0) * 2
        + 0.4 * mdCondition + 0.6 * adCondition - (friction ? 4 : 0) - (divisionalFriction ? 2 : 0))));
      const score = activationScore;
      const reasons = [reasonFor(sigs, adPlanet, 'antardasha'), reasonFor(sigs, mdPlanet, 'mahadasha'), bonusReason,
        ...mdSignReasons, ...adSignReasons, ...mdDetails, ...adDetails,
        friction ? `MD–AD planets have a ${distance}/${reverse} sign relationship; activation may require effort` : '',
        division ? `MD–AD planets in ${division}: ${divisionalDistance}/${divisionalReverse} sign relationship${divisionalFriction ? ', a separate caution' : ''}` : '',
        !sigs.has(mdPlanet) ? 'The main lord has limited direct topic relevance; the sub-period/sign link supplies activation' : '']
        .filter((r): r is string => !!r);
      out.push({
        system, md: md.lord, ad: ad.lord, mdPlanet, adPlanet, start, end, score, activationScore, relative: 0, confluence: 1, convergence: [], reasons: [...new Set(reasons)], plain: '', peaks: [],
        past: end <= ctx.today, current: start <= ctx.today && ctx.today < end,
      });
      }
    }
  }
  for (const window of out) {
    const start = window.start > from ? window.start : from;
    const end = window.end < to ? window.end : to;
    const candidates = out.filter((other) => (other.activationScore ?? 0) >= 55 && other.start < end && other.end > start);
    const points = [...new Set([start, end, ...candidates.flatMap((other) => [other.start, other.end]).filter((date) => date > start && date < end)])].sort();
    for (let index = 0; index + 1 < points.length; index++) {
      const systems = [...new Set(candidates.filter((other) => other.start <= points[index] && other.end >= points[index + 1]).map((other) => other.system))];
      if ((window.activationScore ?? 0) < 55 || !systems.includes(window.system) || systems.length < 2) continue;
      const last = window.convergence![window.convergence!.length - 1];
      if (last && last.end === points[index] && last.systems.join(',') === systems.join(',')) last.end = points[index + 1];
      else window.convergence!.push({ start: points[index], end: points[index + 1], systems });
    }
    window.convergence = window.convergence!.filter((interval) => daysBetween(interval.start, interval.end) >= 30);
    window.confluence = Math.max(1, ...window.convergence.map((interval) => interval.systems.length));
    window.score += 2 * (window.confluence - 1);
  }
  for (const w of out) w.relative = (w.activationScore ?? 0) / 100;
  return out;
}

export function topWindows(windows: Window[], count: number, minRelative: number): Window[] {
  return [...windows]
    .filter((w) => w.relative >= minRelative && w.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function rating(relative: number): string {
  return relative >= 0.8 ? 'Strong' : relative >= 0.55 ? 'Good' : 'Moderate';
}

// ------------------------------------------------------------------ transit confirmation

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const JUPITER_REACH = [0, 4, 6, 8]; // conjunction and 5th, 7th, 9th aspects
const SATURN_REACH = [0, 2, 6, 9]; // conjunction and 3rd, 7th, 10th aspects

/** Signs that stand for a theme: its houses from the Ascendant and the Moon, and where their lords sit. */
export function targetSigns(ctx: Context, houses: number[], division?: string): number[] {
  const out = new Set<number>();
  for (const h of houses) {
    out.add(signOfHouse(ctx, h));
    out.add(signOfHouse(ctx, h, true));
    out.add(planet(ctx, lordOfHouse(ctx, h)).signNumber);
  }
  const divisionalHouses = division === 'D9' ? [1, 5, 7]
    : division === 'D10' ? [1, 10, 11]
      : division === 'D4' ? [1, 4, 11]
        : division === 'D7' ? [1, 5, 7]
          : division === 'D24' ? [1, 4, 5]
            : division === 'D20' ? [1, 5, 9, 12]
              : division === 'D30' ? [1, 6, 8]
            : [];
  if (division) {
    for (const house of divisionalHouses) {
      out.add(vargaHouseSign(ctx, division, house));
      out.add(vargaSign(ctx, vargaLord(ctx, division, house), division));
    }
  }
  return [...out];
}

function signAt(segments: { signNumber: number; start: string; end: string }[], date: string): number | null {
  return segments.find((s) => s.start <= date && date < s.end)?.signNumber ?? null;
}

type PairTest = (jupiter: number, saturn: number, rahu: number) => boolean;

/** Date ranges within [from, to) where the test holds for the slow planets' positions. */
export function transitIntervals(ctx: Context, test: PairTest, from: string, to: string): [string, string][] {
  const t = ctx.transits;
  if (!t) return [];
  const track = (name: string) => t.tracks.find((x) => x.name === name)?.segments ?? [];
  const jupiter = track('Jupiter');
  const saturn = track('Saturn');
  const rahu = track('Rahu');
  const points = new Set<string>([from, to]);
  for (const s of [...jupiter, ...saturn, ...rahu]) {
    if (s.start > from && s.start < to) points.add(s.start);
  }
  const sorted = [...points].sort();
  const result: [string, string][] = [];
  for (let i = 0; i + 1 < sorted.length; i++) {
    const a = sorted[i];
    const j = signAt(jupiter, a);
    const s = signAt(saturn, a);
    const r = signAt(rahu, a);
    if (j === null || s === null || r === null || !test(j, s, r)) continue;
    const last = result[result.length - 1];
    if (last && last[1] === a) last[1] = sorted[i + 1];
    else result.push([a, sorted[i + 1]]);
  }
  return result;
}

export function doubleTransit(targets: number[]): PairTest {
  return (j, s) => targets.some((tg) => JUPITER_REACH.includes(mod12(tg - j)) && SATURN_REACH.includes(mod12(tg - s)));
}

export function saturnPressure(targets: number[]): PairTest {
  return (_j, s, r) => targets.some((tg) => SATURN_REACH.includes(mod12(tg - s)) || mod12(tg - r) === 0 || mod12(tg - r) === 6);
}

const daysBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000;

/** Marks the parts of each window where the transit test also holds. */
export function addPeaks(windows: Window[], intervals: [string, string][], note: string, minDays = 20) {
  for (const w of windows) {
    for (const [a, b] of intervals) {
      const start = a > w.start ? a : w.start;
      const end = b < w.end ? b : w.end;
      if (start < end && daysBetween(start, end) >= minDays) w.peaks.push({ start, end, note });
    }
  }
}

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
  'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha',
  'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];
const TARA_NAMES = ['Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyari', 'Sadhaka', 'Naidhana', 'Mitra', 'Ati-Mitra'];
const TARA_TONES = ['sensitive', 'supportive', 'effortful', 'supportive', 'effortful', 'supportive', 'challenging', 'supportive', 'supportive'];

/** Adds Moon-based Navatara notes only when transit nakshatra data is available. */
export function addNavataraPeaks(ctx: Context, windows: Window[], minDays = 20) {
  const moonIndex = NAKSHATRAS.indexOf(planet(ctx, 'Moon').nakshatra);
  if (moonIndex < 0 || !ctx.transits) return;
  for (const track of ctx.transits.tracks) {
    for (const segment of track.segments) {
      if (segment.nakshatraIndex === undefined) continue;
      const taraIndex = ((segment.nakshatraIndex - moonIndex + 27) % 27) % 9;
      for (const window of windows) {
        const start = segment.start > window.start ? segment.start : window.start;
        const end = segment.end < window.end ? segment.end : window.end;
        if (start >= end || daysBetween(start, end) < minDays) continue;
        window.peaks.push({
          start, end,
          note: `Navatara: ${track.name} in ${TARA_NAMES[taraIndex]} Tara (${TARA_TONES[taraIndex]})`,
        });
      }
    }
  }
}

export function formatRange(start: string, end: string): string {
  const f = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  const a = f(start);
  const b = f(end);
  return a === b ? a : `${a} – ${b}`;
}

export function ageOn(chart: Chart, date: string): number {
  return Math.floor(daysBetween(chart.birthDetails.date, date) / 365.25);
}
