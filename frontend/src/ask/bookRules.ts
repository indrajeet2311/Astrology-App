import { SIGN_LORDS, SIGN_NAMES } from '../constants';
import { rashiAspects } from '../jaiminiYogas';
import { shashtamshaSign } from '../vargas';
import {
  aspectors, BENEFICS, lordOfHouse, MALEFICS, occupants, ordinal, planet,
  signOfHouse, transitIntervals, vargaAspectors, vargaHouseOf, vargaHouseSign,
  vargaLord, vargaOccupants, vargaSign, vargaStatus,
} from './core';
import type { Context, Tone } from './core';
import type { Answer, DomainId } from './answers';

export interface BookFinding {
  id: string;
  title: string;
  text: string;
  tone: Tone;
  rule: string;
  book: string;
  pdfPages: string;
  evidence: string;
  charts: string[];
}

export interface BookTiming {
  start: string;
  end: string;
  relevance: number;
  tone: 'good' | 'caution';
  text: string;
  system: 'Vimshottari' | 'Yogini' | 'Chara';
  evidence: string;
  transitCheck?: 'active' | 'not-found';
  transitWindows?: { start: string; end: string }[];
  transitContacts?: { planet: string; target: string; aspect: string; start: string; end: string }[];
}

export const TOPIC_DIVISION: Record<DomainId, string> = {
  marriage: 'D9', relationship: 'D9', career: 'D10', children: 'D7',
  property: 'D4', spiritual: 'D20', health: 'D30',
};
const COMPREHENSIVE = 'V. P. Goel, Comprehensive Prediction by Divisional Charts';
const NAVAMSA = 'V. P. Goel, Predict with Navamsha';
const CAREER = 'V. P. Goel, Predict with Dashamsha';
const CHILDREN = 'V. P. Goel, Predict with Saptamsha';
const JUPITER_ASPECT_OFFSETS = [0, 4, 6, 8]; // whole-sign conjunction, 5th, 7th, 9th
const SATURN_ASPECT_OFFSETS = [0, 2, 6, 9]; // whole-sign conjunction, 3rd, 7th, 10th
const TRIK = [6, 8, 12];
const ANGLES_TRINES = [1, 4, 5, 7, 9, 10];
const PARTNERSHIP_QUALITIES: Record<string, string> = {
  Sun: 'mutual respect',
  Moon: 'emotional warmth',
  Mars: 'directness',
  Mercury: 'good conversation',
  Jupiter: 'shared values',
  Venus: 'affection',
  Saturn: 'patience',
  Rahu: 'strong or unconventional attraction',
  Ketu: 'independence',
};
const SPOUSE_STYLE: Record<string, string> = {
  Sun: 'confidence and strong will', Moon: 'care and emotional responsiveness',
  Mars: 'energy and directness', Mercury: 'wit and communication',
  Jupiter: 'generosity and principle', Venus: 'affection and sociability',
  Saturn: 'maturity, reserve and a sense of duty', Rahu: 'unconventional tastes or a different background',
  Ketu: 'privacy or an inward focus',
};
const CAREER_STYLES = [
  'Self-employment, leadership or building an organisation is indicated as a working style.',
  'Food-related work, a family business or work relying on speech is indicated.',
  'Communication, writing, contracts and short work trips are indicated, with scope for frequent role changes.',
  'Authority and recognition through work close to your home base are indicated.',
  'Frequent job changes or disagreements with managers are indicated as a recurring career theme.',
  'Employment and service work, particularly addressing practical problems such as disputes, debt or healthcare, are indicated.',
  'Business skills, corporate work, clients or partnerships are important themes in your earnings.',
  'An uncertain professional path with significant challenges and changes is indicated.',
  'Family influence or a family business can shape your career, alongside changes of role or location.',
  'Professional distinction and a visible reputation are indicated.',
  'More than one professional activity and opportunities to create work for others are indicated.',
  'Foreign-linked work, institutions or work in secluded settings are indicated.',
];
const EDUCATION_FIELDS = [
  'engineering, emergency services or competitive sport',
  'banking, fashion or music',
  'accountancy, writing or translation',
  'biology, nursing or hospitality',
  'government administration, investment or directing',
  'accounting, computing or editing',
  'law, management consulting or design',
  'chemistry, investigative work or insurance',
  'law, finance or social advocacy',
  'geology, agriculture or executive management',
  'electrical engineering, computing or invention',
  'social work, healthcare or film-making',
];
const STAR_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];

export function validateReadingChart(ctx: Context, domain: DomainId): void {
  const required = new Set([TOPIC_DIVISION[domain]]);
  if (domain === 'children') required.add('D9');
  if (domain === 'health') { required.add('D6'); required.add('D27'); }
  for (const name of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']) {
    if (!ctx.chart.planets.some((position) => position.name === name)) {
      throw new Error(`The birth chart is missing ${name}. Recalculate the chart before asking a question.`);
    }
  }
  for (const position of [ctx.chart.ascendant, ...ctx.chart.planets]) {
    if (!Number.isInteger(position.signNumber) || position.signNumber < 1 || position.signNumber > 12) {
      throw new Error('The birth chart contains an invalid sign. Recalculate it before asking a question.');
    }
    if (position !== ctx.chart.ascendant && (!Number.isInteger(position.house) || position.house < 1 || position.house > 12)) {
      throw new Error(`The birth chart has an invalid house for ${position.name}. Recalculate it before asking a question.`);
    }
    if (!Number.isFinite(position.longitude) || position.longitude < 0 || position.longitude >= 360) {
      throw new Error(`The birth chart has an invalid longitude for ${position.name ?? 'Ascendant'}. Recalculate it before asking a question.`);
    }
    for (const division of required) {
      const sign = position.divisionalSigns[division] ?? (division === 'D6' ? shashtamshaSign(position.longitude) : undefined);
      if (!Number.isInteger(sign) || sign < 1 || sign > 12) {
        throw new Error(`The ${division} chart is incomplete for ${position.name ?? 'Ascendant'}. Recalculate the birth chart before generating a reading.`);
      }
    }
  }
}

const houseOf = (ctx: Context, name: string, division: string) =>
  division === 'D1' ? planet(ctx, name).house : vargaHouseOf(ctx, name, division);
const lord = (ctx: Context, house: number, division: string) =>
  division === 'D1' ? lordOfHouse(ctx, house) : vargaLord(ctx, division, house);
const inHouse = (ctx: Context, house: number, division: string) =>
  division === 'D1' ? occupants(ctx, house) : vargaOccupants(ctx, division, house);
const aspects = (ctx: Context, house: number, division: string) =>
  division === 'D1' ? aspectors(ctx, house) : vargaAspectors(ctx, division, house);
const influences = (ctx: Context, house: number, division: string) =>
  [...new Set([...inHouse(ctx, house, division), ...aspects(ctx, house, division)])];
const status = (ctx: Context, name: string, division: string) =>
  division === 'D1' ? planet(ctx, name).dignity : vargaStatus(ctx, name, division);
const strong = (ctx: Context, name: string, division: string) =>
  ['EXALTED', 'OWN', 'Exalted', 'Own'].includes(status(ctx, name, division) ?? '');

/** The sign lord disposes a planet; follow that chain until it repeats. */
function dispositorChain(ctx: Context, name: string, division: string): string[] {
  const chain: string[] = [];
  let current = name;
  while (ctx.chart.planets.some((position) => position.name === current) && chain.length < 7) {
    const sign = division === 'D1' ? planet(ctx, current).signNumber : vargaSign(ctx, current, division);
    const owner = SIGN_LORDS[sign - 1];
    if (owner === current || chain.includes(owner)) break;
    chain.push(owner);
    current = owner;
  }
  return chain;
}

function dispositorEvidence(ctx: Context, name: string, division: string): string {
  const chain = dispositorChain(ctx, name, division);
  return chain.length ? chain.map((owner) =>
    `${owner} (${division} ${status(ctx, owner, division)}, H${houseOf(ctx, owner, division)})`).join(' → ') : 'self-disposed';
}

function dispositorSupport(ctx: Context, name: string, division: string): boolean {
  const owner = dispositorChain(ctx, name, division)[0];
  return !!owner && (strong(ctx, owner, division) || ANGLES_TRINES.includes(houseOf(ctx, owner, division)))
    && !planetCondition(ctx, owner, division).pressure.length;
}

function disposedPlanets(ctx: Context, name: string, division: string): string[] {
  return ctx.chart.planets.filter((position) =>
    dispositorChain(ctx, position.name, division).includes(name)).map((position) => position.name);
}
const connections = (ctx: Context, name: string, division: string) =>
  [...new Set([
    ...influences(ctx, houseOf(ctx, name, division), division),
    ...dispositorChain(ctx, name, division),
    ...disposedPlanets(ctx, name, division),
  ])].filter((other) => other !== name);
const linked = (ctx: Context, a: string, b: string, division: string) =>
  a === b || connections(ctx, a, division).includes(b) || connections(ctx, b, division).includes(a);
const related = (ctx: Context, name: string, house: number, division: string) =>
  name === lord(ctx, house, division) || influences(ctx, house, division).includes(name)
  || linked(ctx, name, lord(ctx, house, division), division);

function houseOffset(target: number, offset: number): number {
  return ((target + offset - 2) % 12) + 1;
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;

function transitTargets(ctx: Context, domain: DomainId, periodLords: string[] = []): { sign: number; label: string }[] {
  const targets = new Map<string, { sign: number; label: string }>();
  const add = (sign: number, label: string) => targets.set(`${sign}:${label}`, { sign, label });
  if (domain === 'marriage' || domain === 'relationship') {
    const d1SeventhLord = lordOfHouse(ctx, 7);
    const d9SeventhLord = vargaLord(ctx, 'D9', 7);
    add(planet(ctx, 'Moon').signNumber, 'natal Moon sign');
    add(ctx.chart.ascendant.signNumber, 'birth-chart rising sign');
    add(signOfHouse(ctx, 7), 'birth-chart seventh-house sign');
    add(planet(ctx, d1SeventhLord).signNumber, `birth-chart seventh lord ${d1SeventhLord}`);
    add(planet(ctx, 'Venus').signNumber, 'birth-chart Venus');
    add(vargaHouseSign(ctx, 'D9', 1), 'Navamsa rising sign');
    add(vargaHouseSign(ctx, 'D9', 7), 'Navamsa seventh-house sign');
    add(vargaSign(ctx, d9SeventhLord, 'D9'), `Navamsa seventh lord ${d9SeventhLord}`);
    add(vargaSign(ctx, 'Venus', 'D9'), 'Navamsa Venus');
    for (const name of [d1SeventhLord, 'Venus']) {
      for (const disposer of dispositorChain(ctx, name, 'D1')) {
        add(planet(ctx, disposer).signNumber, `dispositor ${disposer} of ${name}`);
      }
    }
    for (const name of [d9SeventhLord, 'Venus']) {
      for (const disposer of dispositorChain(ctx, name, 'D9')) {
        add(vargaSign(ctx, disposer, 'D9'), `Navamsa dispositor ${disposer} of ${name}`);
      }
    }
  } else if (domain === 'career') {
    const d1TenthLord = lordOfHouse(ctx, 10);
    const d10TenthLord = vargaLord(ctx, 'D10', 10);
    const d10AscendantLord = vargaLord(ctx, 'D10', 1);
    for (const h of [2, 10, 11]) {
      const houseLabel = h === 2 ? 'income' : h === 10 ? 'career' : 'gains';
      add(signOfHouse(ctx, h), `birth-chart ${houseLabel} house sign`);
      add(planet(ctx, lordOfHouse(ctx, h)).signNumber, `birth-chart ${ordinal(h)}-house lord ${lordOfHouse(ctx, h)}`);
    }
    for (const h of [1, 2, 10, 11]) {
      add(vargaHouseSign(ctx, 'D10', h), `Dashamsha ${h === 1 ? 'rising' : ordinal(h) + '-house'} sign`);
      const houseLord = vargaLord(ctx, 'D10', h);
      add(vargaSign(ctx, houseLord, 'D10'), `Dashamsha ${ordinal(h)}-house lord ${houseLord}`);
    }
    for (const name of [d1TenthLord, d10TenthLord, d10AscendantLord]) {
      const division = name === d1TenthLord ? 'D1' : 'D10';
      for (const disposer of dispositorChain(ctx, name, division)) {
        add(division === 'D1' ? planet(ctx, disposer).signNumber : vargaSign(ctx, disposer, 'D10'),
          `${division} dispositor ${disposer} of ${name}`);
      }
    }
  }
  for (const name of periodLords) {
    if (ctx.chart.planets.some((position) => position.name === name)) {
      add(planet(ctx, name).signNumber, `active dasha lord ${name}`);
    }
  }
  return [...targets.values()];
}

function transitAspectLabel(offset: number): string {
  return ({ 0: 'conjunction', 2: '3rd aspect', 4: '5th aspect', 6: '7th aspect', 8: '9th aspect', 9: '10th aspect' } as Record<number, string>)[offset];
}

function singleTransitIntervals(ctx: Context, planetName: string, targetSign: number, from: string, to: string): [string, string][] {
  const segments = ctx.transits?.tracks.find((track) => track.name === planetName)?.segments ?? [];
  const points = new Set<string>([from, to]);
  for (const segment of segments) if (segment.start > from && segment.start < to) points.add(segment.start);
  const dates = [...points].sort();
  const result: [string, string][] = [];
  for (let i = 0; i + 1 < dates.length; i++) {
    if (segments.find((segment) => segment.start <= dates[i] && dates[i] < segment.end)?.signNumber !== targetSign) continue;
    const last = result[result.length - 1];
    if (last && last[1] === dates[i]) last[1] = dates[i + 1];
    else result.push([dates[i], dates[i + 1]]);
  }
  return result;
}

function topicTransitContacts(ctx: Context, domain: DomainId, from: string, to: string, periodLords: string[] = []) {
  const contacts: NonNullable<BookTiming['transitContacts']> = [];
  const targets = transitTargets(ctx, domain, periodLords);
  for (const target of targets) {
    for (const transitPlanet of ['Jupiter', 'Saturn'] as const) {
      const offsets = transitPlanet === 'Jupiter' ? JUPITER_ASPECT_OFFSETS : SATURN_ASPECT_OFFSETS;
      for (const offset of offsets) {
        const intervals = transitIntervals(ctx, (jupiter, saturn) => {
          const transitSign = transitPlanet === 'Jupiter' ? jupiter : saturn;
          return mod12(target.sign - transitSign) === offset;
        }, from, to);
        for (const [start, end] of intervals) {
          if ((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000 < 20) continue;
          contacts.push({ planet: transitPlanet, target: target.label,
            aspect: transitAspectLabel(offset), start, end });
        }
      }
    }
  }
  const transitTargetsForDashaLords = domain === 'marriage' || domain === 'relationship'
    ? [
      { sign: planet(ctx, lordOfHouse(ctx, 7)).signNumber, label: `birth-chart seventh lord ${lordOfHouse(ctx, 7)}` },
      { sign: planet(ctx, 'Venus').signNumber, label: 'birth-chart Venus' },
    ]
    : domain === 'career'
      ? [
        { sign: vargaSign(ctx, vargaLord(ctx, 'D10', 10), 'D10'), label: `Dashamsha tenth lord ${vargaLord(ctx, 'D10', 10)}` },
        { sign: vargaHouseSign(ctx, 'D10', 10), label: 'Dashamsha tenth-house sign' },
      ] : [];
  for (const name of new Set(periodLords)) {
    for (const target of transitTargetsForDashaLords) {
      for (const [start, end] of singleTransitIntervals(ctx, name, target.sign, from, to)) {
        contacts.push({ planet: `dasha lord ${name}`, target: target.label, aspect: 'transits over', start, end });
      }
    }
  }
  const priority = (contact: NonNullable<BookTiming['transitContacts']>[number]) => {
    if (contact.planet.startsWith('dasha lord ')) return 0;
    if (domain === 'marriage' || domain === 'relationship') {
      if (contact.target.startsWith('Navamsa rising') || contact.target.startsWith('Navamsa seventh lord')) return 1;
      if (contact.target.includes('birth-chart seventh lord') || contact.target === 'birth-chart Venus'
        || contact.target.startsWith('active dasha lord')) return 2;
    } else if (domain === 'career') {
      if (contact.target.startsWith('Dashamsha rising') || contact.target.startsWith('Dashamsha tenth lord')
        || contact.target === 'Dashamsha tenth-house sign') return 1;
      if (contact.target.includes('10th-house lord') || contact.target.startsWith('active dasha lord')) return 2;
    }
    return contact.planet === 'Jupiter' ? 3 : 4;
  };
  return contacts.sort((a, b) => priority(a) - priority(b) || a.start.localeCompare(b.start)
    || Number(a.planet !== 'Jupiter') - Number(b.planet !== 'Jupiter')
    || a.target.localeCompare(b.target));
}

// Occupant-based Argala used in the Dashamsha status and rise chapters.
function argalaPlanets(ctx: Context, target: number, division: string): string[] {
  const channels = [[2, 12], [4, 10], [11, 3]];
  return channels.flatMap(([source, obstruction]) => {
    const contributors = inHouse(ctx, houseOffset(target, source), division);
    const blockers = inHouse(ctx, houseOffset(target, obstruction), division);
    return contributors.length > blockers.length ? contributors : [];
  });
}

// House-lord association is explicitly protective in the D9 marriage rules.
function houseCondition(ctx: Context, house: number, division: string) {
  const names = influences(ctx, house, division);
  const owner = lord(ctx, house, division);
  const support = names.filter((name) => BENEFICS.includes(name) || name === owner);
  const pressure = names.filter((name) => MALEFICS.includes(name) && name !== owner);
  return { support, pressure };
}

function planetCondition(ctx: Context, name: string, division: string) {
  const names = connections(ctx, name, division);
  return {
    support: names.filter((other) => BENEFICS.includes(other)),
    pressure: names.filter((other) => MALEFICS.includes(other)),
  };
}

export function evaluateBookFindings(ctx: Context, domain: DomainId): BookFinding[] {
  validateReadingChart(ctx, domain);
  const findings: BookFinding[] = [];
  const primaryHouse = { marriage: 7, relationship: 7, career: 10, children: 5, property: 4, spiritual: 9, health: 1 }[domain];
  const division = TOPIC_DIVISION[domain];
  const natalLord = lordOfHouse(ctx, primaryHouse);
  const natalContext = `D1 H${primaryHouse}: occupants ${occupants(ctx, primaryHouse).join('/') || 'none'}, aspects ${aspectors(ctx, primaryHouse).join('/') || 'none'}; D1 topic lord ${natalLord}: H${planet(ctx, natalLord).house}, ${planet(ctx, natalLord).dignity ?? 'ordinary dignity'}; carried into ${division}: H${vargaHouseOf(ctx, natalLord, division)}, ${vargaStatus(ctx, natalLord, division)}`;
  const add = (matched: boolean, id: string, title: string, text: string, tone: Tone,
    rule: string, book: string, pdfPages: string, evidence: string) => {
    if (!matched) return;
    findings.push({ id, title, text, tone, rule, book, pdfPages,
      evidence: `${natalContext}; matched condition: ${evidence}`, charts: ['D1', division] });
  };

  if (domain === 'marriage' || domain === 'relationship') {
    const foundations = [1, 2, 7].map((house) => ({ house, ...houseCondition(ctx, house, 'D9') }));
    const supportedHouses = foundations.filter((item) => item.support.length > 0 && !item.pressure.length);
    const pressuredHouses = foundations.filter((item) => item.pressure.length > 0 && !item.support.length);
    const supported = supportedHouses.length >= 2;
    const pressured = pressuredHouses.length === foundations.length;
    const natalPromise = houseCondition(ctx, 7, 'D1');
    const natalSupportsMarriage = natalPromise.support.length > 0;
    const natalPressured = natalPromise.pressure.length > 0 && !natalSupportsMarriage;
    const stronglyPressured = pressured && natalPressured;
    const navamsaMarriageLord = vargaLord(ctx, 'D9', 7);
    const d9LordStrong = strong(ctx, navamsaMarriageLord, 'D9');
    const d9LordCondition = planetCondition(ctx, navamsaMarriageLord, 'D9');
    const d9HouseTraits = [...new Set(influences(ctx, 7, 'D9'))]
      .map((name) => SPOUSE_STYLE[name]).filter(Boolean).slice(0, 2);
    const d9LordTrait = SPOUSE_STYLE[navamsaMarriageLord];
    const spouseStyle = d9HouseTraits.length
      ? `Partner tendencies include ${d9HouseTraits.join('; ')}${d9LordTrait && !d9HouseTraits.includes(d9LordTrait) ? `; ${d9LordTrait}` : ''}.`
      : d9LordTrait ? `Partner tendencies include ${d9LordTrait}.`
        : 'The chart gives a broad picture of partner qualities.';
    const relationshipQualities = [...new Set([...influences(ctx, 7, 'D1'), ...influences(ctx, 7, 'D9')])]
      .map((name) => PARTNERSHIP_QUALITIES[name]).filter(Boolean);
    const qualityList = relationshipQualities.slice(0, 3);
    const qualityPhrase = qualityList.length < 2 ? qualityList[0] ?? ''
      : `${qualityList.slice(0, -1).join(', ')}, and ${qualityList[qualityList.length - 1]}`;
    const partnershipStyle = relationshipQualities.length
      ? `You may value ${qualityPhrase} in a partner.` : '';
    const natalLordHouse = houseOf(ctx, lordOfHouse(ctx, 7), 'D1');
    const sharedLifeNote = natalLordHouse === 8
      ? 'Trust, intimacy and shared responsibilities will benefit from frank conversations.'
      : natalLordHouse === 6
        ? 'Daily responsibilities and disagreements will benefit from practical, respectful problem-solving.'
        : natalLordHouse === 12
          ? 'Balancing closeness with privacy and personal space will matter.' : '';
    const promiseSupportPresent = natalSupportsMarriage || foundations.some((item) => item.support.length > 0) || d9LordStrong;
    add(true, 'marriage-readiness', 'Marriage prospects', supported && natalSupportsMarriage
      ? `Marriage has constructive traditional support. Patience around shared responsibilities will help. ${partnershipStyle} ${sharedLifeNote}`
      : stronglyPressured
        ? `Marriage is indicated, though the overall signals are mixed and call for patience and careful adjustment. ${partnershipStyle} ${sharedLifeNote}`
        : promiseSupportPresent
          ? `Marriage is indicated, but the overall support is mixed; patience and realistic expectations matter. ${partnershipStyle} ${sharedLifeNote}`
          : 'The marriage indicators are mixed, so the chart does not support a firm yes-or-no verdict. The timing and the wider relationship picture need to be weighed too.',
    supported && natalSupportsMarriage ? 'good' : stronglyPressured ? 'neutral' : 'neutral', 'D1 seventh-house promise; D9 ascendant, second and seventh-house associations; house-lord associations count as protective', NAVAMSA + '; ' + COMPREHENSIVE, 'Navamsha 17–20; Comprehensive 136–138',
    `D1 seventh protective ${natalPromise.support.join('/') || 'none'}; ` + foundations.map((item) => `D9 H${item.house}: protective ${item.support.join('/') || 'none'}; pressure ${item.pressure.join('/') || 'none'}`).join('; '));

    const quality = (division: string) => {
      const condition = houseCondition(ctx, 7, division);
      const naturalSupport = condition.support.filter((name) => BENEFICS.includes(name));
      const partnershipLord = lord(ctx, 7, division);
      const lordPressure = planetCondition(ctx, partnershipLord, division);
      const d9LifeHouses = [2, 4, 5, 6, 8, 9, 10, 11, 12];
      const lifeSupport = division === 'D9'
        ? d9LifeHouses.filter((house) => {
          const item = houseCondition(ctx, house, 'D9');
          return item.support.length > 0 && !item.pressure.length;
        }).length : 0;
      const lifePressure = division === 'D9'
        ? d9LifeHouses.filter((house) => houseCondition(ctx, house, 'D9').pressure.length > 0).length : 0;
      if (naturalSupport.length >= 2 && !condition.pressure.length) return 'support';
      if (division === 'D9' && strong(ctx, partnershipLord, 'D9') && lifeSupport >= 2
        && lifeSupport >= lifePressure) return 'support';
      return TRIK.includes(houseOf(ctx, partnershipLord, division)) && lordPressure.pressure.length >= 2
        && !lordPressure.support.length ? 'pressure' : 'mixed';
    };
    const early = quality('D1');
    const mature = quality('D9');
    const d9RelationshipThemes: Record<number, string> = {
      2: 'family life and shared resources', 4: 'domestic happiness', 5: 'affection and shared decisions',
      6: 'resolving everyday disagreements', 8: 'trust and shared responsibilities', 9: 'shared values', 10: 'marital duties',
      11: 'friendship and shared goals', 12: 'intimacy and personal space',
    };
    const d9SupportThemes = [2, 5, 6, 8, 9, 10, 11, 12].filter((house) => {
      const item = houseCondition(ctx, house, 'D9');
      return item.support.length > 0 && item.pressure.length === 0;
    }).map((house) => d9RelationshipThemes[house]);
    const d9PressureThemes = [2, 5, 6, 8, 9, 10, 11, 12].filter((house) =>
      houseCondition(ctx, house, 'D9').pressure.length > 0)
      .map((house) => d9RelationshipThemes[house]);
    const relationshipDispositorSupport = dispositorSupport(ctx, navamsaMarriageLord, 'D9') || dispositorSupport(ctx, 'Venus', 'D9');
    const d9QualityDetail = `${d9LordStrong || relationshipDispositorSupport ? 'The long-term bond has strength to build on' : 'The long-term bond has both support and demands'}${d9SupportThemes[0] ? `, especially around ${d9SupportThemes[0]}` : ''}${d9PressureThemes[0] ? `; ${d9PressureThemes[0]} needs patience` : ''}. ${relationshipDispositorSupport
      ? 'Consistent effort can help build trust and steadiness.'
      : 'Build trust and steadiness through consistent effort.'}`;
    add(true, 'marriage-quality', 'How married life may develop',
      early === 'support' && mature === 'pressure'
        ? 'The beginning may feel easier; shared responsibilities will call for more adjustment. Open, patient communication will help.'
        : early === 'pressure' && mature === 'support'
          ? 'The beginning may require more effort, while married life has potential to grow steadier over time.'
      : mature === 'support' || (d9LordStrong && d9LordCondition.pressure.length)
              ? d9LordCondition.pressure.length
              ? d9QualityDetail
              : 'Commitment and affection are supported, with scope to build a steady bond over time.'
            : mature === 'pressure'
              ? 'Married life may need regular adjustment around shared expectations and responsibilities.'
              : `${d9QualityDetail} Mutual effort will shape how these themes develop.`,
      mature === 'support' ? 'good' : mature === 'pressure' ? 'bad' : 'neutral',
      'Compare D1 and D9 seventh-house benefic/malefic associations and the condition of each seventh lord; later Navamsa quality can differ from the beginning', NAVAMSA + '; ' + COMPREHENSIVE, 'Navamsha 20–22; Comprehensive 136–138',
      `D1 seventh-house quality ${early}; D9 ${mature}; D9 seventh-lord dispositor chain ${dispositorEvidence(ctx, navamsaMarriageLord, 'D9')}; Venus dispositor chain ${dispositorEvidence(ctx, 'Venus', 'D9')}; dispositors provide ${relationshipDispositorSupport ? 'support' : 'no clear additional support'}. Mixed influences remain mixed; no gender-specific significator assumed.`);

    const seventh = vargaLord(ctx, 'D9', 7);
    const caring = [seventh, 'Venus'].some((name) => {
      const condition = planetCondition(ctx, name, 'D9');
      const self = vargaLord(ctx, 'D9', 1);
      return condition.support.length > 0 && condition.pressure.every((other) => other === self);
    });
    add(true, 'marriage-care', 'Partner qualities', caring
      ? `${spouseStyle} Warmth and care are supported in partnership.`
        : `${spouseStyle} Attraction is strong; lasting closeness will depend on patience, care and consistency.`,
    caring ? 'good' : 'neutral', 'Benefic-only association with Venus or the D9 seventh lord; absence of this combination is not evidence of disloyalty', COMPREHENSIVE, '146',
    [seventh, 'Venus'].map((name) => `${name}: associates ${connections(ctx, name, 'D9').join('/') || 'none'}`).join('; '));

    const family = houseCondition(ctx, 2, 'D9');
    add(true, 'marriage-family', 'Family life and communication', family.pressure.length && !family.support.length
          ? 'Family, communication or shared-money discussions may need particular care.'
      : family.support.length && !family.pressure.length
        ? 'Family adjustment and communication have support. Honest conversations about finances can help create a steadier home life.'
        : family.pressure.length && family.support.length
          ? 'There is support as well as pressure around family communication and shared money. Clear, respectful conversations can help.'
          : 'The chart gives no strong one-sided indication about family or money discussions. How two families relate will depend on their choices and circumstances.',
    family.pressure.length && !family.support.length ? 'bad' : family.support.length && !family.pressure.length ? 'good' : 'neutral',
    'D9 second house: speech and family tensions', COMPREHENSIVE, '143',
    `D9 H2 protective ${family.support.join('/') || 'none'}; pressure ${family.pressure.join('/') || 'none'}`);

    const married = [...new Set([seventh, 'Venus'])].map((name) => {
      const house = vargaHouseOf(ctx, name, 'D9');
      const condition = planetCondition(ctx, name, 'D9');
      return { name, house, ...condition };
    });
    const difficult = (item: typeof married[number]) => TRIK.includes(item.house)
      && !(item.name === 'Venus' && item.house === 12);
    const recovery = married.some((item) => difficult(item) && item.pressure.length && item.support.length);
    const strain = married.some((item) => difficult(item) && item.pressure.length && !item.support.length);
    const d9Family = houseCondition(ctx, 2, 'D9');
    const d9Happiness = houseCondition(ctx, 4, 'D9');
    const d9Gains = houseCondition(ctx, 11, 'D9');
    const d1Family = houseCondition(ctx, 2, 'D1');
    const d1Gains = houseCondition(ctx, 11, 'D1');
    const afterMarriageDispositorSupport = dispositorSupport(ctx, navamsaMarriageLord, 'D9') || dispositorSupport(ctx, 'Venus', 'D9');
    const materialSupport = [d9Family, d9Gains, d1Family, d1Gains]
      .some((item) => item.support.length > 0 && !item.pressure.length)
      || married.some((item) => [2, 3, 6, 10, 11].includes(item.house)
        && item.support.length > 0 && !item.pressure.length)
      || afterMarriageDispositorSupport;
    const domesticSupport = d9Happiness.support.length > 0 && !d9Happiness.pressure.length;
    const relationshipStrength = d9LordStrong || strong(ctx, 'Venus', 'D9');
    const lifePressure = [d9Family, d9Happiness, d9Gains].some((item) =>
      item.pressure.length > 0 && !item.support.length)
      || married.some((item) => item.pressure.length > 0);
    const prosperity = materialSupport && (domesticSupport || relationshipStrength);
    const afterMarriageBase = recovery
      ? 'Shared comfort can grow, though periods of strain may call for patience and repair. Keep money decisions open and agree on family responsibilities.'
      : prosperity && !lifePressure
        ? 'The chart supports a comfortable married life and gradual gains. Shared resources and family life can strengthen through joint effort.'
        : materialSupport || domesticSupport || relationshipStrength
          ? 'There is scope to build a comfortable home and improve shared finances, but gains depend on steady joint effort. Agree on spending and family responsibilities.'
          : strain || lifePressure
            ? 'Domestic ease and shared finances may take more effort. Clear agreements about spending and family responsibilities will help.'
            : 'Shared comfort is more likely to grow through joint planning and steady effort than through a sudden financial change after marriage.';
    const afterMarriageText = afterMarriageBase;
    add(true, 'marriage-after', 'Life after marriage', afterMarriageText,
    prosperity && !lifePressure ? 'good' : strain || lifePressure ? 'neutral' : 'neutral',
    'D9 seventh lord and Venus placement, dignity, sign dispositors and benefic/malefic associations; D9 second, fourth and eleventh houses; repeat support from D1',
    COMPREHENSIVE + '; ' + NAVAMSA, 'Comprehensive D9 143–144, 153–160; Navamsha 19–24, 50–57',
    `D9 family/happiness/gains support ${d9Family.support.join('/') || 'none'}/${d9Happiness.support.join('/') || 'none'}/${d9Gains.support.join('/') || 'none'}; pressure ${d9Family.pressure.join('/') || 'none'}/${d9Happiness.pressure.join('/') || 'none'}/${d9Gains.pressure.join('/') || 'none'}; D1 family/gains support ${d1Family.support.join('/') || 'none'}/${d1Gains.support.join('/') || 'none'}; D9 lord dignity ${vargaStatus(ctx, seventh, 'D9')}; Venus dignity ${vargaStatus(ctx, 'Venus', 'D9')}; D9 lord/Venus strength ${d9LordStrong}/${strong(ctx, 'Venus', 'D9')}; D9 lord dispositor chain ${dispositorEvidence(ctx, seventh, 'D9')}; Venus dispositor chain ${dispositorEvidence(ctx, 'Venus', 'D9')}; prior after-marriage affliction/recovery ${strain}/${recovery}`);
  } else if (domain === 'career') {
    const self = lordOfHouse(ctx, 1);
    const profession = lordOfHouse(ctx, 10);
    const d10AscendantLord = vargaLord(ctx, 'D10', 1);
    const d10ProfessionLord = vargaLord(ctx, 'D10', 10);
    const d10AscendantCondition = planetCondition(ctx, d10AscendantLord, 'D10');
    const d10ProfessionCondition = planetCondition(ctx, d10ProfessionLord, 'D10');
    const d10CareerHouse = houseCondition(ctx, 10, 'D10');
    const d10DispositorSupport = dispositorSupport(ctx, d10ProfessionLord, 'D10');
    const d10EffortSupport = (strong(ctx, d10AscendantLord, 'D10')
      || ANGLES_TRINES.includes(vargaHouseOf(ctx, d10AscendantLord, 'D10')))
      && !d10AscendantCondition.pressure.length;
    const d10WorkSupport = strong(ctx, d10ProfessionLord, 'D10')
      || d10CareerHouse.support.length >= 2 || d10ProfessionCondition.support.length > 0 || d10DispositorSupport;
    const supported = [self, profession].every((name) =>
      strong(ctx, name, 'D10') && !TRIK.includes(vargaHouseOf(ctx, name, 'D10'))
      && !planet(ctx, name).combust && !planetCondition(ctx, name, 'D10').pressure.length)
      && d10EffortSupport && d10WorkSupport;
    const challenged = [self, profession].some((name) =>
      TRIK.includes(vargaHouseOf(ctx, name, 'D10')) && planetCondition(ctx, name, 'D10').pressure.length);
    add(true, 'career-foundation', 'Career stability', supported
      ? 'The chart supports sustained effort and a clear professional direction, with scope to take on responsibility and earn recognition.'
      : challenged
        ? 'Career progress may involve demanding transitions. The chart still shows work capacity; strengthen your position through relevant skills and reliable results.'
        : 'There is a mix of professional drive and pressure. Steady skill-building, clear goals and choosing work that fits your strengths can help you progress.',
    supported ? 'good' : challenged ? 'bad' : 'neutral',
    'D1 career capacity, D10 lagna motivation, D10 tenth-house profession and the strength/affliction of their lords', CAREER, '13–20',
    [self, profession].map((name) => `${name}: D10 ${vargaStatus(ctx, name, 'D10')}, H${vargaHouseOf(ctx, name, 'D10')}; D10 dispositor ${dispositorEvidence(ctx, name, 'D10')}`).join('; '));

    const d1CareerDispositorSupport = dispositorSupport(ctx, profession, 'D1');
    add(true, 'career-dispositors', 'Factors supporting career progress', d10DispositorSupport || d1CareerDispositorSupport
      ? 'Other career factors reinforce the main professional picture. Progress is more likely when you use your strengths and choose periods that support action.'
      : 'Career progress may take extra effort to consolidate. Build relevant skills, take responsibility and judge opportunities by their practical value.',
    d10DispositorSupport || d1CareerDispositorSupport ? 'good' : 'neutral',
    'Assess the dispositor of the birth-chart and Dashamsha tenth lords by sign, house, dignity and association; the Dashamsha tenth lord remains central',
    CAREER + '; ' + COMPREHENSIVE, 'Dashamsha 13–20, 73–93; Comprehensive 10–12',
    `D1 tenth lord ${profession} dispositor chain ${dispositorEvidence(ctx, profession, 'D1')}; D10 tenth lord ${d10ProfessionLord} dispositor chain ${dispositorEvidence(ctx, d10ProfessionLord, 'D10')}; D10 Lagna lord ${d10AscendantLord} dispositor chain ${dispositorEvidence(ctx, d10AscendantLord, 'D10')}; D1/D10 chain support ${d1CareerDispositorSupport}/${d10DispositorSupport}`);

    const birthDay = ctx.chart.birthDetails.date;
    const birthMahadasha = ctx.chart.dashas.find((period) => period.start.slice(0, 10) <= birthDay && birthDay < period.end.slice(0, 10));
    const birthAntardasha = birthMahadasha?.antardashas.find((period) => period.start.slice(0, 10) <= birthDay && birthDay < period.end.slice(0, 10));
    const d10StatusConnection = (name: string) => vargaHouseOf(ctx, name, 'D10') === 10
      || name === d10ProfessionLord || name === d10AscendantLord
      || influences(ctx, 10, 'D10').includes(name) || influences(ctx, 1, 'D10').includes(name);
    const birthDashaStatus = Boolean(birthMahadasha && birthAntardasha
      && related(ctx, birthMahadasha.lord, 10, 'D1') && related(ctx, birthAntardasha.lord, 10, 'D1')
      && d10StatusConnection(birthMahadasha.lord) && d10StatusConnection(birthAntardasha.lord));
    add(true, 'career-status', 'Recognition and professional standing', birthDashaStatus
      ? 'The career chart has a strong traditional indicator for recognition through your work. Build a reputation on dependable results and sound judgment.'
      : 'Recognition is more likely to grow through useful experience and visible results than through a single guaranteed leap in status.',
    birthDashaStatus ? 'good' : 'neutral', 'Vimshottari lords active at birth connect with the D1 tenth house and repeat through D10 status factors', CAREER, '73–75; 84–93',
    `Birth MD/AD ${birthMahadasha?.lord ?? 'unavailable'}/${birthAntardasha?.lord ?? 'unavailable'}; both connected to D1 tenth ${Boolean(birthMahadasha && birthAntardasha && related(ctx, birthMahadasha.lord, 10, 'D1') && related(ctx, birthAntardasha.lord, 10, 'D1'))}; D10 status confirmation ${birthDashaStatus}`);

    const rising = (division: string) =>
      inHouse(ctx, 10, division).length > 0 && [3, 6, 11].filter((house) => inHouse(ctx, house, division).length > 0).length >= 2;
    const upachayaRise = rising('D1') && rising('D10');
    const repeatedRajYoga = [4, 7, 10].some((angular) => [5, 9].some((trinal) => {
      const angularLord = lord(ctx, angular, 'D1');
      const trinalLord = lord(ctx, trinal, 'D1');
      return linked(ctx, angularLord, trinalLord, 'D1')
        && linked(ctx, angularLord, trinalLord, 'D10');
    }));
    const birthTenthArgala = argalaPlanets(ctx, 10, 'D1');
    const professionTenthArgala = argalaPlanets(ctx, 10, 'D10');
    const professionAscendantArgala = argalaPlanets(ctx, 1, 'D10');
    const repeatedCareerArgala = birthTenthArgala.some((name) =>
      professionTenthArgala.includes(name) || professionAscendantArgala.includes(name));
    const strongD10ProfessionLord = strong(ctx, d10ProfessionLord, 'D10')
      && !TRIK.includes(vargaHouseOf(ctx, d10ProfessionLord, 'D10'));
    const rise = upachayaRise || repeatedRajYoga || repeatedCareerArgala
      || (strongD10ProfessionLord && d10CareerHouse.support.length > 0
        && !d10CareerHouse.pressure.length);
    add(true, 'career-growth', 'Growth and recognition', rise
      ? 'Repeated support for achievement across your birth and career charts favors growing responsibility and visibility. Progress still depends on sustained work and timely choices.'
      : 'The chart suggests progress through gradual skill and responsibility growth more than a guaranteed rapid rise. Build a record of results and take opportunities that increase your experience.',
    rise ? 'good' : 'neutral', 'D1/D10 upachaya occupancy; repeated Kendra-Trikona relation; repeated D1/D10 Argala; strength and links of the D10 tenth lord', CAREER, '98–102; 84–92',
    `D1/D10 upachaya pattern ${upachayaRise}; repeated Kendra-Trikona relation ${repeatedRajYoga}; career Argala repeats ${repeatedCareerArgala}; D10 tenth-lord strength ${strongD10ProfessionLord}`);

    const setbacks = (division: string) => {
      const tenth = lord(ctx, 10, division);
      const difficult = TRIK.map((house) => lord(ctx, house, division)).filter((name) => name !== tenth);
      return TRIK.includes(houseOf(ctx, tenth, division))
        || difficult.some((name) => influences(ctx, 10, division).includes(name) || linked(ctx, name, tenth, division));
    };
    const fall = setbacks('D1') && setbacks('D10');
    add(true, 'career-setbacks', 'Changes and setbacks', fall
      ? 'Career breaks, changes in responsibility or interruptions to progress are indicated in both the overall and professional patterns.'
      : 'The chart does not show a strong pattern of repeated career disruption. Ordinary changes can still happen; keeping your skills current will give you more options.',
    fall ? 'bad' : 'neutral', 'Tenth-house/tenth-lord difficult-house relations repeated in D10', CAREER, '129–130',
    `D1 difficult career relation ${setbacks('D1')}; D10 ${setbacks('D10')}`);

    const rewardPressure = (house: number, division: string) => {
      const owner = lord(ctx, house, division);
      return TRIK.includes(houseOf(ctx, owner, division))
        && ![5, 9].some((trine) => linked(ctx, owner, lord(ctx, trine, division), division));
    };
    const earningsPressure = rewardPressure(11, 'D1') && rewardPressure(11, 'D10');
    const savingsPressure = rewardPressure(2, 'D1') && rewardPressure(2, 'D10');
    add(true, 'career-earnings', 'Earnings and savings', earningsPressure || savingsPressure
      ? `${earningsPressure ? 'Professional gains are likely to be uneven or harder to realise.' : ''} ${savingsPressure ? 'Accumulating and retaining savings may also be difficult.' : ''}`.trim()
      : 'There is no strong repeated obstacle pattern around earnings or saving in these checks. This does not guarantee higher pay; use your skills, results and local market rates when making financial decisions.',
    earningsPressure || savingsPressure ? 'bad' : 'neutral',
    'Second/eleventh lord in difficult houses without a trine-lord connection, repeated in D10', CAREER, '130',
    `Repeated H11 reward pressure ${earningsPressure}; repeated H2 savings pressure ${savingsPressure}`);

    const independent = (division: string) => {
      const pp = ['Sun', 'Moon', 'Mars', 'Rahu'];
      const qualifying = pp.filter((name) => [1, 10].some((house) => related(ctx, name, house, division)));
      const hemispheres = [[7, 8, 9, 10, 11, 12], [10, 11, 12, 1, 2, 3]];
      const cluster = hemispheres.some((houses) => {
        const names = ctx.chart.planets.filter((position) => houses.includes(houseOf(ctx, position.name, division))).map((position) => position.name);
        return names.length >= 5 && names.filter((name) => pp.includes(name)).length >= 2;
      });
      return { qualifying, cluster };
    };
    const natal = independent('D1');
    const professional = independent('D10');
    const saturnIndependent = (division: string) => strong(ctx, 'Saturn', division)
      && !TRIK.includes(houseOf(ctx, 'Saturn', division))
      && !planet(ctx, 'Saturn').combust
      && !linked(ctx, 'Saturn', 'Rahu', division) && !linked(ctx, 'Saturn', 'Ketu', division);
    const saturnService = (division: string) => status(ctx, 'Saturn', division) === 'DEBILITATED'
      || status(ctx, 'Saturn', division) === 'Debilitated'
      || TRIK.includes(houseOf(ctx, 'Saturn', division))
      || planet(ctx, 'Saturn').combust
      || linked(ctx, 'Saturn', 'Rahu', division) || linked(ctx, 'Saturn', 'Ketu', division);
    const natalIndependent = saturnIndependent('D1');
    const d10Independent = saturnIndependent('D10');
    const natalService = saturnService('D1');
    const d10Service = saturnService('D10');
    const saturnShift = natalService && d10Independent ? 'A more structured start can gradually give way to greater independence.'
      : natalIndependent && d10Service ? 'A self-directed start may gradually shift toward a more structured service role.' : '';
    const autonomy = (natal.qualifying.length >= 2 && professional.qualifying.length >= 2 && professional.cluster)
      || (natalIndependent && d10Independent);
    const service = !autonomy && natalService && d10Service;
    const initiative = related(ctx, vargaLord(ctx, 'D10', 3), 10, 'D10');
    add(true, 'career-independence', 'Independent work', autonomy
      ? 'A self-directed working style and a need for autonomy are indicated. This supports independent responsibility, but does not by itself settle business versus salaried employment.'
      : service
        ? 'A structured role, organisation or service environment is more strongly supported than working entirely on your own.'
        : 'The chart does not strongly favour one work arrangement. A structured role can offer a sound base, while independent work remains a practical choice if the opportunity fits.',
    autonomy ? 'good' : 'neutral', 'Saturn condition across D1/D9/D10; independent planets and grouping; D10 third/tenth initiative link', CAREER, '60–66',
    `D1 independent influences ${natal.qualifying.join('/')}; D10 ${professional.qualifying.join('/')}; D10 grouping ${professional.cluster}; D1/D10 Saturn independent ${natalIndependent}/${d10Independent}; Saturn service ${natalService}/${d10Service}; H3/H10 connection ${initiative}`);
    if (saturnShift) add(true, 'career-work-mode-shift', 'How your work style may change', saturnShift,
      'neutral', 'Saturn classification compared between D1 and D10', CAREER, '60–62',
      `D1 independent/service ${natalIndependent}/${natalService}; D10 independent/service ${d10Independent}/${d10Service}`);

    const partner = vargaLord(ctx, 'D10', 7);
    const tenth = vargaLord(ctx, 'D10', 10);
    const partnership = related(ctx, partner, 10, 'D10') || related(ctx, tenth, 7, 'D10');
    const strain = [partner, tenth].some((name) => [3, 5, 9, 6, 8, 12].includes(vargaHouseOf(ctx, name, 'D10')) || planetCondition(ctx, name, 'D10').pressure.length);
    const gain = [partner, tenth].some((name) => related(ctx, name, 11, 'D10'));
    add(true, 'career-partnership', 'Business partnerships', partnership && !strain && gain
      ? 'Business through partnership is indicated, with scope for gains from collaboration.'
      : partnership && strain
        ? 'Business partnership is indicated, but it can bring disagreements, financial pressure or difficulty sustaining the arrangement.'
        : partnership
          ? 'Working through clients or business partners is indicated. The matched partnership rule alone does not establish financial gains.'
          : 'The chart gives no strong preference for working with a business partner. Choose based on trust, complementary skills and clear written agreements.',
    partnership && !strain && gain ? 'good' : partnership && strain ? 'bad' : 'neutral',
    'D10 seventh/tenth connection, difficult placements and eleventh-house gains', CAREER, '161–162',
    `D10 H7/H10 connection ${partnership}; placement/association pressure ${strain}; H11 connection ${gain}`);

    const workHouse = vargaHouseOf(ctx, tenth, 'D10');
    const workCondition = planetCondition(ctx, tenth, 'D10');
    const weakened = workCondition.pressure.length > 0 || vargaStatus(ctx, tenth, 'D10') === 'Debilitated' || planet(ctx, tenth).combust;
    const mitigated = weakened && workCondition.support.length > 0;
    const modifier = mitigated
      ? ' There are obstacles, but supportive influences provide scope for recovery.'
      : weakened ? ' Pressure on this pattern can make progress less smooth.'
        : workCondition.support.length ? ' Supportive influences strengthen this direction.' : '';
    add(true, 'career-style', 'Your working pattern', CAREER_STYLES[workHouse - 1] + modifier,
      weakened && !mitigated ? 'bad' : 'neutral', 'D10 tenth-lord placement, modified by dignity and associations', CAREER, '22–34',
      `Natal tenth lord ${profession}: D10 H${vargaHouseOf(ctx, profession, 'D10')}; D10 tenth lord ${tenth}: H${workHouse}, ${vargaStatus(ctx, tenth, 'D10')}; D1 dispositor ${dispositorEvidence(ctx, profession, 'D1')}; D10 dispositor ${dispositorEvidence(ctx, tenth, 'D10')}; support ${workCondition.support.join('/') || 'none'}; pressure ${workCondition.pressure.join('/') || 'none'}; combust ${planet(ctx, tenth).combust}`);

    const educationLord = lordOfHouse(ctx, 5);
    const starLord = STAR_LORDS[Math.floor(planet(ctx, educationLord).longitude / (360 / 27)) % 9];
    const professionalLink = related(ctx, starLord, 10, 'D10') || starLord === vargaLord(ctx, 'D10', 1);
    const fieldCondition = planetCondition(ctx, starLord, 'D10');
    const fieldsSupported = professionalLink && !TRIK.includes(vargaHouseOf(ctx, starLord, 'D10'))
      && !fieldCondition.pressure.length && !planet(ctx, starLord).combust;
    add(true, 'career-fields', 'Career direction', fieldsSupported
      ? `Your chart favours work connected with ${EDUCATION_FIELDS[planet(ctx, starLord).signNumber - 1]}. Treat this as a group of useful themes to explore, not a single prescribed occupation.`
      : 'The chart does not narrow your career to one clear field. Choose by aptitude, training and real opportunities; your working style and ability to build skills matter more than a fixed job label.',
      fieldsSupported ? 'good' : 'neutral', 'Star lord of natal fifth lord analysed in D1 and carried to D10; sign-based avocation', CAREER, '40–46',
      `D1 fifth lord ${educationLord}: longitude ${planet(ctx, educationLord).longitude}, star lord ${starLord}, D1 sign ${planet(ctx, starLord).signNumber}; ${starLord} D10 H${vargaHouseOf(ctx, starLord, 'D10')}; profession connection ${professionalLink}; support ${fieldCondition.support.join('/') || 'none'}; pressure ${fieldCondition.pressure.join('/') || 'none'}`);
  } else if (domain === 'health') {
    const d1AscLord = lordOfHouse(ctx, 1);
    const d1SixthLord = lordOfHouse(ctx, 6);
    const d1Vitality = houseCondition(ctx, 1, 'D1');
    const d6Asc = houseCondition(ctx, 1, 'D6');
    const d6Sixth = houseCondition(ctx, 6, 'D6');
    const d6SixthLord = planetCondition(ctx, d1SixthLord, 'D6');
    const d27AscLord = vargaLord(ctx, 'D27', 1);
    const d27Asc = houseCondition(ctx, 1, 'D27');
    const d27Mars = planetCondition(ctx, 'Mars', 'D27');
    const d30Asc = houseCondition(ctx, 1, 'D30');
    const d30Sixth = houseCondition(ctx, 6, 'D30');
    const d30Eighth = houseCondition(ctx, 8, 'D30');
    const vitalitySupport = (strong(ctx, d1AscLord, 'D1') || d1Vitality.support.length > 0)
      && (strong(ctx, d27AscLord, 'D27') || d27Asc.support.length > 0 || strong(ctx, 'Mars', 'D27'));
    const repeatedPressure = d1Vitality.pressure.length > 0
      && (d6Asc.pressure.length > 0 || d6SixthLord.pressure.length > 0)
      && [d30Asc, d30Sixth, d30Eighth].some((item) => item.pressure.length > 0);
    const resilience = vitalitySupport && !repeatedPressure;
    add(true, 'health-vitality', 'Vitality and resilience', resilience
      ? 'The traditional vitality checks have support across the birth chart and the body-strength chart. Keep the basics steady; this is not a medical assessment.'
      : repeatedPressure
        ? 'Several traditional chart factors call for care with energy and recovery. Treat this as a prompt for steady routines and timely professional advice about real symptoms, not as a prediction of illness.'
        : 'The vitality checks are mixed across the birth chart and the divisional charts. Real health is best judged through how you feel and qualified medical care; astrology cannot diagnose it.',
    'neutral', 'Read D1 vitality first; compare D6 for illness-proneness and D27 for physical strength; use D30 for adversity only when confirmed in the relevant chart',
    COMPREHENSIVE, 'D6 317–319; D27 243–247; D30 253–255',
    `D1 Lagna lord ${d1AscLord}: ${status(ctx, d1AscLord, 'D1')}, H${houseOf(ctx, d1AscLord, 'D1')}; D6 Lagna support/pressure ${d6Asc.support.join('/') || 'none'}/${d6Asc.pressure.join('/') || 'none'}; D1 sixth lord ${d1SixthLord} in D6 H${vargaHouseOf(ctx, d1SixthLord, 'D6')}, support ${d6SixthLord.support.join('/') || 'none'}, pressure ${d6SixthLord.pressure.join('/') || 'none'}; D27 Lagna lord ${d27AscLord} ${vargaStatus(ctx, d27AscLord, 'D27')}, support ${d27Asc.support.join('/') || 'none'}; Mars support ${d27Mars.support.join('/') || 'none'}, pressure ${d27Mars.pressure.join('/') || 'none'}; D30 H1/H6/H8 pressure ${d30Asc.pressure.join('/') || 'none'}/${d30Sixth.pressure.join('/') || 'none'}/${d30Eighth.pressure.join('/') || 'none'}`);
    add(true, 'health-routine', 'Daily care and recovery', d6Sixth.support.length && !d6Sixth.pressure.length
      ? 'The illness-and-recovery chart has supportive factors around managing day-to-day strain. Sustainable sleep, movement and follow-through matter more than trying to predict a diagnosis.'
      : 'The chart does not settle a particular health outcome. A steady routine and attention to changes in how you feel are more useful than trying to time illness from a horoscope.',
    'neutral', 'D6 sixth house for illness/recovery considered with D1 and D27; D30 describes adversity and does not stand alone as a diagnosis',
    COMPREHENSIVE, 'D6 317–319; D27 243–245; D30 253–255',
    `D6 H6 support ${d6Sixth.support.join('/') || 'none'}; pressure ${d6Sixth.pressure.join('/') || 'none'}; D27 Lagna support ${d27Asc.support.join('/') || 'none'}; D30 themes checked against D1/D6/D27`);
  } else if (domain === 'children') {
    const self = vargaLord(ctx, 'D7', 1);
    const condition = planetCondition(ctx, self, 'D7');
    const supported = (strong(ctx, self, 'D7') || ANGLES_TRINES.includes(vargaHouseOf(ctx, self, 'D7')) || condition.support.length > 0)
      && !TRIK.includes(vargaHouseOf(ctx, self, 'D7')) && !condition.pressure.length;
    const natalFamily = houseCondition(ctx, 5, 'D1');
    const natalInfluences = influences(ctx, 5, 'D1');
    const natalSupported = natalFamily.support.length > 0 || natalInfluences.includes(lordOfHouse(ctx, 1))
      || natalInfluences.includes('Jupiter') || natalInfluences.length === 0;
    add(true, 'parenting-foundation', 'Parenting and family life', supported && natalSupported
      ? 'A stable foundation for raising and guiding children is indicated, with capacity to manage family responsibilities.'
      : 'Family life may call for planning and teamwork. Share responsibilities and seek practical support; this is not a judgment about whether you will have children.',
    supported && natalSupported ? 'good' : 'neutral', 'D1 fifth-house promise and D7 first-lord foundation', CHILDREN, '6–7, 109',
    `D1 fifth influences ${natalInfluences.join('/') || 'none (unoccupied/unaspected house exception)'}; natal promise ${natalSupported}; D7 first lord ${self}: ${vargaStatus(ctx, self, 'D7')}, H${vargaHouseOf(ctx, self, 'D7')}; support ${condition.support.join('/')}; pressure ${condition.pressure.join('/')}`);
    const guidance = planetCondition(ctx, 'Jupiter', 'D7');
    add(true, 'parenting-guidance', 'Family bonds', guidance.support.length && !guidance.pressure.length && natalSupported
      ? 'Supportive parent-child bonds and a nurturing role in family life are indicated.'
      : 'The family-bond checks are mixed. Warmth, clear expectations and outside support can help; a chart cannot determine a child\'s character or future.',
    guidance.support.length && !guidance.pressure.length && natalSupported ? 'good' : 'neutral',
    'Jupiter in D7 as a parenting guidance factor', CHILDREN, '110',
    `Jupiter D7 associations: support ${guidance.support.join('/') || 'none'}; pressure ${guidance.pressure.join('/') || 'none'}`);
  } else if (domain === 'property') {
    const fourth = vargaLord(ctx, 'D4', 4);
    const movable = [1, 4, 7, 10];
    const homeSign = ((vargaSign(ctx, 'Ascendant', 'D4') + 2) % 12) + 1;
    const mobile = movable.includes(homeSign) && movable.includes(vargaSign(ctx, fourth, 'D4'));
    add(true, 'property-residence', 'Residence and settlement', mobile
      ? 'Changes of residence or difficulty settling permanently in one place are indicated.'
      : [2, 5, 8, 11].includes(homeSign)
        ? 'A comparatively settled home base and longer-term residence are indicated.'
        : 'The residence checks do not give a clear settled-versus-mobile pattern. Let your work, family needs and finances guide the decision.',
    'neutral', 'D4 fourth-house and fourth-lord movable/fixed signs', COMPREHENSIVE, '103',
    `D4 fourth sign ${homeSign}; fourth lord ${fourth} sign ${vargaSign(ctx, fourth, 'D4')}`);
    const assets = strong(ctx, 'Mars', 'D4') && vargaHouseOf(ctx, 'Mars', 'D4') === 10;
    add(true, 'property-assets', 'Property ownership', assets
      ? 'Acquiring land or built property is a supported theme in your chart.'
      : 'The strongest fixed-asset pattern checked here is not present. Property ownership is not ruled out; prioritise affordability and sound documentation.',
    assets ? 'good' : 'neutral', 'Strong Mars in the D4 tenth house', COMPREHENSIVE, '102',
    `Mars D4 ${vargaStatus(ctx, 'Mars', 'D4')}, H${vargaHouseOf(ctx, 'Mars', 'D4')}`);
  } else if (domain === 'spiritual') {
    const guidance = houseCondition(ctx, 9, 'D20');
    add(true, 'spiritual-guidance', 'Spiritual learning', guidance.support.length && !guidance.pressure.length
      ? 'Learning through a teacher, pilgrimage or a spiritual community is a supported path for your development.'
      : 'Spiritual learning may involve sorting through different ideas before finding what feels grounded. Choose teachers carefully and prefer a simple, sustainable practice.',
    guidance.support.length && !guidance.pressure.length ? 'good' : 'neutral',
    'D20 ninth-house benefic connections', COMPREHENSIVE, '221',
    `D20 H9 support ${guidance.support.join('/') || 'none'}; pressure ${guidance.pressure.join('/') || 'none'}`);
    const devotion = [5, 8, 12].some((house) => related(ctx, 'Jupiter', house, 'D20') || related(ctx, 'Ketu', house, 'D20'));
    add(true, 'spiritual-practice', 'Spiritual practice', devotion
      ? 'Reflective practice and inward spiritual exploration are prominent themes.'
      : 'A strong inward or contemplative pattern is not prominent in these checks. A meaningful practice can still grow through consistency, kindness and learning.',
    devotion ? 'good' : 'neutral', 'Jupiter/Ketu connections to D20 fifth, eighth or twelfth', COMPREHENSIVE, '221',
    `Jupiter/Ketu connection to D20 H5/H8/H12 ${devotion}`);
  }
  return findings;
}

export function bookTiming(ctx: Context, answer: Answer): BookTiming[] {
  if (answer.focus === 'nature' || answer.domain === 'health') return [];
  const domain = answer.domain;
  const until = `${Math.min(Number(ctx.today.slice(0, 4)) + 10, 2100)}${ctx.today.slice(4)}`;
  const periods: BookTiming[] = [];
  const record = (start: string, end: string, system: BookTiming['system'], evidence: string,
    caution = false, periodLords: string[] = [], relevance = 0) => {
    const clippedStart = start.slice(0, 10) > ctx.today ? start.slice(0, 10) : ctx.today;
    const clippedEnd = end.slice(0, 10) < until ? end.slice(0, 10) : until;
    if (clippedStart >= clippedEnd) return;
    let transitWindows: { start: string; end: string }[] | undefined;
    let transitContacts: BookTiming['transitContacts'];
    let transitCheck: BookTiming['transitCheck'];
    if (ctx.transits && ['marriage', 'relationship', 'career'].includes(domain)) {
      const allContacts = topicTransitContacts(ctx, domain, clippedStart, clippedEnd, periodLords);
      transitContacts = allContacts.slice(0, 4);
      transitWindows = transitContacts.slice(0, 2).map(({ start, end }) => ({ start, end }));
      transitCheck = allContacts.length ? 'active' : 'not-found';
      relevance += Math.min(8, allContacts.length * 2);
    }
    periods.push({
      start: clippedStart, end: clippedEnd, system, evidence, relevance,
      tone: caution ? 'caution' : 'good',
      ...(transitCheck ? { transitCheck, transitWindows, transitContacts } : {}),
      text: domain === 'children'
        ? 'A traditional family-planning period, not a prediction of conception or birth. Base pregnancy decisions on medical advice.'
        : caution
          ? domain === 'career'
            ? 'Career responsibilities or direction may change. Protect your gains, review offers carefully and keep plans flexible.'
            : 'Relevant opportunities may come with extra adjustment. Prepare before making a major commitment.'
          : domain === 'career'
            ? 'A period to pursue work opportunities and show your value. It does not guarantee a job, promotion or pay rise.'
            : domain === 'property'
              ? 'A period to review housing options and prepare finances. It does not guarantee a purchase or a profitable investment.'
              : domain === 'spiritual'
                ? 'A period to make time for learning and regular practice. Meaningful progress does not depend on a predicted date.'
                : 'A period to be open to commitment and take practical steps. It is not a promised wedding date.',
    });
  };
  if (['marriage', 'relationship', 'career', 'children'].includes(domain)) {
    const income = /\b(income|salary|earnings|pay|money)\b/i.test(answer.question);
    const promotion = /\b(promotion|recognition|leadership)\b/i.test(answer.question);
    const change = /\b(change|switch|resign|new job|transfer)\b/i.test(answer.question);
    const fallQuestion = /\b(fall|setback|loss|decline|downfall)\b/i.test(answer.question);
    const marriageQualified = (name: string) => related(ctx, name, 7, 'D1')
      && [1, 2, 7, 10].some((house) => related(ctx, name, house, 'D9'));
    const careerHouses = income ? [2, 11] : promotion ? [9, 10, 11] : [2, 10, 11];
    const careerQualified = (name: string) => careerHouses.some((house) => related(ctx, name, house, 'D1'))
      && [1, 2, 10, 11].some((house) => related(ctx, name, house, 'D10'));
    const careerSetbacks = (division: string) => {
      const tenthLord = lord(ctx, 10, division);
      const difficultLords = TRIK.map((house) => lord(ctx, house, division)).filter((name) => name !== tenthLord);
      return TRIK.includes(houseOf(ctx, tenthLord, division))
        || difficultLords.some((name) => influences(ctx, 10, division).includes(name) || linked(ctx, name, tenthLord, division));
    };
    const careerFallPromised = domain === 'career' && careerSetbacks('D1') && careerSetbacks('D10');
    const careerFallActivator = (name: string) => name === lordOfHouse(ctx, 10)
      || name === vargaLord(ctx, 'D10', 10) || name === vargaLord(ctx, 'D10', 1)
      || TRIK.some((house) => name === lordOfHouse(ctx, house) || name === vargaLord(ctx, 'D10', house))
      || TRIK.includes(planet(ctx, name).house) || TRIK.includes(vargaHouseOf(ctx, name, 'D10'));
    const childLinks = (name: string, division: string) =>
      Number(related(ctx, name, 5, division)) + Number(linked(ctx, name, 'Jupiter', division));
    const childQualified = (name: string) => childLinks(name, 'D1') > 0
      && childLinks(name, 'D9') >= childLinks(name, 'D1');
    const yoginiPlanets: Record<string, string> = {
      Mangala: 'Moon', Pingala: 'Sun', Dhanya: 'Jupiter', Bhramari: 'Mars',
      Bhadrika: 'Mercury', Ulka: 'Saturn', Siddha: 'Venus', Sankata: 'Rahu',
    };
    const isPlanet = (name: string) => ctx.chart.planets.some((item) => item.name === name);
    const charaRuler = (name: string) => {
      const sign = SIGN_NAMES.indexOf(name as typeof SIGN_NAMES[number]) + 1;
      return sign > 0 ? SIGN_LORDS[sign - 1] : null;
    };
    const pairMatches = (main: string, sub: string, qualifies: (name: string) => boolean) => {
      const matched = [main, sub].filter((name) => isPlanet(name) && qualifies(name));
      return matched.length ? matched.length : 0;
    };
    const primaryQualified = domain === 'career' ? careerQualified
      : domain === 'children' ? childQualified : marriageQualified;
    const topicLordScore = (name: string): number => {
      const houseScore = (house: number, division: string) => {
        const houseLord = lord(ctx, house, division);
        return (name === houseLord ? 5 : 0)
          + (inHouse(ctx, house, division).includes(name) ? 3 : 0)
          + (aspects(ctx, house, division).includes(name) ? 2 : 0)
          + (linked(ctx, name, houseLord, division) ? 1 : 0);
      };
      if (domain === 'marriage' || domain === 'relationship') {
        const natal = houseScore(7, 'D1') + (name === 'Venus' ? 4 : 0);
        const navamsa = houseScore(1, 'D9') + houseScore(7, 'D9') + (name === 'Venus' ? 4 : 0);
        const dignity = Number(strong(ctx, name, 'D1')) + Number(strong(ctx, name, 'D9'));
        return 0.4 * natal + 0.6 * navamsa + dignity;
      }
      if (domain === 'career') {
        const natal = [2, 10, 11].reduce((sum, house) => sum + houseScore(house, 'D1'), 0);
        const dashamsha = [1, 2, 10, 11].reduce((sum, house) => sum + houseScore(house, 'D10'), 0);
        const dignity = Number(strong(ctx, name, 'D1')) + Number(strong(ctx, name, 'D10'));
        return 0.4 * natal + 0.6 * dashamsha + dignity;
      }
      return [1, 2, 5, 10].reduce((sum, house) => sum + houseScore(house, 'D7'), 0)
        + Number(linked(ctx, name, 'Jupiter', 'D7'));
    };
    const pairRelevance = (main: string, sub: string) =>
      0.4 * topicLordScore(main) + 0.6 * topicLordScore(sub)
      + (linked(ctx, main, sub, TOPIC_DIVISION[domain]) ? 2 : 0);
    for (const md of ctx.chart.dashas) {
      for (const ad of md.antardashas) {
        const matches = pairMatches(md.lord, ad.lord, primaryQualified);
        const fallTriggers = domain === 'career' ? [md.lord, ad.lord].filter(careerFallActivator).length : 0;
        const fallActivation = fallQuestion && careerFallPromised && fallTriggers > 0
          && (fallTriggers === 2 || !matches);
        if ((!matches && !fallActivation) || (domain === 'children' && ![1, 2, 5, 10].some((house) => related(ctx, ad.lord, house, 'D7')))) continue;
        if (domain === 'career' && change
          && ![3, 9, 12].some((house) => related(ctx, md.lord, house, 'D10') || related(ctx, ad.lord, house, 'D10'))) continue;
        const division = TOPIC_DIVISION[domain];
        const caution = domain === 'career'
          ? (change && [md.lord, ad.lord].some((name) => [3, 9, 12].some((house) => related(ctx, name, house, 'D10'))))
            || fallActivation
          : [md.lord, ad.lord].some((name) => TRIK.includes(vargaHouseOf(ctx, name, division)) && planetCondition(ctx, name, division).pressure.length > 0);
        const start = md.start > ad.start ? md.start : ad.start;
        const end = md.end < ad.end ? md.end : ad.end;
        record(start, end, 'Vimshottari',
          `${md.lord}/${ad.lord}: ${matches === 2 ? 'both period lords' : 'one period lord'} connects with the topic's houses in the birth and divisional charts.${domain === 'career'
            ? ` D10 check: income ${income}, advancement ${promotion}, transition ${change}.` : ''}`, caution,
          [md.lord, ad.lord].filter(isPlanet), pairRelevance(md.lord, ad.lord) + matches * 3);
      }
    }
    for (const md of ctx.chart.yoginiDashas) {
      for (const ad of md.antardashas) {
        const main = yoginiPlanets[md.lord];
        const sub = yoginiPlanets[ad.lord];
        if (!main || !sub) continue;
        const matches = pairMatches(main, sub, primaryQualified);
        const fallTriggers = domain === 'career' ? [main, sub].filter(careerFallActivator).length : 0;
        const fallActivation = fallQuestion && careerFallPromised && fallTriggers > 0
          && (fallTriggers === 2 || !matches);
        if ((!matches && !fallActivation) || (domain === 'career' && change
          && ![3, 9, 12].some((house) => related(ctx, main, house, 'D10') || related(ctx, sub, house, 'D10')))) continue;
        const caution = domain === 'career' ? change || fallActivation
          : [main, sub].some((name) => TRIK.includes(vargaHouseOf(ctx, name, TOPIC_DIVISION[domain]))
            && planetCondition(ctx, name, TOPIC_DIVISION[domain]).pressure.length > 0);
        const start = md.start > ad.start ? md.start : ad.start;
        const end = md.end < ad.end ? md.end : ad.end;
        record(start, end, 'Yogini', `${md.lord}/${ad.lord}: mapped to ${main}/${sub}; ${matches === 2 ? 'both period lords' : 'one period lord'} also connects with the topic charts.`, caution, [main, sub], pairRelevance(main, sub) + matches * 3);
      }
    }
    if (domain === 'marriage' || domain === 'relationship') {
      const spouse = ctx.karakas.find((item) => item.code === 'DK')?.planet.name;
      const qualified = (name: string) => {
        const sign = SIGN_NAMES.indexOf(name as typeof SIGN_NAMES[number]) + 1;
        if (sign < 1) return false;
        const seventh = SIGN_LORDS[((sign + 5) % 12)];
        const spouseLinked = spouse && (seventh === spouse || planet(ctx, seventh).signNumber === planet(ctx, spouse).signNumber
          || rashiAspects(planet(ctx, seventh).signNumber, planet(ctx, spouse).signNumber));
        return seventh === lordOfHouse(ctx, 7) || Boolean(spouseLinked);
      };
      for (const md of ctx.chart.charaDashas) {
        for (const ad of md.antardashas) {
          if (qualified(md.lord) || qualified(ad.lord)) {
            record(md.start > ad.start ? md.start : ad.start, md.end < ad.end ? md.end : ad.end,
              'Chara', `${md.lord}/${ad.lord}: ${qualified(md.lord) && qualified(ad.lord) ? 'both' : 'one'} running sign has a seventh-lord link to the natal marriage lord or DK.`, false,
              [charaRuler(md.lord), charaRuler(ad.lord)].filter((name): name is string => !!name),
              pairRelevance(charaRuler(md.lord) ?? '', charaRuler(ad.lord) ?? ''));
          }
        }
      }
    } else if (domain === 'career') {
      const charaFall = (signName: string) => {
        const sign = SIGN_NAMES.indexOf(signName as typeof SIGN_NAMES[number]) + 1;
        if (sign < 1) return false;
        const d1House = ((sign - ctx.chart.ascendant.signNumber + 12) % 12) + 1;
        const d10Ascendant = vargaSign(ctx, 'Ascendant', 'D10');
        const d10House = ((sign - d10Ascendant + 12) % 12) + 1;
        return TRIK.includes(d1House) || TRIK.includes(d10House) || [3, 9, 12].includes(d10House);
      };
      const charaCareer = (signName: string) => {
        const sign = SIGN_NAMES.indexOf(signName as typeof SIGN_NAMES[number]) + 1;
        if (sign < 1) return false;
        const ruler = SIGN_LORDS[sign - 1];
        return [2, 10, 11].some((house) => related(ctx, ruler, house, 'D1'))
          || [1, 2, 10, 11].some((house) => related(ctx, ruler, house, 'D10'))
          || [2, 10, 11].some((house) => sign === vargaHouseSign(ctx, 'D10', house));
      };
      for (const md of ctx.chart.charaDashas) {
        for (const ad of md.antardashas) {
          const main = charaCareer(md.lord);
          const sub = charaCareer(ad.lord);
          const fallTriggers = Number(charaFall(md.lord)) + Number(charaFall(ad.lord));
          const fallActivation = fallQuestion && careerFallPromised && fallTriggers > 0
            && (fallTriggers === 2 || (!main && !sub));
          if (!main && !sub && !fallActivation) continue;
          const adSignIndex = SIGN_NAMES.indexOf(ad.lord as typeof SIGN_NAMES[number]);
          const adRuler = adSignIndex >= 0 ? SIGN_LORDS[adSignIndex] : null;
          if (change && (!adRuler || ![3, 9, 12].some((house) => related(ctx, adRuler, house, 'D10')))) continue;
          record(md.start > ad.start ? md.start : ad.start, md.end < ad.end ? md.end : ad.end,
            'Chara', `${md.lord}/${ad.lord}: ${main && sub ? 'both' : 'one'} running sign connects with career houses in D1/D10.`,
            change || fallActivation,
            [charaRuler(md.lord), charaRuler(ad.lord)].filter((name): name is string => !!name),
            pairRelevance(charaRuler(md.lord) ?? '', charaRuler(ad.lord) ?? ''));
        }
      }
    }
  }
  const systemOrder: BookTiming['system'][] = ['Vimshottari', 'Yogini', 'Chara'];
  return periods.sort((a, b) => systemOrder.indexOf(a.system) - systemOrder.indexOf(b.system)
    || b.relevance - a.relevance || a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
}
