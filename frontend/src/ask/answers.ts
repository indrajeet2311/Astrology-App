import { SIGN_LORDS } from '../constants';
import { rashiAspects } from '../jaiminiYogas';
import { signStatus } from '../vargas';
import type { JaiminiYoga } from '../jaiminiYogas';
import { assessHouse, assessPlanetInfluences, assessVarga, blend, houseFactorSummary, placementComfort, STATUS_TEXT, verdictFor } from './assess';
import type { Assessment, Verdict } from './assess';
import {
  addNavataraPeaks, addPeaks, aspectors, doubleTransit, formatRange, lordOfHouse, occupants, ordinal, planet, saturnPressure,
  scoreWindows, signName, signOfHouse, significators, targetSigns, topWindows, transitIntervals, vargaExtras, vargaHouseOf,
  vargaHouseSign, vargaLord, vargaOccupants, vargaSign, vargaStatus, vargottama, functionalNature, MALEFICS, hasNeechaBhanga, houseKartari,
} from './core';
import type { Context, Evidence, SigSpec, Sigs, Window } from './core';

export type DomainId = 'marriage' | 'relationship' | 'career' | 'property' | 'spiritual' | 'health';
export type Focus = 'timing' | 'nature' | 'riseFall' | 'general';

const PRIMARY_HOUSES: Record<DomainId, number[]> = {
  marriage: [7], relationship: [5, 7], career: [10], property: [4], spiritual: [9, 12], health: [1, 6],
};

export interface WindowGroup {
  title: string;
  blurb: string;
  tone: 'good' | 'caution';
  windows: Window[];
}

export interface Answer {
  domain: DomainId;
  domainLabel: string;
  question: string;
  focus: Focus;
  headline: string;
  verdict: Verdict;
  score: number;
  /** The answer in everyday words. */
  plain: string[];
  natureTitle: string;
  nature: string[];
  jaimini: JaiminiYoga[];
  vargaNote: string;
  groups: WindowGroup[];
  /** The astrological reasoning, for readers who want it. */
  technical: string[];
  evidence: Evidence[];
  notes: string[];
  transitsUsed: boolean;
}

export const SIGN_TRAITS = [
  'energetic, independent and direct', 'steady, sensual and value-minded', 'communicative, curious and youthful',
  'caring, emotional and home-loving', 'warm, proud and generous', 'practical, analytical and service-minded',
  'charming, balanced and partnership-oriented', 'intense, private and loyal', 'optimistic, freedom-loving and philosophical',
  'disciplined, ambitious and reserved', 'unconventional, friendly and independent-minded', 'gentle, imaginative and compassionate',
];
export const HOUSE_THEME: Record<number, string> = {
  1: 'your own initiative', 2: 'family circles and finances', 3: 'communication, short trips and siblings',
  4: 'home, family and emotional security', 5: 'romance, creativity and friendships', 6: 'work, service or daily routine',
  7: 'direct one-to-one meetings', 8: 'sudden or unusual circumstances', 9: 'higher learning, travel, teachers or faith',
  10: 'work and public life', 11: 'friends, networks and gatherings', 12: 'foreign places, retreats or distant settings',
};
const HOUSE_MEANING: Record<number, string> = {
  1: 'self and health', 2: 'family and money', 3: 'courage and communication', 4: 'home and property',
  5: 'romance and creativity', 6: 'work and service', 7: 'marriage and partnerships', 8: 'sudden change and hidden matters',
  9: 'luck, higher learning and faith', 10: 'career and public life', 11: 'gains and friendships', 12: 'foreign lands, rest and letting go',
};
const PLANET_FIELDS: Record<string, string> = {
  Sun: 'government, administration, leadership or medicine', Moon: 'public-facing, caring, hospitality or food fields',
  Mars: 'engineering, defence, sports, surgery or real estate', Mercury: 'communication, commerce, technology or analysis',
  Jupiter: 'teaching, law, advisory, finance or counselling', Venus: 'arts, design, luxury, media or entertainment',
  Saturn: 'operations, industry, construction, research or long-haul service', Rahu: 'technology, foreign dealings or unconventional work',
  Ketu: 'research, healing, technical or spiritual work',
};
const BODY_AREA = [
  'head and brain', 'throat, neck and thyroid', 'arms, lungs and nerves', 'chest, stomach and breasts',
  'heart, spine and back', 'digestion and intestines', 'kidneys and lower back', 'reproductive and excretory organs',
  'hips, thighs and liver', 'knees, bones and joints', 'calves, ankles and circulation', 'feet, sleep and immunity',
];
const PLANET_BODY: Record<string, string> = {
  Sun: 'heart, vitality and bones', Moon: 'fluids, digestion and emotional balance', Mars: 'blood, muscles, inflammation and accidents',
  Mercury: 'nerves, skin and breathing', Jupiter: 'liver, weight and metabolism', Venus: 'kidneys, hormones and throat',
  Saturn: 'joints, teeth, bones and chronic conditions', Rahu: 'allergies, toxins and hard-to-diagnose issues',
  Ketu: 'immunity and sudden, hard-to-trace issues',
};

const addYears = (date: string, years: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
};
const later = (a: string, b: string) => (a > b ? a : b);

function linked(ctx: Context, a: string, b: string): boolean {
  if (a === b) return false;
  const pa = planet(ctx, a).signNumber;
  const pb = planet(ctx, b).signNumber;
  const exchange = SIGN_LORDS[pa - 1] === b && SIGN_LORDS[pb - 1] === a;
  return pa === pb || exchange || Math.abs(pa - pb) === 6;
}

function dignityNote(ctx: Context, name: string): string {
  const p = planet(ctx, name);
  if (p.dignity === 'EXALTED') return 'exalted';
  if (p.dignity === 'DEBILITATED') return 'debilitated';
  if (p.dignity === 'OWN') return 'in its own sign';
  return signStatus(p, ctx.relations)?.text ?? `in ${p.sign}`;
}

function signDistance(from: number, to: number): number {
  return ((to - from + 12) % 12) + 1;
}

function interchartRead(ctx: Context, domain: DomainId): { adjustment: number; evidence: Evidence[]; summary: string } {
  const focus = {
    marriage: [lordOfHouse(ctx, 7), 'Venus', 'Jupiter'],
    relationship: [lordOfHouse(ctx, 5), lordOfHouse(ctx, 7), 'Venus', 'Moon'],
    career: [lordOfHouse(ctx, 10), lordOfHouse(ctx, 4), 'Saturn', 'Sun', 'Mercury'],
    property: [lordOfHouse(ctx, 4), lordOfHouse(ctx, 11), 'Mars', 'Venus', 'Moon'],
    spiritual: [lordOfHouse(ctx, 9), lordOfHouse(ctx, 12), 'Jupiter', 'Ketu'],
    health: [lordOfHouse(ctx, 1), lordOfHouse(ctx, 6), 'Sun', 'Moon'],
  }[domain];
  const plan = PLANS[domain];
  const planets = [...new Set([...focus, ...plan.houses.map((house) => vargaLord(ctx, plan.division, house)), ...(plan.karaka ? [plan.karaka] : [])])];
  const difficult = new Set([6, 8, 12]);
  const shifts: string[] = [];
  const karaka = (code: string) => ctx.karakas.find((item) => item.code === code)?.planet.name;
  const jaiminiPairs = ({
    marriage: [[karaka('AK'), karaka('DK')!, 'Atmakaraka–Darakaraka'], [karaka('DK'), lordOfHouse(ctx, 7), 'Darakaraka–7th lord']],
    relationship: [[karaka('AK'), karaka('DK')!, 'Atmakaraka–Darakaraka'], [karaka('DK'), lordOfHouse(ctx, 5), 'Darakaraka–5th lord']],
    career: [[karaka('AK'), karaka('AmK')!, 'Atmakaraka–Amatyakaraka'], [karaka('AmK'), lordOfHouse(ctx, 10), 'Amatyakaraka–10th lord']],
    property: [[karaka('MK'), lordOfHouse(ctx, 4), 'Matrikaraka–4th lord']],
    spiritual: [[karaka('AK'), 'Ketu', 'Atmakaraka–Ketu'], [karaka('AK'), lordOfHouse(ctx, 9), 'Atmakaraka–9th lord']],
    health: [[karaka('MK'), 'Moon', 'Matrikaraka–Moon'], [karaka('AK'), lordOfHouse(ctx, 1), 'Atmakaraka–Ascendant lord']],
  } satisfies Record<DomainId, [string | undefined, string, string][]>)[domain];
  const jaiminiLinks = jaiminiPairs.flatMap(([a, b, label]) => {
    if (!a || a === b) return [];
    const aSign = planet(ctx, a).signNumber;
    const bSign = planet(ctx, b).signNumber;
    return aSign === bSign || rashiAspects(aSign, bSign)
      ? [`${label}: ${a} in ${signName(aSign)} ${aSign === bSign ? 'conjoins' : 'has Jaimini rashi drishti to'} ${b} in ${signName(bSign)}`]
      : [];
  });
  const evidence: Evidence[] = ctx.chart.planets.map((natal) => {
    const name = natal.name;
    const navamsa = vargaSign(ctx, name, 'D9');
    const moved = signDistance(natal.signNumber, navamsa);
    const house = vargaHouseOf(ctx, name, 'D9');
    const comfort = placementComfort(house, vargaStatus(ctx, name, 'D9'), MALEFICS.includes(name));
    const shifted = moved === 1 ? 'remains in the same sign' : 'moves to the ' + ordinal(moved) + ' sign from its D1 sign';
    if (difficult.has(moved)) shifts.push(`${name} moves ${moved} signs D1 ${natal.sign} → D9 ${signName(navamsa)}`);
    return {
      text: `${name}${planets.includes(name) ? ' (topic indicator)' : ' (chart-wide context)'}: D1 ${natal.sign}, house ${natal.house}, ${dignityNote(ctx, name)}; D9 ${signName(navamsa)} (${shifted}; D9 house ${house})${difficult.has(moved) ? ', a 6th/8th/12th D1-to-D9 shift to weigh carefully' : ''}; ${STATUS_TEXT[vargaStatus(ctx, name, 'D9')]}; ${comfort}.`,
      tone: difficult.has(moved) ? 'bad' : ['Exalted', 'Own', 'Adhi Mitra', 'Mitra'].includes(vargaStatus(ctx, name, 'D9')) ? 'good' : 'neutral',
    };
  });
  evidence.push(...[...new Map(ctx.chart.planets.flatMap((position) => [
    ...assessPlanetInfluences(ctx, position.name).evidence,
    ...assessPlanetInfluences(ctx, position.name, 'D9').evidence,
  ]).map((item) => [item.text, item])).values()]);
  let challengedPairs = 0;
  const relations: string[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const a = planets[i], b = planets[j];
      const d1 = signDistance(planet(ctx, a).signNumber, planet(ctx, b).signNumber);
      const d9 = signDistance(vargaSign(ctx, a, 'D9'), vargaSign(ctx, b, 'D9'));
      const d1Issue = difficult.has(d1);
      const d9Issue = difficult.has(d9);
      if (!d1Issue && !d9Issue) continue;
      challengedPairs++;
      relations.push(`${a} and ${b}: D1 ${d1}th, D9 ${d9}th`);
    }
  }
  if (shifts.length) {
    evidence.push({
      text: `Planets moving 6/8/12 signs from their own D1 sign to D9: ${shifts.join('; ')}. This is a caution about how each planet carries its promise into Navamsa, not a denial by itself.`,
      tone: 'bad',
    });
  } else {
    evidence.push({ text: 'None of the nine grahas moves 6, 8 or 12 signs from its own D1 sign to D9; absence of this pattern is not by itself a positive promise.', tone: 'neutral' });
  }
  evidence.push({
    text: jaiminiLinks.length
      ? `Jaimini sign connections relevant to ${domain}: ${jaiminiLinks.join('; ')}. Treat these as supporting links, weighed with the full chart.`
      : `No direct Jaimini sign connection was found among the selected ${domain} karakas and house lords.`,
    tone: jaiminiLinks.length ? 'good' : 'neutral',
  });
  if (relations.length) {
    evidence.push({
      text: `6/8/12 relationships among key indicators: ${relations.slice(0, 6).join('; ')}. These are areas of friction to weigh against dignity, house strength and cancellation; they do not by themselves deny the outcome.`,
      tone: 'bad',
    });
  } else {
    evidence.push({ text: 'The selected lords and karakas do not form 6/8/12 sign relationships with one another in D1 or D9.', tone: 'good' });
  }
  const relevantShifts = planets.filter((name) => difficult.has(signDistance(planet(ctx, name).signNumber, vargaSign(ctx, name, 'D9')))).length;
  const adjustment = -Math.min(8, (challengedPairs + relevantShifts) * 2);
  const summaryParts = [
    shifts.length ? `${shifts.length} of ${ctx.chart.planets.length} grahas have 6/8/12 self-shifts: ${shifts.join('; ')}` : '',
    relations.length ? `inter-planet links ${relations.slice(0, 3).join('; ')}` : '',
  ].filter(Boolean);
  const movementSummary = summaryParts.length
    ? `D1-to-D9 check: ${summaryParts.join('. ')}. These 6/8/12 patterns are cautions to balance against dignity, house strength and cancellation, not denials.`
    : 'D1-to-D9 check: no graha has a 6/8/12 self-shift, and the selected topic indicators have no such inter-planet relationships.';
  const primaryHouses = PRIMARY_HOUSES[domain];
  const natalSummary = primaryHouses.map((house) => {
    const assessment = assessHouse(ctx, house, null, [3, 6, 10, 11].includes(house));
    const pressures = assessment.evidence.filter((item) => item.tone === 'bad');
    const supports = assessment.evidence.filter((item) => item.tone === 'good');
    const kartari = assessment.evidence.filter((item) => /^(Paap|Subha) Kartari/.test(item.text));
    const selected = [...new Set([...kartari, ...pressures.slice(0, 3), ...supports.slice(0, 3)])];
    return `D1 ${ordinal(house)} house (${signName(signOfHouse(ctx, house))}): ${selected.map((item) => item.text).join(' ')} Supporting factors do not erase pressures, and pressures do not by themselves deny the topic.`;
  }).join(' ');
  const summary = `${natalSummary} ${movementSummary}`;
  return { adjustment, evidence, summary };
}

/** How strong a planet is, in a word a non-astrologer can use. */
function strengthWord(ctx: Context, name: string): string {
  const p = planet(ctx, name);
  const r = ctx.strength[name];
  if (p.dignity === 'EXALTED' || p.dignity === 'OWN' || (r !== undefined && r >= 1.2)) return 'strong';
  if (p.dignity === 'DEBILITATED' || (r !== undefined && r < 0.85)) return 'on the weaker side';
  return 'moderately strong';
}

// ------------------------------------------------------------------ plain-language helpers

const VARGA_NAMES = 'Navamsa|Dasamsa|Chaturthamsa|Vimshamsa|Trimsamsa';

/** Turns a significator reason such as "lord of the 7th" into everyday words. */
function plainReason(reason: string): string {
  let m = reason.match(new RegExp(`^lord of the (${VARGA_NAMES}) (\\d+)`));
  if (m) return `rules the ${HOUSE_MEANING[+m[2]]} area of your ${m[1]} chart`;
  m = reason.match(new RegExp(`^in the (${VARGA_NAMES}) (\\d+)`));
  if (m) return `sits in the ${HOUSE_MEANING[+m[2]]} area of your ${m[1]} chart`;
  m = reason.match(/^lord of the (\d+)\w* from the Moon/);
  if (m) return `rules your ${HOUSE_MEANING[+m[1]]} area when counted from the Moon`;
  m = reason.match(/^lord of the (\d+)/);
  if (m) return `looks after your ${HOUSE_MEANING[+m[1]]}`;
  m = reason.match(/^in the (\d+)/);
  if (m) return `sits in the ${HOUSE_MEANING[+m[1]]} area of your chart`;
  m = reason.match(/^aspects the (\d+)/);
  if (m) return `looks directly at your ${HOUSE_MEANING[+m[1]]} area`;
  if (reason === 'natural significator') return 'is a natural indicator of this theme';
  if (reason === 'Darakaraka') return 'stands for your life partner in Jaimini astrology';
  if (reason === 'Amatyakaraka') return 'stands for your career and advisers in Jaimini astrology';
  if (reason === 'Atmakaraka') return 'stands for your soul and purpose in Jaimini astrology';
  if (reason === 'lord of the Upapada') return 'rules the marriage point (Upapada) of your chart';
  m = reason.match(/^acts for (\w+)/);
  if (m) return `acts on behalf of ${m[1]}`;
  return reason;
}

function describeWindow(w: Window, sigs: Sigs): string {
  const clause = (lord: string) => {
    const s = sigs.get(lord);
    if (!s) return '';
    const parts = [...new Set(s.reasons)].slice(0, 2).map(plainReason);
    return parts.length ? ` (${lord} ${parts.join(' and ')})` : '';
  };
  const anchors = w.reasons.filter((reason) => reason.startsWith('Chara sign'));
  return `${w.md} / ${w.ad}${clause(w.adPlanet)}.${anchors.length ? ` ${[...new Set(anchors)].join('; ')}.` : ''} Topic activation: ${w.activationScore ?? Math.round(w.relative * 100)}/100.`;
}

function explain(groups: WindowGroup[], sigsFor: (g: WindowGroup) => Sigs) {
  for (const g of groups) for (const w of g.windows) w.plain = describeWindow(w, sigsFor(g));
}

export function ratingWord(relative: number, tone: 'good' | 'caution'): string {
  if (tone === 'caution') return relative >= 0.8 ? 'most demanding' : relative >= 0.55 ? 'demanding' : 'mildly demanding';
  return relative >= 0.7 ? 'stronger support' : relative >= 0.55 ? 'good support with qualifications' : relative >= 0.4 ? 'mixed; patience needed' : 'limited support; extra care';
}

function windowText(w: Window): string {
  const peak = w.peaks.find((item) => !item.note.startsWith('Navatara:'));
  return `${w.system} ${formatRange(w.start, w.end)} (${ratingWord(w.relative, 'good')}${peak ? `, with the best stretch around ${formatRange(peak.start, peak.end)}` : ''})`;
}

/** One sentence naming the nearest window and, when different, the most favourable one. */
function nextSentence(label: string, windows: Window[]): string | null {
  if (windows.length === 0) return null;
  const first = windows[0];
  const strongest = [...windows].sort((x, y) => y.score - x.score)[0];
  return first === strongest
    ? `The ${first.current ? 'currently active' : 'best upcoming'} ${label} is ${windowText(first)}.`
    : `The ${first.current ? 'currently active' : 'nearest'} ${label} is ${windowText(first)}; the strongest topic activation among the selected periods is ${windowText(strongest)}.`;
}

// ------------------------------------------------------------------ timing helpers

interface TimingOptions {
  from: string;
  to: string;
  houses: number[];
  promiseScore: number;
  upcoming: number;
  earlier?: number;
  min: number;
  /** Shown beside the best months: why Jupiter and Saturn matter here. */
  note: string;
  pressure?: boolean;
  division?: string;
}

const DASHA_INTRO = 'Vimshottari and Yogini use planetary main/sub-period lordship, placement, dignity, influences and MD–AD links. Chara adds topic-karaka signs and derived houses (DK and 7th from DK for partnership; AmK and 10th from AmK for career). Agreement is counted only over shared dates, then transits supply secondary corroboration. Scores are heuristics, not event probabilities.';
const DOUBLE_NOTE = (theme: string) => `Jupiter and Saturn, the two slow-moving planets, are both supporting your ${theme}`;
const PRESSURE_NOTE = (theme: string) => `Saturn, the planet of pressure and delay, is weighing on your ${theme}`;

function peaksFor(ctx: Context, windows: Window[], o: TimingOptions) {
  const targets = targetSigns(ctx, o.houses, o.division);
  const test = o.pressure ? saturnPressure(targets) : doubleTransit(targets);
  addPeaks(windows, transitIntervals(ctx, test, o.from, o.to), o.note);
  addNavataraPeaks(ctx, windows);
}

function promiseTimingNote(score: number): string {
  const level = score >= 70 ? 'strong' : score >= 55 ? 'good with qualifications' : score >= 40 ? 'mixed, requiring patience' : 'limited, requiring extra care';
  return `Natal promise is assessed first: ${level} support (${score}/100). Thresholds: 70–100 stronger support, 55–69 good with qualifications, 40–54 mixed/patience, below 40 extra care. Period activation is separate; the timing label cannot exceed this natal support score. Structural cautions may qualify the verdict further.`;
}

function balancedWindows(windows: Window[], count: number, minimum: number): Window[] {
  const selected: Window[] = [];
  for (const system of ['Vimshottari', 'Yogini', 'Chara'] as const) {
    selected.push(...topWindows(windows.filter((window) => window.system === system), 1, minimum));
  }
  const rest = topWindows(windows.filter((window) => !selected.includes(window)), Math.max(0, count - selected.length), minimum);
  return [...selected, ...rest].sort((left, right) => left.start.localeCompare(right.start));
}

function supportGroups(ctx: Context, sigs: Sigs, o: TimingOptions, labels: { upcoming: string; earlier: string; blurb: string }): WindowGroup[] {
  const upcomingFrom = later(o.from, ctx.today);
  const scored = scoreWindows(ctx, sigs, upcomingFrom, o.to, o.division, o.houses).filter((w) => !w.past);
  const upcoming = balancedWindows(scored, o.upcoming, o.min);
  // Also keep the best near-term window so the first result is not always years away.
  const soon = addYears(ctx.today, 4);
  for (const system of ['Vimshottari', 'Yogini', 'Chara'] as const) {
    const near = scored.filter((window) => window.system === system && window.start < soon && window.relative >= 0.3)
      .sort((left, right) => left.start.localeCompare(right.start))[0];
    if (near && !upcoming.includes(near)) upcoming.push(near);
  }
  upcoming.sort((x, y) => x.start.localeCompare(y.start));
  const past = o.earlier ? balancedWindows(scoreWindows(ctx, sigs, o.from, ctx.today, o.division, o.houses).filter((w) => w.past), o.earlier, o.min) : [];
  const missing = (['Vimshottari', 'Yogini', 'Chara'] as const).filter((system) => !upcoming.some((window) => window.system === system));
  for (const window of [...upcoming, ...past]) window.relative = Math.min(window.activationScore ?? 0, o.promiseScore) / 100;
  peaksFor(ctx, upcoming, o);
  peaksFor(ctx, past, o);
  const groups: WindowGroup[] = [{ title: labels.upcoming, blurb: `${promiseTimingNote(o.promiseScore)} ${DASHA_INTRO} ${labels.blurb}${missing.length ? ` No window reached the selection threshold for ${missing.join(', ')} in this horizon, or its period data is unavailable; this is not a denial.` : ''}`, tone: 'good', windows: upcoming }];
  if (past.length) groups.push({ title: labels.earlier, blurb: 'Stretches in the past that fit the same pattern. Compare them with your own history to see how well the method fits you.', tone: 'good', windows: past });
  explain(groups, () => sigs);
  return groups;
}

/** Windows where the stress significators outweigh the supportive ones. */
function cautionGroup(ctx: Context, support: Sigs, stress: Sigs, o: TimingOptions, title: string, blurb: string): WindowGroup {
  const s = scoreWindows(ctx, support, o.from, o.to, o.division, o.houses);
  const t = scoreWindows(ctx, stress, o.from, o.to, o.division, o.houses);
  const net = t.map((w) => {
    const supportive = s.find((other) => other.system === w.system && other.start === w.start && other.end === w.end);
    return { ...w, score: (supportive?.relative ?? 0) >= 0.6 ? 0 : Math.max(0, w.score - 0.6 * (supportive?.score ?? 0)), peaks: [] as Window['peaks'] };
  });
  const best = Math.max(0.0001, ...net.map((w) => w.score));
  for (const w of net) w.relative = w.score / best;
  const picked = topWindows(net.filter((w) => !w.past), o.upcoming, o.min);
  peaksFor(ctx, picked, { ...o, pressure: true });
  const group: WindowGroup = { title, blurb, tone: 'caution', windows: picked };
  explain([group], () => stress);
  return group;
}

/** Is the running period supportive, testing or steady for this theme? */
function currentMood(ctx: Context, support: Sigs, stress: Sigs | null, division?: string): string {
  const to = addYears(ctx.today, 12);
  const s = scoreWindows(ctx, support, ctx.today, to, division);
  const cur = s.findIndex((w) => w.current);
  if (cur < 0) return 'steady';
  if (s[cur].relative >= 0.6) return 'supportive';
  if (stress) {
    const t = scoreWindows(ctx, stress, ctx.today, to, division);
    const net = t.map((w) => {
      const supportive = s.find((other) => other.system === w.system && other.start === w.start && other.end === w.end);
      return Math.max(0, w.score - 0.6 * (supportive?.score ?? 0));
    });
    const best = Math.max(0.0001, ...net);
    if (t.some((w, index) => w.current && net[index] / best >= 0.6)) return 'testing';
  }
  return 'steady';
}

function currentPeriod(ctx: Context): string {
  const systems = [
    ['Vimshottari', ctx.chart.dashas], ['Yogini', ctx.chart.yoginiDashas], ['Chara', ctx.chart.charaDashas],
  ] as const;
  const active: string[] = [];
  for (const [name, dashas] of systems) {
    for (const md of dashas) {
      for (const ad of md.antardashas) {
        if (ad.start.slice(0, 10) <= ctx.today && ctx.today < ad.end.slice(0, 10)) active.push(`${name} ${md.lord}–${ad.lord}`);
      }
    }
  }
  return active.join(' · ');
}

// ------------------------------------------------------------------ divisional chart plans

interface VargaPlan {
  division: string;
  label: string;
  houses: number[];
  karaka: string | null;
  weight: number;
  upachaya?: boolean;
  /** Why astrologers use this chart, in everyday words. */
  why: string;
  meaning: string;
}

const PLANS: Record<DomainId, VargaPlan> = {
  marriage: { division: 'D9', label: 'Navamsa', houses: [7], karaka: 'Venus', weight: 0.5, why: 'the main chart of marriage, showing how a partnership really unfolds and matures', meaning: 'the main chart of marriage and of the partner\'s inner nature' },
  relationship: { division: 'D9', label: 'Navamsa', houses: [7], karaka: 'Venus', weight: 0.35, why: 'the chart that shows the depth and durability of a partnership', meaning: 'the depth and durability of partnership' },
  career: { division: 'D10', label: 'Dasamsa', houses: [10], karaka: null, weight: 0.5, upachaya: true, why: 'the main chart of profession and public achievement', meaning: 'the main chart of profession and public achievement' },
  property: { division: 'D4', label: 'Chaturthamsa', houses: [4], karaka: 'Mars', weight: 0.4, why: 'the chart that shows home, land and fixed assets', meaning: 'fixed assets, home and property' },
  spiritual: { division: 'D20', label: 'Vimshamsa', houses: [9], karaka: 'Jupiter', weight: 0.35, why: 'the chart of spiritual practice and worship', meaning: 'spiritual practice and worship' },
  health: { division: 'D30', label: 'Trimsamsa', houses: [1], karaka: 'Sun', weight: 0.2, why: 'a chart that shows the weak points and troubles of the body', meaning: 'the weak points and misfortunes of the body' },
};

function vargaAssess(ctx: Context, plan: VargaPlan): Assessment {
  const parts = plan.houses.map((h) => assessVarga(ctx, plan.division, h, plan.karaka, plan.label, plan.upachaya));
  return {
    score: Math.round(parts.reduce((sum, p) => sum + p.score, 0) / parts.length),
    evidence: parts.flatMap((p) => p.evidence),
  };
}

/** Astrological detail of the governing divisional chart, for the "behind the scenes" section. */
function vargaLines(ctx: Context, plan: VargaPlan): string[] {
  const lines = [`${plan.label} (${plan.division}), ${plan.meaning}: the Ascendant there is ${signName(vargaSign(ctx, 'Ascendant', plan.division))}${vargottama(ctx, 'Ascendant', plan.division) ? ' (Vargottama)' : ''}.`];
  for (const h of plan.houses) {
    const sign = vargaHouseSign(ctx, plan.division, h);
    const lord = vargaLord(ctx, plan.division, h);
    const here = vargaOccupants(ctx, plan.division, h);
    lines.push(`${plan.label} ${ordinal(h)} house is ${signName(sign)} (${SIGN_TRAITS[sign - 1]}); its lord ${lord} is ${STATUS_TEXT[vargaStatus(ctx, lord, plan.division)]} in ${signName(vargaSign(ctx, lord, plan.division))}, the ${ordinal(vargaHouseOf(ctx, lord, plan.division))} house${here.length ? `; ${here.join(', ')} occupy${here.length === 1 ? 'ies' : ''} it` : ''}.`);
    lines.push(...assessVarga(ctx, plan.division, h, plan.karaka, plan.label, plan.upachaya).evidence.map((item) => item.text));
  }
  if (plan.karaka) lines.push(`${plan.karaka} in the ${plan.label}: ${signName(vargaSign(ctx, plan.karaka, plan.division))}, ${STATUS_TEXT[vargaStatus(ctx, plan.karaka, plan.division)]}.`);
  return lines;
}

/** Everyday-language reading of how the divisional chart looks. */
function vargaPlain(ctx: Context, plan: VargaPlan, theme: string, assessment: Assessment): string {
  const pressureCount = assessment.evidence.filter((item) => item.tone === 'bad').length;
  const mood = assessment.score >= 60 ? `It has support for ${theme}${pressureCount >= 2 ? ', alongside important pressures' : ''}` : assessment.score >= 45 ? `It gives mixed signals for ${theme}` : `It shows some strain around ${theme}`;
  const sources = new Set<string>();
  for (const house of plan.houses) {
    const lord = vargaLord(ctx, plan.division, house);
    for (const name of ctx.chart.planets) {
      if (assessment.evidence.some((item) => item.text.includes(`${name.name} aspects ${lord}`))) sources.add(name.name);
    }
  }
  const mitigations = new Map<string, string[]>();
  for (const position of ctx.chart.planets.filter((item) => vargaStatus(ctx, item.name, plan.division) === 'Debilitated')) {
    for (const item of assessPlanetInfluences(ctx, position.name, plan.division).evidence.filter((entry) => entry.tone === 'good')) {
      const source = item.text.match(/:\s*(\w+) aspects/)?.[1];
      if (!source || sources.has(source)) continue;
      mitigations.set(source, [...new Set([...(mitigations.get(source) ?? []), position.name])]);
    }
  }
  const mitigation = [...mitigations].slice(0, 2).map(([source, receivers]) => `${STATUS_TEXT[vargaStatus(ctx, source, plan.division)]} ${source} supports debilitated ${receivers.join(' and ')}`).join('; ');
  const factors = plan.houses.map((house) => houseFactorSummary(ctx, house, plan.division)).join(' ');
  return `${plan.label} (${plan.division}): ${mood}. ${factors}${mitigation ? ` Elsewhere in this division, ${mitigation}; mitigation does not erase debility.` : ''}`;
}

const vargaBlurb = (plan: VargaPlan) => ` Each planet's strength in your ${plan.label} chart is also taken into account.`;

export function synthesizeAnswer(ctx: Context, answer: Answer): Answer {
  const plan = PLANS[answer.domain];
  const main = PRIMARY_HOUSES[answer.domain].map((house) => assessHouse(ctx, house, plan.karaka, [3, 6, 10, 11].includes(house)));
  const division = vargaAssess(ctx, plan);
  const evidence = [...main.flatMap((part) => part.evidence), ...division.evidence];
  const mainPressure = PRIMARY_HOUSES[answer.domain].some((house) => {
    const lord = planet(ctx, lordOfHouse(ctx, house));
    return lord.dignity === 'DEBILITATED' || lord.combust || [6, 8, 12].includes(lord.house)
      || houseKartari(ctx, house).kind === 'Paap Kartari';
  });
  const divisionPressure = plan.houses.some((house) => {
    const lord = vargaLord(ctx, plan.division, house);
    const lordHouse = vargaHouseOf(ctx, lord, plan.division);
    const relativeHouse = ((lordHouse - house + 12) % 12) + 1;
    return vargaStatus(ctx, lord, plan.division) === 'Debilitated'
      || [6, 8, 12].includes(lordHouse) || [6, 8, 12].includes(relativeHouse);
  }) || division.score < 45;
  const previousLabel = answer.verdict.label;
  if (answer.verdict.tone === 'good' && mainPressure && divisionPressure) {
    answer.verdict = { label: `${answer.domainLabel}: support with significant cautions`, tone: 'neutral' };
    answer.headline = `${answer.verdict.label}. ${answer.headline}`;
    answer.plain = answer.plain.map((text) => text.startsWith('Overall ')
      ? `The integrated reading needs qualification because both D1 and ${plan.division} carry structural pressures. ${text.replace(/\b(strong|good) support\b/, 'qualified support')}` : text);
  }
  const conclusion = mainPressure && divisionPressure
    ? `D1 and ${plan.division} both carry structural cautions; supportive dignity, yogas or timing must not erase them.`
    : mainPressure || divisionPressure
      ? `D1 and ${plan.division} differ in ease: preserve the strengths while addressing the weaker layer.`
      : 'Neither layer has the structural cautions checked here; this does not imply an effortless or certain outcome.';
  const unique = (items: Evidence[]) => [...new Map(items.map((item) => [item.text, item])).values()];
  const extraPlain = answer.plain.filter((text) => !/^(Overall |D1 \d|I also checked|Navamsa \(D9\)|Dasamsa \(D10\)|Chaturthamsa \(D4\)|Vimshamsa \(D20\)|Trimsamsa \(D30\)|Marriage needs a qualified reading|The checks of the 7th lord)/.test(text)
    && !answer.headline.includes(text)
    && !answer.groups.some((group) => group.tone === 'caution' && group.windows.some((window) => text.includes(formatRange(window.start, window.end)))));
  answer.plain = [
    `Integrated ${answer.domainLabel.toLowerCase()} assessment: ${conclusion}`,
    ...PRIMARY_HOUSES[answer.domain].map((house) => houseFactorSummary(ctx, house)),
    vargaPlain(ctx, plan, answer.domainLabel.toLowerCase(), division),
    ...extraPlain,
  ];
  answer.plain = [...new Set(answer.plain)];
  answer.technical = [...new Set([...answer.technical, ...evidence.map((item) => item.text), ...answer.evidence.map((item) => item.text)])];
  answer.evidence = unique(answer.evidence);
  const repeatedVerdict = `${answer.verdict.label} (${answer.score}/100).`;
  if (answer.headline.startsWith(repeatedVerdict) && answer.headline.length > repeatedVerdict.length) answer.headline = answer.headline.slice(repeatedVerdict.length).trim();
  if (answer.focus === 'nature') answer.headline = '';
  if (previousLabel !== answer.verdict.label) answer.notes.push('The verdict is qualified by the combined natal and divisional reading; the score is a heuristic summary, not a probability.');
  return answer;
}

function base(ctx: Context, domain: DomainId, domainLabel: string, question: string, focus: Focus): Answer {
  const plan = PLANS[domain];
  return {
    domain, domainLabel, question, focus, headline: '', verdict: { label: '', tone: 'neutral' }, score: 50, plain: [],
    natureTitle: '', nature: [], jaimini: [],
    vargaNote: `Besides your main (Rashi) chart, this answer uses your ${plan.label} (${plan.division}) chart, ${plan.why}.`,
    groups: [], technical: [], evidence: [], notes: [], transitsUsed: ctx.transits !== null,
  };
}

const COMMON_NOTE = 'These are astrological indications, not certainties. They come from classical rules (house lords, natural significators, planetary periods and the Jupiter–Saturn transit) and are best used as a guide for reflection. Timing windows below are deliberately limited to the coming 3 years so the guidance stays near-term and actionable.';
const TRANSIT_NOTE = 'Transit data was unavailable, so the timing relies on planetary periods alone.';

function topEvidence(a: Assessment, n = 6): Evidence[] {
  const bad = a.evidence.filter((item) => item.tone === 'bad');
  const good = a.evidence.filter((item) => item.tone === 'good');
  const selected: Evidence[] = [];
  for (let index = 0; index < Math.max(bad.length, good.length) && selected.length < n; index++) {
    if (bad[index]) selected.push(bad[index]);
    if (good[index] && selected.length < n) selected.push(good[index]);
  }
  return [...selected, ...a.evidence.filter((item) => item.tone === 'neutral')].slice(0, n);
}

/** Jaimini yogas relevant to a theme, with a small effect on the score. */
function jaiminiFor(ctx: Context, tags: JaiminiYoga['tags']): { list: JaiminiYoga[]; adjust: number; evidence: Evidence[] } {
  const list = ctx.jaimini.filter((y) => y.tags.some((t) => tags.includes(t)));
  const adjust = Math.max(-6, Math.min(6, list.reduce((s, y) => s + (y.tone === 'good' ? 2 : y.tone === 'caution' ? -2 : 0), 0)));
  return {
    list, adjust,
    evidence: list.map((y) => ({ text: `Jaimini: ${y.name}. ${y.technical}`, tone: y.tone === 'good' ? 'good' as const : y.tone === 'caution' ? 'bad' as const : 'neutral' as const })),
  };
}

/** Adds the timing sentence to the plain text unless the headline already says it. */
function pushTiming(a: Answer, timing: string | null, fallback: string) {
  if (a.focus === 'nature') return;
  if (!timing) a.plain.push(fallback);
  else if (!a.headline.includes(timing)) a.plain.push(timing);
}

const promiseWord = (v: Verdict) => (v.tone === 'good' ? (v.label.startsWith('Strong') ? 'strong' : 'good') : v.tone === 'neutral' ? 'mixed' : 'challenging');

// ------------------------------------------------------------------ marriage

function marriage(ctx: Context, question: string, focus: Focus): Answer {
  const a = base(ctx, 'marriage', 'Marriage', question, focus);
  const plan = PLANS.marriage;
  const house7 = assessHouse(ctx, 7, 'Venus');
  const v = vargaAssess(ctx, plan);
  const combined = blend(house7, v, plan.weight);
  const jai = jaiminiFor(ctx, ['marriage']);
  const lord7 = lordOfHouse(ctx, 7);
  const lord7Pos = planet(ctx, lord7);
  const ul = ctx.padas[11];
  const ulLord = SIGN_LORDS[ul.sign - 1];
  const dk = ctx.karakas[6];
  const interchart = interchartRead(ctx, 'marriage');
  const evidence = [...combined.evidence, ...jai.evidence, ...interchart.evidence];
  let score = combined.score + jai.adjust + interchart.adjustment;

  const mangal = ctx.chart.yogas.find((y) => y.name.startsWith('Mangal Dosha') && !y.name.includes('Bhanga'));
  const bhanga = ctx.chart.yogas.some((y) => y.name.startsWith('Mangal Dosha Bhanga'));
  if (mangal) {
    score -= bhanga ? 2 : 6;
    evidence.push({ text: bhanga ? 'Mangal Dosha is present but has cancelling factors.' : 'Mangal Dosha is present; marriage to a similarly placed partner is traditionally preferred.', tone: bhanga ? 'neutral' : 'bad' });
  }

  const delay: string[] = [];
  const sevenOccupants = occupants(ctx, 7);
  const pressuredOccupants = sevenOccupants.filter((name) => MALEFICS.includes(name) || functionalNature(ctx, name) === 'malefic');
  if (lord7Pos.dignity === 'DEBILITATED') delay.push(`${lord7}, your 7th lord, is debilitated in ${lord7Pos.sign}${hasNeechaBhanga(ctx, lord7) ? '; Neecha Bhanga factors mitigate but do not erase this weakness' : ''}`);
  if (lord7Pos.combust) delay.push(`the 7th lord ${lord7} is combust`);
  if (pressuredOccupants.length) delay.push(`${pressuredOccupants.join(', ')} ${pressuredOccupants.length === 1 ? 'occupies' : 'occupy'} the 7th house with natural or functional malefic influence`);
  const lordShift = signDistance(lord7Pos.signNumber, vargaSign(ctx, lord7, 'D9'));
  if ([6, 8, 12].includes(lordShift)) delay.push(`the 7th lord ${lord7} moves to the ${ordinal(lordShift)} sign from D1 to D9, adding a cross-chart caution`);
  const venusShift = signDistance(planet(ctx, 'Venus').signNumber, vargaSign(ctx, 'Venus', 'D9'));
  if ([6, 8, 12].includes(venusShift)) delay.push(`Venus moves to the ${ordinal(venusShift)} sign from D1 to D9`);
  const d9Pressures = [...new Set([lord7, vargaLord(ctx, 'D9', 7), 'Venus'])]
    .flatMap((name) => assessPlanetInfluences(ctx, name, 'D9').evidence.filter((item) => item.tone === 'bad'));
  if (d9Pressures.length) delay.push(`D9 has additional pressure on marriage indicators: ${d9Pressures.map((item) => item.text).join(' ')}`);
  if (sevenOccupants.includes('Saturn') || aspectors(ctx, 7).includes('Saturn')) delay.push('Saturn, the planet of delay and patience, influences your marriage area');
  if (sevenOccupants.includes('Rahu') || sevenOccupants.includes('Ketu')) delay.push('a shadow planet (Rahu or Ketu) sits in your marriage area, which can bring unusual circumstances or postponements');
  if (sevenOccupants.includes('Mars')) delay.push('fiery Mars sits in your marriage area, which can add intensity or disagreements');
  if ([6, 8, 12].includes(lord7Pos.house)) delay.push(`${lord7}, the planet that looks after marriage, sits in a testing area of your chart (${HOUSE_MEANING[lord7Pos.house]})`);
  const venus = planet(ctx, 'Venus');
  if (venus.dignity === 'DEBILITATED' || venus.combust) delay.push('Venus, the planet of love, is weakened');

  const verdict = verdictFor(score, ['Strong support for marriage', 'Good support for marriage', 'Mixed signals about marriage', 'Marriage may need extra patience']);
  if (verdict.tone === 'good' && (lord7Pos.dignity === 'DEBILITATED' || d9Pressures.length >= 2 || pressuredOccupants.length >= 2)) {
    verdict.label = 'Marriage support with significant cautions';
    verdict.tone = 'neutral';
  }
  a.verdict = verdict;
  a.score = Math.max(5, Math.min(95, Math.round(score)));
  a.evidence = topEvidence({ score, evidence }, 14);

  const fifth = lordOfHouse(ctx, 5);
  const love = linked(ctx, fifth, lord7) || linked(ctx, 'Venus', 'Rahu') || venus.signNumber === planet(ctx, 'Mars').signNumber;
  const traditional = aspectors(ctx, 7).includes('Jupiter') || sevenOccupants.includes('Jupiter') || (linked(ctx, lord7, 'Jupiter') && !love);
  const style = love && traditional ? 'a love match that also has your family\'s blessing' : love ? 'a love match or a partner you choose yourself' : traditional ? 'a family-guided, traditional match' : 'either a self-chosen or an arranged match';
  const sign7 = signOfHouse(ctx, 7);
  const traits = SIGN_TRAITS[sign7 - 1];
  const d7Sign = vargaHouseSign(ctx, plan.division, 7);
  const sentenceDelay = delay.length
    ? `Marriage needs a qualified reading, with factors that can indicate delay or relationship strain: ${delay.join('; ')}. Supportive placements and cancellation factors must be weighed alongside these pressures; none alone predicts an event.`
    : 'The checks of the 7th lord, house occupants and D9 indicators did not identify a major delay factor; this is not a guarantee of early or effortless marriage.';

  a.plain = [
    `Overall your chart gives ${promiseWord(verdict)} support for marriage (${a.score} out of 100, a rule-based summary rather than a probability)${delay.length ? ', with important qualifications' : ''}. Astrologers judge marriage mainly through the 7th house, the area of partnership. In your chart it falls in ${signName(sign7)}, and its ruling planet ${lord7} is ${dignityNote(ctx, lord7)}, ${strengthWord(ctx, lord7)} overall, and sits in the area of ${HOUSE_MEANING[lord7Pos.house]}.`,
    vargaPlain(ctx, plan, 'marriage', v),
    interchart.summary,
    ...(mangal ? [bhanga ? 'Mangal Dosha has cancellation factors that mitigate the Mars-specific concern; they do not cancel separate weaknesses of the 7th lord, Venus or D9.' : 'Your chart has Mangal Dosha, a Mars influence that traditionally asks for care in marriage. Many families look for a partner with a similar chart, and it is not a reason for alarm.'] : []),
  ];
  a.natureTitle = 'What to expect';
  a.nature = [
    `Your partner: likely ${traits}.`,
    `How you may meet: through ${HOUSE_THEME[lord7Pos.house]}.`,
    `Type of marriage: ${style}.`,
    `After marriage: in the Navamsa the partnership area is ${signName(d7Sign)}, so the partner's deeper nature tends to come across as ${SIGN_TRAITS[d7Sign - 1]}.`,
    delay.length === 0 && (lord7Pos.house === 7 || ([1, 4, 5, 9, 10, 11].includes(lord7Pos.house) && house7.score >= 55))
      ? 'Staying power: the planet of marriage is comfortably placed, which supports a lasting partnership.'
      : 'Staying power: the marriage benefits from patience and open communication, especially in periods of the marriage planets.',
  ];
  a.jaimini = jai.list;
  a.technical = [
    sentenceDelay,
    `The 7th house is ${signName(sign7)}; the 7th lord ${lord7} is ${dignityNote(ctx, lord7)}${lord7Pos.retrograde ? ' and retrograde' : ''} in the ${ordinal(lord7Pos.house)} house.`,
    `Upapada (marriage point): ${signName(ul.sign)}, lorded by ${ulLord} (${dignityNote(ctx, ulLord)}). The Darakaraka is ${dk.planet.name}.`,
    ...vargaLines(ctx, plan),
    ...interchart.evidence.map((item) => item.text),
  ];

  const sigSpec: SigSpec = {
    primary: [7], secondary: [2, 11], karakas: [['Venus', 2], ['Jupiter', 1.5]],
    extras: [[dk.planet.name, 2, 'Darakaraka'], [ulLord, 2, 'lord of the Upapada'], ...vargaExtras(ctx, plan.division, plan.houses, plan.label)],
  };
  const sigs = significators(ctx, sigSpec);
  const from = addYears(ctx.chart.birthDetails.date, 18);
  const to = addYears(ctx.today, 3);
  const options: TimingOptions = { from, to, houses: [7], promiseScore: a.score, upcoming: 3, earlier: 2, min: 0.5, division: plan.division, note: DOUBLE_NOTE('marriage area') };
  a.groups = supportGroups(ctx, sigs, options, { upcoming: 'Likely marriage windows ahead', earlier: 'Earlier windows', blurb: `These are stretches when the planets running your life are closely tied to marriage.${vargaBlurb(plan)}` });

  const timing = nextSentence('marriage window', a.groups[0].windows);
  a.headline = focus === 'timing'
    ? (timing ?? 'No clearly favourable marriage window appears in the coming years; read the notes below for what to expect.')
    : focus === 'nature' ? `${delay.length ? 'Marriage has both support and pressure; patience and careful partner selection matter. ' : ''}The chart suggests ${style}, with ${traits} themes in the partner description, not a fixed personality prediction.`
      : `${verdict.label} (${a.score}/100). ${timing ?? ''}`.trim();
  pushTiming(a, timing, 'No strongly favourable marriage window shows up in the next 3 years, so there is no need to feel pressed by the calendar.');
  a.notes = [COMMON_NOTE, 'If you are already married, an earlier window that fits your history is a good check on the method. If not, treat future windows as favourable periods rather than fixed dates.'];
  if (!ctx.transits) a.notes.push(TRANSIT_NOTE);
  return a;
}

// ------------------------------------------------------------------ relationship

function relationship(ctx: Context, question: string, focus: Focus): Answer {
  const a = base(ctx, 'relationship', 'Relationships', question, focus);
  const plan = PLANS.relationship;
  const five = assessHouse(ctx, 5, 'Venus');
  const v = vargaAssess(ctx, plan);
  const seven = blend(assessHouse(ctx, 7, 'Venus'), v, plan.weight);
  const jai = jaiminiFor(ctx, ['marriage']);
  const interchart = interchartRead(ctx, 'relationship');
  const score = Math.max(5, Math.min(95, Math.round(0.5 * five.score + 0.5 * seven.score + jai.adjust + interchart.adjustment)));
  a.score = score;
  a.verdict = verdictFor(score, ['Strong relationship potential', 'Good relationship potential', 'Mixed relationship signals', 'Relationships need conscious effort']);
  a.evidence = [
    ...topEvidence(five, 4).map((e) => ({ ...e, text: `Romance (5th): ${e.text}` })),
    ...topEvidence(seven, 5).map((e) => ({ ...e, text: `Partnership (7th): ${e.text}` })),
    ...jai.evidence,
    ...interchart.evidence,
  ];

  const venus = planet(ctx, 'Venus');
  const moon = planet(ctx, 'Moon');
  const lord5 = lordOfHouse(ctx, 5);
  const lord7 = lordOfHouse(ctx, 7);
  const bridge = linked(ctx, lord5, lord7);
  a.plain = [
    `Overall your chart shows ${promiseWord(a.verdict)} potential for relationships (${score} out of 100). Astrologers read romance through the 5th house and long-term partnership through the 7th, along with Venus, the planet of love.`,
    bridge ? 'The planets of romance and commitment are connected in your chart, so a romance can naturally grow into something lasting.' : 'The planets of romance and commitment are not directly connected, so falling in love and committing may happen as two separate steps, and that is perfectly workable.',
    vargaPlain(ctx, plan, 'lasting partnership', v),
    interchart.summary,
  ];
  a.natureTitle = 'What to expect';
  a.nature = [
    `Love style: ${SIGN_TRAITS[venus.signNumber - 1]}.`,
    `What you need emotionally: ${SIGN_TRAITS[moon.signNumber - 1]} companionship.`,
    `Where connections arise: through ${HOUSE_THEME[planet(ctx, lord5).house]} (romance) and ${HOUSE_THEME[planet(ctx, lord7).house]} (commitment).`,
  ];
  a.jaimini = jai.list;
  a.technical = [...vargaLines(ctx, plan), ...interchart.evidence.map((item) => item.text)];

  const sigs = significators(ctx, { primary: [5, 7], secondary: [11], karakas: [['Venus', 2], ['Moon', 1]], extras: vargaExtras(ctx, plan.division, plan.houses, plan.label) });
  const stress = significators(ctx, { primary: [6, 8, 12], secondary: [], karakas: [['Saturn', 1], ['Rahu', 1], ['Mars', 1]] });
  const from = ctx.today;
  const to = addYears(ctx.today, 3);
  const options: TimingOptions = { from, to, houses: [5, 7], promiseScore: score, upcoming: 3, min: 0.5, division: plan.division, note: DOUBLE_NOTE('romance and partnership areas') };
  a.groups = [
    ...supportGroups(ctx, sigs, options, { upcoming: 'Favourable periods for new or deeper relationships', earlier: '', blurb: 'These are stretches when the planets in charge are linked with romance and partnership.' }),
    cautionGroup(ctx, sigs, stress, { ...options, upcoming: 2, min: 0.6, note: PRESSURE_NOTE('romance and partnership areas') }, 'Periods that call for care in relationships', 'Here the planets tied to conflict, change and loss outweigh the supportive ones. These are times for patience and clear communication, not a prediction of break-ups.'),
  ];
  const care = a.groups.find((g) => g.tone === 'caution')?.windows[0];
  const timing = nextSentence('relationship period', a.groups[0].windows);
  a.headline = focus === 'timing'
    ? (timing ?? 'No distinctly favourable relationship window shows in the next 3 years.')
    : `${a.verdict.label} (${score}/100). ${timing ?? ''}`.trim();
  pushTiming(a, timing, 'No distinctly favourable relationship period stands out in the next 3 years.');
  a.plain.push(care ? `Take extra care and communicate openly around ${formatRange(care.start, care.end)}.` : 'No strongly stressful relationship period stands out.');
  a.notes = [COMMON_NOTE];
  if (!ctx.transits) a.notes.push(TRANSIT_NOTE);
  return a;
}

// ------------------------------------------------------------------ career

function career(ctx: Context, question: string, focus: Focus): Answer {
  const a = base(ctx, 'career', 'Career', question, focus);
  const plan = PLANS.career;
  const v = vargaAssess(ctx, plan);
  const ten = blend(assessHouse(ctx, 10, null, true), v, plan.weight);
  const eleven = assessHouse(ctx, 11, 'Jupiter', true);
  const jai = jaiminiFor(ctx, ['career', 'wealth']);
  const interchart = interchartRead(ctx, 'career');
  const score = Math.max(5, Math.min(95, Math.round(0.65 * ten.score + 0.35 * eleven.score + jai.adjust + interchart.adjustment)));
  a.score = score;
  a.verdict = verdictFor(score, ['Strong career prospects', 'Good career prospects', 'Mixed career signals', 'Career needs persistence']);
  a.evidence = [...topEvidence(ten, 6), ...topEvidence(eleven, 3).map((e) => ({ ...e, text: `Gains (11th): ${e.text}` })), ...jai.evidence, ...interchart.evidence];

  const amk = ctx.karakas[1].planet.name;
  const lord10 = lordOfHouse(ctx, 10);
  const lord10Pos = planet(ctx, lord10);
  const fields = new Map<string, number>();
  const bump = (name: string, w: number) => fields.set(name, (fields.get(name) ?? 0) + w);
  bump(lord10, 3);
  for (const o of occupants(ctx, 10)) bump(o, 2);
  bump(vargaLord(ctx, plan.division, 10), 3);
  for (const o of vargaOccupants(ctx, plan.division, 10)) bump(o, 2);
  bump(amk, 2);
  const strongest = Object.entries(ctx.strength).sort((x, y) => y[1] - x[1])[0]?.[0];
  if (strongest) bump(strongest, 1);
  const top = [...fields.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([n]) => n);
  const why = (n: string) => n === lord10 ? `${n} rules your career area` : n === amk ? `${n} is your career planet in Jaimini astrology` : n === vargaLord(ctx, plan.division, 10) ? `${n} rules the career area in your Dasamsa chart` : `${n} is strong or placed in your career area`;

  const sigs = significators(ctx, {
    primary: [10], secondary: [1, 2, 6, 9, 11], karakas: [['Sun', 1.5], ['Saturn', 1.5], ['Mercury', 1]],
    extras: [[amk, 2, 'Amatyakaraka'], [SIGN_LORDS[signOfHouse(ctx, 10, true) - 1], 1.5, 'lord of the 10th from the Moon'], ...vargaExtras(ctx, plan.division, plan.houses, plan.label)],
  });
  const stress = significators(ctx, { primary: [8, 12], secondary: [6], karakas: [] });
  const mood = currentMood(ctx, sigs, stress, plan.division);
  const moodText = mood === 'supportive' ? 'a supportive phase for your career' : mood === 'testing' ? 'a testing phase, where change and pressure are more likely than easy wins' : 'a fairly steady phase';

  a.plain = [
    `Overall your career prospects look ${promiseWord(a.verdict)} (${score} out of 100). Astrologers read career through the 10th house. Yours is ${signName(signOfHouse(ctx, 10))}, ruled by ${lord10}, which is ${strengthWord(ctx, lord10)} and placed in the area of ${HOUSE_MEANING[lord10Pos.house]}. So your success is closely tied to ${HOUSE_THEME[lord10Pos.house]}.`,
    vargaPlain(ctx, plan, 'professional life', v),
    interchart.summary,
    `Right now you are in the ${currentPeriod(ctx) || 'current'} period, which looks like ${moodText}.`,
    ctx.chart.transits.sadeSati.active ? 'Saturn is currently passing over your Moon sign (Sade Sati). This is often a demanding but ultimately disciplining phase that builds lasting career foundations.' : '',
  ].filter(Boolean);
  a.natureTitle = 'Suitable fields and working style';
  a.nature = [
    ...top.map((n) => `${PLANET_FIELDS[n]}: because ${why(n)}.`),
    `Working style: success tends to come through ${HOUSE_THEME[lord10Pos.house]}.`,
    `Public image: people tend to see your professional status as ${SIGN_TRAITS[ctx.padas[9].sign - 1]}.`,
  ];
  a.jaimini = jai.list;
  a.technical = [
    `The 10th house is ${signName(signOfHouse(ctx, 10))}; the 10th lord ${lord10} is ${dignityNote(ctx, lord10)} in the ${ordinal(lord10Pos.house)} house.`,
    `The Arudha of the 10th (Rajya pada, A10) is in ${signName(ctx.padas[9].sign)}.`,
    ...vargaLines(ctx, plan),
    ...interchart.evidence.map((item) => item.text),
  ];

  const from = ctx.today;
  const to = addYears(ctx.today, 3);
  const options: TimingOptions = { from, to, houses: [10], promiseScore: score, upcoming: 3, min: 0.55, division: plan.division, note: DOUBLE_NOTE('career area') };
  const rise = supportGroups(ctx, sigs, options, { upcoming: 'Career growth windows', earlier: '', blurb: `These are stretches when the planets in charge are strongly tied to career, income and recognition.${vargaBlurb(plan)}` });
  const fall = cautionGroup(ctx, sigs, stress, { ...options, upcoming: 3, min: 0.55, note: PRESSURE_NOTE('career area') }, 'Periods of pressure or change', 'In these stretches the planets tied to endings, hidden matters and effort outweigh the supportive ones. Expect restructuring, delays or transitions rather than certain loss, and use the time to prepare.');
  a.groups = [...rise, fall];
  const nextFall = fall.windows[0];
  const growth = nextSentence('growth window', rise[0].windows);
  a.headline = focus === 'riseFall' || focus === 'timing'
    ? `${growth ?? 'No distinctly strong growth window appears soon.'}${nextFall ? ` A more demanding stretch is around ${formatRange(nextFall.start, nextFall.end)}, so plan ahead.` : ''}`
    : `${a.verdict.label} (${score}/100). ${growth ?? ''}`.trim();
  pushTiming(a, growth, 'No distinctly strong growth window appears in the next 3 years, so steady effort matters more than timing.');
  a.plain.push(nextFall ? `A more demanding stretch comes around ${formatRange(nextFall.start, nextFall.end)}. That usually means change or extra effort, so it is a good time to build skills and savings.` : 'No strongly demanding career stretch stands out in the next 3 years.');
  a.notes = [COMMON_NOTE];
  if (!ctx.transits) a.notes.push(TRANSIT_NOTE);
  return a;
}

// ------------------------------------------------------------------ property

function property(ctx: Context, question: string, focus: Focus): Answer {
  const a = base(ctx, 'property', 'Property and home', question, focus);
  const plan = PLANS.property;
  const v = vargaAssess(ctx, plan);
  const four = blend(assessHouse(ctx, 4, 'Mars'), v, plan.weight);
  const eleven = assessHouse(ctx, 11, null, true);
  const jai = jaiminiFor(ctx, ['wealth']);
  const interchart = interchartRead(ctx, 'property');
  const score = Math.max(5, Math.min(95, Math.round(0.7 * four.score + 0.3 * eleven.score + jai.adjust + interchart.adjustment)));
  a.score = score;
  a.verdict = verdictFor(score, ['Strong support for owning property', 'Good support for owning property', 'Mixed signals about property', 'Property comes with effort or delay']);
  a.evidence = [...topEvidence(four, 8), ...topEvidence(eleven, 2).map((e) => ({ ...e, text: `Gains (11th): ${e.text}` })), ...jai.evidence, ...interchart.evidence];

  const mars = planet(ctx, 'Mars');
  const venus = planet(ctx, 'Venus');
  const lord4 = lordOfHouse(ctx, 4);
  const lord4Pos = planet(ctx, lord4);
  const points: string[] = [];
  if ((ctx.strength.Mars ?? 0) >= 1 || mars.dignity === 'OWN' || mars.dignity === 'EXALTED' || mars.house === 4 || lord4 === 'Mars') points.push('Mars, the planet of land and construction, is prominent, which favours plots of land, building work or an independent house.');
  if ((ctx.strength.Venus ?? 0) >= 1 || venus.dignity === 'OWN' || venus.dignity === 'EXALTED' || lord4 === 'Venus') points.push('Venus, the planet of comfort, is prominent, which favours a well-kept apartment or home and good vehicles.');
  if (occupants(ctx, 4).includes('Saturn') || aspectors(ctx, 4).includes('Saturn')) points.push('Saturn, the planet of patience, influences your home area, so property tends to come slowly, may be older or inherited, and rewards persistence.');
  if (lord4Pos.house === 12 || occupants(ctx, 4).some((n) => n === 'Rahu' || n === 'Ketu')) points.push('There is a link to distant or foreign places, so property away from your birthplace is possible.');
  if (lord4Pos.house === 11 || lord4Pos.house === 2) points.push('The planet that looks after your home is tied to gains and family wealth, which helps when buying through savings or family support.');
  const goodIn = (n: string) => ['Exalted', 'Own', 'Adhi Mitra', 'Mitra'].includes(vargaStatus(ctx, n, plan.division));
  if (goodIn('Mars')) points.push('Mars is also well placed in your Chaturthamsa chart, reinforcing land, construction and ownership.');
  if (goodIn('Venus')) points.push('Venus is also well placed in your Chaturthamsa chart, reinforcing comfort, vehicles and a well-kept home.');
  if (vargaOccupants(ctx, plan.division, 4).includes('Saturn')) points.push('Saturn sits in the home area of your Chaturthamsa chart, so property tends to be older, inherited or slow to arrive.');

  a.plain = [
    `Overall your chart gives ${promiseWord(a.verdict)} support for owning property (${score} out of 100). Astrologers read home and property through the 4th house. Yours is ${signName(signOfHouse(ctx, 4))}, ruled by ${lord4}, which is ${strengthWord(ctx, lord4)} and placed in the area of ${HOUSE_MEANING[lord4Pos.house]}.`,
    vargaPlain(ctx, plan, 'property', v),
    interchart.summary,
  ];
  a.natureTitle = 'What kind of property fits';
  a.nature = points.length ? points : ['No single planet dominates, so property decisions depend mostly on the timing below.'];
  a.jaimini = jai.list;
  a.technical = [`The 4th house is ${signName(signOfHouse(ctx, 4))}; the 4th lord ${lord4} is ${dignityNote(ctx, lord4)} in the ${ordinal(lord4Pos.house)} house.`, ...vargaLines(ctx, plan), ...interchart.evidence.map((item) => item.text)];

  const sigs = significators(ctx, { primary: [4], secondary: [2, 9, 11], karakas: [['Mars', 2], ['Venus', 1], ['Moon', 1]], extras: vargaExtras(ctx, plan.division, plan.houses, plan.label) });
  const from = ctx.today;
  const to = addYears(ctx.today, 3);
  const options: TimingOptions = { from, to, houses: [4], promiseScore: score, upcoming: 3, earlier: 0, min: 0.5, division: plan.division, note: DOUBLE_NOTE('home and property area') };
  a.groups = supportGroups(ctx, sigs, options, { upcoming: 'Windows favourable for buying property', earlier: '', blurb: `These are stretches when the planets in charge are tied to home, land and gains.${vargaBlurb(plan)}` });
  const timing = nextSentence('window for property', a.groups[0].windows);
  a.headline = focus === 'timing' ? (timing ?? 'No strong property window appears within 3 years.') : `${a.verdict.label} (${score}/100). ${timing ?? ''}`.trim();
  pushTiming(a, timing, 'No strongly favourable property window appears in the next 3 years.');
  a.notes = [COMMON_NOTE, 'Check your finances, legal title and the market independently. Astrology can point to favourable timing, not guarantee a purchase.'];
  if (!ctx.transits) a.notes.push(TRANSIT_NOTE);
  return a;
}

// ------------------------------------------------------------------ spiritual

function spiritual(ctx: Context, question: string, focus: Focus): Answer {
  const a = base(ctx, 'spiritual', 'Spirituality', question, focus);
  const plan = PLANS.spiritual;
  const v = vargaAssess(ctx, plan);
  const nine = blend(assessHouse(ctx, 9, 'Jupiter'), v, plan.weight);
  const twelve = assessHouse(ctx, 12, 'Ketu', true);
  const jai = jaiminiFor(ctx, ['spiritual']);
  const interchart = interchartRead(ctx, 'spiritual');
  const score = Math.max(5, Math.min(95, Math.round(0.6 * nine.score + 0.4 * twelve.score + jai.adjust + interchart.adjustment)));
  a.score = score;
  a.verdict = verdictFor(score, ['Strong spiritual current', 'Clear spiritual inclination', 'Developing spiritual interest', 'Subtle or late-blooming spirituality']);
  a.evidence = [...topEvidence(nine, 5).map((e) => ({ ...e, text: `Dharma (9th): ${e.text}` })), ...topEvidence(twelve, 3).map((e) => ({ ...e, text: `Liberation (12th): ${e.text}` })), ...jai.evidence, ...interchart.evidence];

  const p = (n: string) => planet(ctx, n);
  const strong = (n: string) => (ctx.strength[n] ?? 0) >= 1 || p(n).dignity === 'OWN' || p(n).dignity === 'EXALTED';
  const paths: [string, number, string][] = [
    ['knowledge and inquiry (Jnana): study, reflection and asking deep questions', ([1, 5, 9, 12].includes(p('Jupiter').house) ? 2 : 0) + ([5, 9, 12].includes(p('Ketu').house) ? 2 : 0) + (strong('Jupiter') ? 1 : 0), 'Jupiter and Ketu are placed in the houses of wisdom and letting go'],
    ['devotion (Bhakti): prayer, music, ritual and heartfelt faith', (strong('Moon') ? 2 : 0) + ([5, 9, 12].includes(p('Venus').house) ? 1 : 0) + ([4, 9, 12].includes(p('Moon').house) ? 1 : 0) + (linked(ctx, 'Moon', lordOfHouse(ctx, 9)) ? 1 : 0), 'the Moon and Venus support the heart-centred areas'],
    ['selfless service (Karma yoga): disciplined work offered as practice', ([6, 10, 12].includes(p('Saturn').house) ? 2 : 0) + (strong('Saturn') ? 1 : 0) + (aspectors(ctx, 10).includes('Saturn') ? 1 : 0), 'Saturn is well placed for discipline and service'],
    ['inner exploration: meditation, depth psychology or mystical practices', (occupants(ctx, 8).length ? 2 : 0) + (['Rahu', 'Ketu'].some((n) => [8, 12].includes(p(n).house)) ? 2 : 0) + (aspectors(ctx, 8).includes('Saturn') ? 1 : 0), 'planets or the nodes sit in the areas of hidden matters and letting go'],
  ];
  const ranked = paths.sort((x, y) => y[1] - x[1]);
  const likely = ranked.filter((x) => x[1] > 0).slice(0, 2);
  const atma = ctx.karakas[0].planet.name;

  a.plain = [
    `Overall your chart shows ${a.verdict.label.toLowerCase()} (${score} out of 100). Astrologers look at the 9th house (faith, wisdom and teachers), the 12th house (letting go and inner life), Jupiter and Ketu.`,
    vargaPlain(ctx, plan, 'spiritual practice', v),
    interchart.summary,
    `In Jaimini astrology your soul planet is ${atma}, the planet that shapes your deepest lessons in this life. Ketu, the planet of detachment, sits in ${p('Ketu').sign}.`,
  ];
  a.natureTitle = 'Likely spiritual path';
  a.nature = likely.length ? likely.map((x) => `${x[0]} (${x[2]}).`) : ['No single path dominates; exploring several practices is natural for this chart.'];
  a.jaimini = jai.list;
  a.technical = [`Ketu is in the ${ordinal(p('Ketu').house)} house (${p('Ketu').sign}); the Atmakaraka is ${atma}.`, ...vargaLines(ctx, plan), ...interchart.evidence.map((item) => item.text)];

  const sigs = significators(ctx, { primary: [9, 12], secondary: [5, 8], karakas: [['Ketu', 2], ['Jupiter', 2], ['Saturn', 1]], extras: [[atma, 1, 'Atmakaraka'], ...vargaExtras(ctx, plan.division, plan.houses, plan.label)] });
  const from = ctx.today;
  const to = addYears(ctx.today, 3);
  const options: TimingOptions = { from, to, houses: [9, 12], promiseScore: score, upcoming: 3, min: 0.5, division: plan.division, note: DOUBLE_NOTE('wisdom and inner-life areas') };
  a.groups = supportGroups(ctx, sigs, options, { upcoming: 'Periods that deepen spiritual life', earlier: '', blurb: `These are stretches that tend to turn attention inward.${vargaBlurb(plan)}` });
  const timing = nextSentence('period for spiritual deepening', a.groups[0].windows);
  a.headline = focus === 'timing' ? (timing ?? 'No distinctly strong spiritual window shows in the next 3 years.')
    : `${a.verdict.label} (${score}/100). ${likely.length ? `The most natural path is ${likely[0][0].split(':')[0]}.` : ''}`.trim();
  pushTiming(a, timing, 'No distinctly strong spiritual window shows in the next 3 years.');
  a.notes = [COMMON_NOTE];
  if (!ctx.transits) a.notes.push(TRANSIT_NOTE);
  return a;
}

// ------------------------------------------------------------------ health

function health(ctx: Context, question: string, focus: Focus): Answer {
  const a = base(ctx, 'health', 'Health and vitality', question, focus);
  const plan = PLANS.health;
  const v = vargaAssess(ctx, plan);
  const one = blend(assessHouse(ctx, 1, 'Sun'), v, plan.weight);
  const interchart = interchartRead(ctx, 'health');
  const moon = planet(ctx, 'Moon');
  let score = one.score + interchart.adjustment;
  const evidence = [...one.evidence, ...interchart.evidence];
  if ((ctx.strength.Moon ?? 1) >= 1) { score += 3; evidence.push({ text: 'The Moon (mind and body fluids) has good strength.', tone: 'good' }); }
  else { score -= 3; evidence.push({ text: 'The Moon is on the weaker side, so rest and emotional balance matter.', tone: 'bad' }); }
  const afflictedMoon = ['Saturn', 'Mars', 'Rahu', 'Ketu'].filter((n) => planet(ctx, n).signNumber === moon.signNumber);
  if (afflictedMoon.length) { score -= 4; evidence.push({ text: `${afflictedMoon.join(', ')} sits with the Moon, which can strain mind and digestion.`, tone: 'bad' }); }
  const dusthana = [6, 8, 12].flatMap((h) => occupants(ctx, h).map((n) => `${n} (${ordinal(h)})`));
  a.score = Math.max(5, Math.min(95, Math.round(score)));
  a.verdict = verdictFor(a.score, ['Robust vitality', 'Good vitality', 'Average vitality; keep routines steady', 'Needs extra care for health']);
  a.evidence = topEvidence({ score, evidence }, 9);

  const lagnaSign = ctx.chart.ascendant.signNumber;
  const sixSign = signOfHouse(ctx, 6);
  const watch = new Set<string>([`${BODY_AREA[lagnaSign - 1]} (linked to your rising sign, ${signName(lagnaSign)})`, `${BODY_AREA[sixSign - 1]} (linked to your health-issues area, ${signName(sixSign)})`]);
  for (const h of [6, 8, 12]) for (const n of occupants(ctx, h)) if (PLANET_BODY[n]) watch.add(`${PLANET_BODY[n]} (${n} sits in a testing area of your chart)`);
  const mars = planet(ctx, 'Mars');

  a.plain = [
    `Overall your chart shows ${a.verdict.label.toLowerCase()} (${a.score} out of 100). Astrologers look at the rising sign (your body and vitality), the Sun (life force), the Moon (mind and fluids) and the testing areas of the chart.`,
    dusthana.length ? `Planets in the testing areas of your chart: ${dusthana.join(', ')}. Treat this as a prompt for prevention and regular check-ups.` : 'No planets sit in the testing areas of your chart, which is protective.',
    interchart.summary,
    `Mars is in ${mars.sign}: take care with accidents, heat and inflammation during Mars-related periods.`,
    vargaPlain(ctx, plan, 'physical resilience', v),
  ];
  a.natureTitle = 'Areas to keep an eye on (general wellness, not diagnosis)';
  a.nature = [...watch].map((w) => `Pay attention to ${w}.`);
  a.technical = [dusthana.length ? `Planets in the difficult houses: ${dusthana.join(', ')}.` : 'No planets sit in the 6th, 8th or 12th houses.', ...vargaLines(ctx, plan), ...interchart.evidence.map((item) => item.text)];

  const sigs = significators(ctx, { primary: [1], secondary: [], karakas: [['Sun', 2], ['Moon', 1.5], ['Jupiter', 1]], extras: vargaExtras(ctx, plan.division, plan.houses, plan.label) });
  const stress = significators(ctx, { primary: [6, 8], secondary: [12], karakas: [['Mars', 1], ['Saturn', 1], ['Rahu', 0.5]] });
  const from = ctx.today;
  const to = addYears(ctx.today, 3);
  const options: TimingOptions = { from, to, houses: [1, 6, 8], promiseScore: a.score, upcoming: 3, min: 0.55, division: plan.division, note: PRESSURE_NOTE('body, health and recovery areas') };
  a.groups = [
    cautionGroup(ctx, sigs, stress, options, 'Periods that call for extra health care', 'In these stretches the planets tied to illness and endings outweigh the vitality planets. Use them for check-ups and prevention, not worry.'),
    ...supportGroups(ctx, sigs, { ...options, houses: [1], note: DOUBLE_NOTE('body and vitality area') }, { upcoming: 'Periods of strong vitality and recovery', earlier: '', blurb: 'These are stretches when the planets of vitality and recovery are in charge.' }),
  ];
  const care = a.groups[0].windows[0];
  a.headline = `${a.verdict.label} (${a.score}/100). ${care ? `Take extra care around ${formatRange(care.start, care.end)}.` : 'No strongly stressful health period stands out in the next 3 years.'}`;
  a.plain.push(care ? `A stretch that asks for extra care with health comes around ${formatRange(care.start, care.end)}. Regular check-ups, sleep and moderation help most then.` : 'No strongly stressful health period stands out in the next 3 years.');
  a.notes = [COMMON_NOTE, 'This is not medical advice. Please consult a qualified doctor for any health concern.'];
  if (!ctx.transits) a.notes.push(TRANSIT_NOTE);
  void focus;
  return a;
}

export const DOMAIN_BUILDERS: Record<DomainId, (ctx: Context, question: string, focus: Focus) => Answer> = {
  marriage, relationship, career, property, spiritual, health,
};
