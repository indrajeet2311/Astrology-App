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
  md: string;
  ad: string;
  start: string;
  end: string;
  score: number;
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

export function occupants(ctx: Context, house: number): string[] {
  return ctx.chart.planets.filter((p) => p.house === house).map((p) => p.name);
}

export function aspectors(ctx: Context, house: number): string[] {
  return ctx.chart.aspects.filter((a) => a.houses.includes(house) && planet(ctx, a.planet).house !== house).map((a) => a.planet);
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
  return [0, ''];
}

function reasonFor(sigs: Sigs, lord: string, role: string): string | null {
  const s = sigs.get(lord);
  return s && s.weight >= 1.5 ? `${lord} (${role}): ${[...new Set(s.reasons)].slice(0, 3).join(', ')}` : null;
}

/** Scores every antardasha between `from` and `to` by how strongly its two lords carry the theme. */
export function scoreWindows(ctx: Context, sigs: Sigs, from: string, to: string, division?: string): Window[] {
  const out: Window[] = [];
  for (const md of ctx.chart.dashas) {
    for (const ad of md.antardashas) {
      const start = day(ad.start);
      const end = day(ad.end);
      if (end <= from || start >= to) continue;
      const [bonus, bonusReason] = link(ctx, md.lord, ad.lord);
      const score = 0.4 * sigScore(ctx, sigs, md.lord, division) + 0.6 * sigScore(ctx, sigs, ad.lord, division) + bonus;
      const reasons = [reasonFor(sigs, ad.lord, 'antardasha'), reasonFor(sigs, md.lord, 'mahadasha'), bonusReason]
        .filter((r): r is string => !!r);
      out.push({
        md: md.lord, ad: ad.lord, start, end, score, relative: 0, reasons, plain: '', peaks: [],
        past: end <= ctx.today, current: start <= ctx.today && ctx.today < end,
      });
    }
  }
  const best = Math.max(0.0001, ...out.map((w) => w.score));
  for (const w of out) w.relative = w.score / best;
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
export function targetSigns(ctx: Context, houses: number[]): number[] {
  const out = new Set<number>();
  for (const h of houses) {
    out.add(signOfHouse(ctx, h));
    out.add(signOfHouse(ctx, h, true));
    out.add(planet(ctx, lordOfHouse(ctx, h)).signNumber);
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

export function formatRange(start: string, end: string): string {
  const f = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  const a = f(start);
  const b = f(end);
  return a === b ? a : `${a} – ${b}`;
}

export function ageOn(chart: Chart, date: string): number {
  return Math.floor(daysBetween(chart.birthDetails.date, date) / 365.25);
}
