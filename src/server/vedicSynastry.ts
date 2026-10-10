import type { Chart, Position, CompatibilityReport, CompatibilityLayer, CompatibilityRule, HouseConnection } from '../types';
import { signName } from './astroMath';
import { signLord, dignity } from './dignity';

const EIGHT_PLANETS = ['Sun', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'] as const;
const MALEFICS = ['Saturn', 'Mars', 'Sun', 'Rahu', 'Ketu'] as const;
const ANGLES = new Set([1, 4, 7, 10]);
const FAVOURABLE = new Set([1, 2, 3, 4, 5, 7, 9, 10, 11]);
const SUPPORTIVE = new Set([1, 2, 4, 5, 7, 9, 10, 11]);

const FRIENDS: Record<string, Set<string>> = {
  Sun: new Set(['Moon', 'Mars', 'Jupiter']),
  Moon: new Set(['Sun', 'Mercury']),
  Mars: new Set(['Sun', 'Moon', 'Jupiter']),
  Mercury: new Set(['Sun', 'Venus']),
  Jupiter: new Set(['Sun', 'Moon', 'Mars']),
  Venus: new Set(['Mercury', 'Saturn']),
  Saturn: new Set(['Mercury', 'Venus']),
};

const ENEMIES: Record<string, Set<string>> = {
  Sun: new Set(['Venus', 'Saturn']),
  Moon: new Set(),
  Mars: new Set(['Mercury']),
  Mercury: new Set(['Moon']),
  Jupiter: new Set(['Mercury', 'Venus']),
  Venus: new Set(['Sun', 'Moon']),
  Saturn: new Set(['Sun', 'Moon', 'Mars']),
};

const NAKSHATRA_LORDS = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
];

const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
  'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

function round(n: number): number { return Math.round(n * 100.0) / 100.0; }
function rel(base: number, target: number): number { return ((target - base + 120) % 12) + 1; }
function lord(signNum: number): string { return signLord(signNum - 1); }
function friend(a: string, b: string): boolean { return a === b || (FRIENDS[a]?.has(b) ?? false); }
function enemy(a: string, b: string): boolean { return ENEMIES[a]?.has(b) ?? false; }
function mutualFriend(a: string, b: string): boolean { return a === b || (friend(a, b) && friend(b, a)); }

function friendship(a: string, b: string): string {
  if (a === b) return 'same ruler';
  const ab = friend(a, b), ba = friend(b, a), ae = enemy(a, b), be = enemy(b, a);
  if (ab && ba) return 'mutual friends';
  if (ae && be) return 'mutual enemies';
  if (ab || ba) return 'friend and neutral';
  if (ae || be) return 'enemy and neutral';
  return 'mutual neutral';
}

function find(chart: Chart, name: string): Position {
  if (name === 'Ascendant') return chart.ascendant;
  const p = chart.planets.find((x) => x.name === name);
  if (!p) throw new Error(`Planet ${name} not found`);
  return p;
}

function houseFrom(base: Position, target: Position): number {
  return rel(base.signNumber, target.signNumber);
}

function sameSign(a: Position, b: Position): boolean {
  return a.signNumber === b.signNumber;
}

function signAtHouse(ascSign: number, h: number): number {
  return ((ascSign - 1 + h - 1 + 120) % 12) + 1;
}

function rule(name: string, points: number, maxPoints: number, reason: string, evidence: string[]): CompatibilityRule {
  return { name, matched: points > 0, points: round(points), maxPoints, reason, evidence };
}

function layer(name: string, maxPoints: number, rules: CompatibilityRule[]): CompatibilityLayer {
  const points = rules.reduce((acc, r) => acc + r.points, 0);
  return { name, points: round(points), maxPoints, rules };
}

function kujaFrom(chart: Chart, ref: Position): { active: boolean; describe: string } {
  const mars = find(chart, 'Mars');
  const h = houseFrom(ref, mars);
  if (![1, 2, 4, 7, 8, 12].includes(h)) return { active: false, describe: `no Mars dosha from house ${h}.` };

  const cancel: string[] = [];
  if (mars.dignity === 'OWN' || mars.dignity === 'EXALTED') cancel.push('Mars own/exalted sign');
  for (const div of ['D7', 'D9']) {
    const vargaSign = mars.divisionalSigns[div];
    if (vargaSign !== undefined) {
      const vargaDignity = dignity('Mars', vargaSign - 1);
      if (vargaDignity === 'OWN' || vargaDignity === 'EXALTED') {
        cancel.push(`Mars own/exalted in ${div}`);
      }
    }
  }

  if (
    (h === 2 && [3, 6].includes(mars.signNumber)) ||
    (h === 4 && [1, 8].includes(mars.signNumber)) ||
    (h === 7 && [4, 10].includes(mars.signNumber)) ||
    (h === 8 && [9, 12].includes(mars.signNumber)) ||
    (h === 12 && [2, 7].includes(mars.signNumber))
  ) {
    cancel.push('house/sign cancellation');
  }

  if (sameSign(find(chart, 'Jupiter'), mars) || aspectsHouse(chart, 'Jupiter', h)) {
    cancel.push('Jupiter conjunction/aspect');
  }
  if (sameSign(ref, mars) && ref.name !== 'Ascendant') {
    cancel.push('Mars conjunct reference');
  }

  const text = cancel.length === 0
    ? `Mars in H${h} from ${ref.name} (active).`
    : `Mars in H${h} from ${ref.name}; cancelled by ${cancel.join(', ')}.`;
  return { active: cancel.length === 0, describe: text };
}

function kuja(out: CompatibilityRule[], bride: Chart, groom: Chart): void {
  const refNames = ['Lagna', 'Moon', 'Venus'];
  let brideActive = 0, groomActive = 0;
  const evidence: string[] = [];
  for (let i = 0; i < 3; i++) {
    const bRef = i === 0 ? bride.ascendant : find(bride, refNames[i]);
    const gRef = i === 0 ? groom.ascendant : find(groom, refNames[i]);
    const b = kujaFrom(bride, bRef), g = kujaFrom(groom, gRef);
    evidence.push(`Bride from ${refNames[i]}: ${b.describe}`);
    evidence.push(`Groom from ${refNames[i]}: ${g.describe}`);
    if (b.active) brideActive++;
    if (g.active) groomActive++;
  }
  const balanced = brideActive === groomActive;
  const points = balanced ? 9 : (brideActive === 0 || groomActive === 0) ? 4.5 : 6;
  evidence.push(`Final active reference counts after reference-specific cancellations: bride ${brideActive}/3, groom ${groomActive}/3.`);
  out.push(rule('Kuja Dosha', points, 9, balanced ? 'Both charts have comparable Mars-affliction patterns after cancellation checks.' : 'The post-cancellation Mars-affliction counts differ between charts.', evidence));
}

function malefics(out: CompatibilityRule[], bride: Chart, groom: Chart): void {
  const evidence: string[] = [];
  let points = 0;
  for (const name of MALEFICS) {
    const b = find(bride, name).house, g = find(groom, name).house;
    const matched = ANGLES.has(b) && ANGLES.has(g);
    if (matched && points < 4) points++;
    evidence.push(`${name} → Groom H${g} / Bride H${b} → Match: ${matched ? 1 : 0}`);
  }
  out.push(rule('Angular malefic balance', points, 4, 'One point per corresponding natural malefic occupying an angular house (1, 4, 7 or 10) in both charts.', evidence));
}

function lagnas(out: CompatibilityRule[], bride: Chart, groom: Chart): void {
  const b = bride.ascendant.signNumber, g = groom.ascendant.signNumber;
  const d = rel(b, g);
  const bl = lord(b), gl = lord(g);
  const signPoint = b === g || [1, 5, 9].includes(d) || mutualFriend(bl, gl) ? 1 : 0;
  const challenged = [6, 8, 12].includes(d) || [6, 8, 12].includes(rel(g, b));
  const housePoint = challenged ? 0 : 1;
  const bHemmed = hemmed(bride, bride.ascendant.signNumber);
  const gHemmed = hemmed(groom, groom.ascendant.signNumber);
  const hemmingPoint = !bHemmed && !gHemmed ? 1 : bHemmed && gHemmed ? 0.25 : 0.5;
  const evidence = [
    `Ascendants are ${signName(b - 1)} and ${signName(g - 1)}, houses apart: ${d}.`,
    challenged ? 'The sign distance includes a 6/8/12 relationship.' : 'No 6/8/12 sign relationship.',
    `Lagna lords: ${bl} and ${gl} (${friendship(bl, gl)}).`,
    `Malefic hemming: bride ${bHemmed}, groom ${gHemmed}.`
  ];
  out.push(rule('Lagnas', signPoint + housePoint + hemmingPoint, 3, 'Combines sign relationship, 6/8/12 challenge, ascendant-lord affinity and malefic hemming.', evidence));
}

function lagnaLords(out: CompatibilityRule[], bride: Chart, groom: Chart): void {
  const bl = lord(bride.ascendant.signNumber), gl = lord(groom.ascendant.signNumber);
  const bp = find(bride, bl), gp = find(groom, gl);
  const bg = houseFrom(groom.ascendant, bp), gb = houseFrom(bride.ascendant, gp);
  const position = (SUPPORTIVE.has(bg) ? 1 : 0) + (SUPPORTIVE.has(gb) ? 1 : 0);
  const friendScore = mutualFriend(bl, gl) ? 2 : friend(bl, gl) || friend(gl, bl) ? 1 : 0;
  const maleficAspects = (isAfflictedByMalefics(bride, bp) ? 1 : 0) + (isAfflictedByMalefics(groom, gp) ? 1 : 0);
  const points = position + friendScore + (maleficAspects === 0 ? 1 : maleficAspects === 1 ? 0.5 : 0);
  out.push(rule('Lagna Lords', points, 5, 'Compares placement in the partner\'s chart, natural planetary friendship and malefic aspects.', [
    `Bride Lagna lord ${bl} falls in Groom H${bg}.`,
    `Groom Lagna lord ${gl} falls in Bride H${gb}.`,
    `Lagna-lord relationship: ${friendship(bl, gl)}.`,
    `Malefic aspect affliction count: ${maleficAspects}.`
  ]));
}

function seventhHouses(out: CompatibilityRule[], bride: Chart, groom: Chart): void {
  const evidence: string[] = [];
  let points = 0;
  for (const c of [bride, groom]) {
    const who = c === bride ? 'Bride' : 'Groom';
    const s = signAtHouse(c.ascendant.signNumber, 7);
    const sevenLord = lord(s);
    const isH = hemmed(c, s);
    const dustImpact = hasDustLordImpact(c, 7);
    const score = (isH ? 0 : 0.5) + (dustImpact ? 0 : 0.5);
    points += score;
    evidence.push(`${who} 7th house ${signName(s - 1)}; occupants ${occupants(c, s)}; lord ${sevenLord}.`);
    evidence.push(`${who} severe hemming: ${isH}; severe 6/8/12-lord involvement: ${dustImpact}.`);
  }
  out.push(rule('7th Houses', points, 2, 'One point per chart for an unhemmed 7th house without severe 6th, 8th or 12th lord involvement.', evidence));
}

function seventhLords(out: CompatibilityRule[], bride: Chart, groom: Chart): void {
  const b7 = lord(signAtHouse(bride.ascendant.signNumber, 7));
  const g7 = lord(signAtHouse(groom.ascendant.signNumber, 7));
  const bp = find(bride, b7), gp = find(groom, g7);
  const bInG = houseFrom(groom.ascendant, bp), gInB = houseFrom(bride.ascendant, gp);
  const friendScore = mutualFriend(b7, g7) ? 2 : friend(b7, g7) || friend(g7, b7) ? 1 : 0;
  const distance = rel(bp.signNumber, gp.signNumber);
  const signDistance = [1, 5, 7, 9].includes(distance) ? 1 : 0;
  const cross = ([1, 5, 7, 9, 10, 11].includes(bInG) ? 1 : 0) + ([1, 5, 7, 9, 10, 11].includes(gInB) ? 1 : 0);
  out.push(rule('7th Lords', friendScore + signDistance + cross, 5, 'Compares friendship, sign relationship and how each marriage lord lands in the partner\'s chart.', [
    `Bride 7th lord ${b7} falls in Groom H${bInG}.`,
    `Groom 7th lord ${g7} falls in Bride H${gInB}.`,
    `The two 7th lords are ${friendship(b7, g7)} and ${distance} signs apart.`
  ]));
}

function eighthLords(out: CompatibilityRule[], bride: Chart, groom: Chart): void {
  const b8 = lord(signAtHouse(bride.ascendant.signNumber, 8));
  const g8 = lord(signAtHouse(groom.ascendant.signNumber, 8));
  const bInG = houseFrom(groom.ascendant, find(bride, b8));
  const gInB = houseFrom(bride.ascendant, find(groom, g8));
  const placement = (SUPPORTIVE.has(bInG) ? 0.75 : 0) + (SUPPORTIVE.has(gInB) ? 0.75 : 0);
  const relation = mutualFriend(b8, g8) ? 1.5 : friend(b8, g8) || friend(g8, b8) ? 0.75 : 0;
  out.push(rule('8th Lords', placement + relation, 3, 'Reviews resilience and longevity indicators without treating the 8th house as automatically bad.', [
    `Bride 8th lord ${b8} falls in Groom H${bInG}.`,
    `Groom 8th lord ${g8} falls in Bride H${gInB}.`,
    `The two 8th lords are ${friendship(b8, g8)}.`
  ]));
}

function eightPlanets(out: CompatibilityRule[], bride: Chart, groom: Chart): void {
  const evidence: string[] = [];
  let points = 0;
  for (const name of EIGHT_PLANETS) {
    const b = find(bride, name), g = find(groom, name);
    const distance = rel(b.signNumber, g.signNumber);
    const r1 = FAVOURABLE.has(distance);
    const bSignLord = lord(b.signNumber), gSignLord = lord(g.signNumber);
    const relationship = friendship(bSignLord, gSignLord);
    const r2 = mutualFriend(bSignLord, gSignLord) || bSignLord === gSignLord;
    const value = (r1 ? 1 : 0) + (r2 ? 1 : 0);
    points += value;
    evidence.push(`${name} → Groom ${gSignLord} / Bride ${bSignLord}; distance ${distance}; R1 ${r1 ? '✓' : '×'}; relationship ${relationship}; R2 ${r2 ? '✓' : '×'}; points ${value}.`);
  }
  out.push(rule('Eight Planets', points, 16, 'Eight matching rows, each scoring one for sign-distance support and one for supportive sign-lord friendship.', evidence));
}

function lagnaMoon(out: CompatibilityRule[], bride: Chart, groom: Chart): void {
  const brideMoon = houseFrom(groom.ascendant, find(bride, 'Moon'));
  const groomMoon = houseFrom(bride.ascendant, find(groom, 'Moon'));
  const first = FAVOURABLE.has(brideMoon), second = FAVOURABLE.has(groomMoon);
  out.push(rule('Lagna–Moon', first && second ? 1 : 0, 1, 'Cross-checks each Moon from the other person\'s Ascendant.', [
    `Bride Moon from Groom Ascendant: H${brideMoon} → ${first ? 'favourable' : 'challenging'}.`,
    `Groom Moon from Bride Ascendant: H${groomMoon} → ${second ? 'favourable' : 'challenging'}.`
  ]));
}

function venusMars(out: CompatibilityRule[], bride: Chart, groom: Chart): void {
  const gmToBv = houseFrom(find(bride, 'Venus'), find(groom, 'Mars'));
  const gvToBm = houseFrom(find(bride, 'Mars'), find(groom, 'Venus'));
  const a = ![2, 6, 8, 12].includes(gmToBv);
  const b = ![2, 6, 8, 12].includes(gvToBm);
  out.push(rule('Venus and Mars', a && b ? 1 : 0, 1, 'Checks mutual Venus–Mars chemistry by Vedic sign/house relationship, not Western aspects.', [
    `Groom Mars from Bride Venus: H${gmToBv}${a ? ' supportive.' : ' challenging (avoid 2/12 or 6/8).'}`,
    `Groom Venus from Bride Mars: H${gvToBm}${b ? ' supportive.' : ' challenging (avoid 2/12 or 6/8).'}`
  ]));
}

function venusSupported(c: Chart): boolean {
  const venusSign = find(c, 'Venus').signNumber;
  for (const benefic of ['Jupiter', 'Moon']) {
    const p = find(c, benefic);
    if (p.signNumber === venusSign || aspectsSign(c, benefic, venusSign)) return true;
  }
  return false;
}

function venusAssociation(out: CompatibilityRule[], bride: Chart, groom: Chart): void {
  const b = venusSupported(bride), g = venusSupported(groom);
  out.push(rule('Venus Association', b && g ? 1 : 0, 1, 'Both charts need Jupiter or Moon conjunct with or aspecting Venus.', [
    `Bride Venus association: ${b ? 'supported' : 'not found'}.`,
    `Groom Venus association: ${g ? 'supported' : 'not found'}.`
  ]));
}

function connectionSimilarity(bride: Chart, groom: Chart): HouseConnection[] {
  const rows: HouseConnection[] = [];
  for (let h = 1; h <= 12; h++) {
    const b = Array.from(connectionSet(bride, h));
    const g = Array.from(connectionSet(groom, h));
    const gSet = new Set(g);
    const overlap = b.filter((x) => gSet.has(x)).sort((x, y) => x - y);
    rows.push({
      house: h,
      bride: b.sort((x, y) => x - y),
      groom: g.sort((x, y) => x - y),
      overlap,
      matched: overlap.length > 0,
    });
  }
  return rows;
}

function connectionSet(chart: Chart, sourceHouse: number): Set<number> {
  const targetSign = signAtHouse(chart.ascendant.signNumber, sourceHouse);
  const result = new Set<number>();
  const houseLord = lord(targetSign);
  result.add(find(chart, houseLord).house);

  const inHouse = chart.planets.filter((p) => p.signNumber === targetSign);
  if (inHouse.length > 0) result.add(sourceHouse);
  for (const p of inHouse) {
    for (const aspectHouse of aspectHouses(p.name, p.house)) result.add(aspectHouse);
  }
  for (const name of EIGHT_PLANETS) {
    const p = find(chart, name);
    if (aspectsHouse(chart, name, targetSign)) result.add(p.house);
  }
  result.add(find(chart, nakshatraLord(find(chart, houseLord).nakshatra)).house);
  for (const p of inHouse) {
    result.add(find(chart, nakshatraLord(p.nakshatra)).house);
  }
  return result;
}

function nakshatraLord(nak: string): string {
  const idx = NAKSHATRA_NAMES.indexOf(nak);
  return idx >= 0 ? NAKSHATRA_LORDS[idx] : 'Ketu';
}

function aspectHouses(planet: string, fromHouse: number): number[] {
  const houses = [((fromHouse + 5) % 12) + 1];
  if (planet === 'Mars') { houses.push(((fromHouse + 2) % 12) + 1); houses.push(((fromHouse + 6) % 12) + 1); }
  if (planet === 'Jupiter') { houses.push(((fromHouse + 3) % 12) + 1); houses.push(((fromHouse + 7) % 12) + 1); }
  if (planet === 'Saturn') { houses.push(((fromHouse + 1) % 12) + 1); houses.push(((fromHouse + 8) % 12) + 1); }
  return houses;
}

function aspectDistances(planet: string): number[] {
  const houses = [7];
  if (planet === 'Mars') houses.push(4, 8);
  if (planet === 'Jupiter') houses.push(5, 9);
  if (planet === 'Saturn') houses.push(3, 10);
  return houses;
}

function aspectsHouse(chart: Chart, planet: string, targetSign: number): boolean {
  const p = find(chart, planet);
  return aspectDistances(planet).includes(rel(p.signNumber, targetSign));
}

function aspectsSign(chart: Chart, planet: string, targetSign: number): boolean {
  return aspectsHouse(chart, planet, targetSign);
}

function occupantsBySign(chart: Chart, s: number): Position[] {
  return chart.planets.filter((p) => p.signNumber === s);
}

function occupants(chart: Chart, s: number): string {
  const names = occupantsBySign(chart, s).map((p) => p.name);
  return names.length === 0 ? 'none' : names.join(', ');
}

function hemmed(chart: Chart, pointSign: number): boolean {
  const prev = signAtHouse(pointSign, 12);
  const next = signAtHouse(pointSign, 2);
  return occupantsBySign(chart, prev).some((p) => (MALEFICS as readonly string[]).includes(p.name))
    && occupantsBySign(chart, next).some((p) => (MALEFICS as readonly string[]).includes(p.name));
}

function hasDustLordImpact(chart: Chart, h: number): boolean {
  const target = signAtHouse(chart.ascendant.signNumber, h);
  for (const dust of [6, 8, 12]) {
    const lordPos = find(chart, lord(signAtHouse(chart.ascendant.signNumber, dust)));
    if (lordPos.signNumber === target || aspectsHouse(chart, lordPos.name, target)) return true;
  }
  return false;
}

function isAfflictedByMalefics(chart: Chart, target: Position): boolean {
  return chart.planets
    .filter((p) => (MALEFICS as readonly string[]).includes(p.name))
    .some((p) => p.signNumber === target.signNumber || aspectsHouse(chart, p.name, target.signNumber));
}

function similarityIndicators(bride: Chart, groom: Chart): CompatibilityRule[] {
  const out: CompatibilityRule[] = [];
  let sameStrength = 0, sameAngles = 0, similarLords = 0;
  const strengthEvidence: string[] = [], angleEvidence: string[] = [], lordEvidence: string[] = [];

  for (const name of EIGHT_PLANETS) {
    const b = find(bride, name), g = find(groom, name);
    const bExalted = b.dignity === 'EXALTED', gExalted = g.dignity === 'EXALTED';
    const bDebilitated = b.dignity === 'DEBILITATED', gDebilitated = g.dignity === 'DEBILITATED';
    if ((bExalted && gExalted) || (bDebilitated && gDebilitated)) {
      sameStrength++;
      strengthEvidence.push(`${name} has the same ${bExalted ? 'exalted' : 'debilitated'} status in both charts.`);
    }
    const bAngle = ANGLES.has(b.house), gAngle = ANGLES.has(g.house);
    if (bAngle && gAngle) {
      sameAngles++;
      angleEvidence.push(`${name} is angular in both charts (Groom H${g.house}, Bride H${b.house}).`);
    }
  }

  for (let h = 1; h <= 12; h++) {
    const bLord = lord(signAtHouse(bride.ascendant.signNumber, h));
    const gLord = lord(signAtHouse(groom.ascendant.signNumber, h));
    const bPlacement = find(bride, bLord).house, gPlacement = find(groom, gLord).house;
    if (bLord === gLord || rel(bPlacement, gPlacement) === 1 || [5, 7, 9].includes(rel(bPlacement, gPlacement))) {
      similarLords++;
      lordEvidence.push(`H${h} lords ${bLord}/${gLord} have similar placements.`);
    }
  }

  out.push(rule('Same exaltation/debilitation patterns', sameStrength > 0 ? 0 : 0, 0, 'Similarity indicator only; it does not add points beyond connection-set overlap.', strengthEvidence));
  out.push(rule('Similar angular placements', sameAngles > 0 ? 0 : 0, 0, 'Similarity indicator only; it does not add points beyond connection-set overlap.', angleEvidence));
  out.push(rule('Similar house-lord patterns', similarLords > 0 ? 0 : 0, 0, 'Similarity indicator only; it does not add points beyond connection-set overlap.', lordEvidence));
  return out;
}

function directHighlight(out: CompatibilityRule[], name: string, points: number, maxPoints: number, reason: string, evidence: string): void {
  if (points > 0) out.push(rule(name, points, maxPoints, reason, [evidence]));
}

function directSynastry(bride: Chart, groom: Chart): CompatibilityRule[] {
  const out: CompatibilityRule[] = [];
  sameSignHighlights(out, bride, groom);
  overlayHighlights(out, 'Groom', groom, 'Bride', bride);
  overlayHighlights(out, 'Bride', bride, 'Groom', groom);

  const bv = find(bride, 'Venus'), gv = find(groom, 'Venus');
  const vvHouse = houseFrom(bv, gv);
  if ([1, 5, 7, 9].includes(vvHouse)) {
    directHighlight(out, 'Venus–Venus', vvHouse === 1 ? 4 : 5, 5, 'Similar love language and relationship values.', `The two Venus signs form a ${vvHouse}th-house relationship.`);
  }

  const bm = find(bride, 'Moon'), gm = find(groom, 'Moon');
  const moonHouse = houseFrom(bm, gm);
  if (bm.signNumber === gm.signNumber || bm.nakshatra === gm.nakshatra || [1, 5, 7].includes(moonHouse)) {
    directHighlight(out, 'Moon–Moon', bm.nakshatra === gm.nakshatra ? 5 : 4, 5, 'Emotional habits may feel familiar and easier to understand.', `Moon signs: ${signName(bm.signNumber - 1)} / ${signName(gm.signNumber - 1)}; nakshatras: ${bm.nakshatra} / ${gm.nakshatra}.`);
  }

  crossPersonal(out, 'Sun–Moon', find(groom, 'Sun'), bride, ['Moon']);
  crossPersonal(out, 'Moon–Sun', find(groom, 'Moon'), bride, ['Sun']);
  crossPersonal(out, 'Jupiter–Venus', find(groom, 'Jupiter'), bride, ['Venus']);
  crossPersonal(out, 'Jupiter–Moon', find(groom, 'Jupiter'), bride, ['Moon']);
  crossPersonal(out, 'Saturn–Venus', find(groom, 'Saturn'), bride, ['Venus']);
  crossPersonal(out, 'Rahu–Venus intensity', find(groom, 'Rahu'), bride, ['Venus']);
  crossPersonal(out, 'Ketu–Moon familiarity / detachment', find(groom, 'Ketu'), bride, ['Moon']);

  return out;
}

function sameSignHighlights(out: CompatibilityRule[], bride: Chart, groom: Chart): void {
  const dedicated = new Set(['Moon/Moon', 'Venus/Venus', 'Sun/Sun', 'Mars/Mars']);
  for (const gp of groom.planets) {
    for (const bp of bride.planets) {
      if (!sameSign(gp, bp)) continue;
      const pair = `${gp.name}/${bp.name}`;
      if (dedicated.has(pair)) {
        let points = gp.name === 'Moon' || gp.name === 'Venus' ? 4 : gp.name === 'Sun' ? 3 : 2;
        if (gp.name === 'Moon' && gp.nakshatra === bp.nakshatra) points = 5;
        directHighlight(out, `${gp.name}–${bp.name} resonance`, points, 5, 'A shared sign can make this planetary theme feel familiar between you.', `Groom ${gp.name} and Bride ${bp.name} are both in ${signName(gp.signNumber - 1)}.`);
      } else {
        directHighlight(out, `${gp.name} → ${bp.name} by sign`, 2, 2, 'This shared-sign contact links the two chart themes; its expression depends on the planets involved.', `Groom ${gp.name} and Bride ${bp.name} are both in ${signName(gp.signNumber - 1)}.`);
      }
    }
  }
}

function overlayHighlights(out: CompatibilityRule[], sourceName: string, source: Chart, targetName: string, target: Chart): void {
  const weights: Record<string, number> = {
    Venus: 4.0, Jupiter: 4.0, Moon: 3.5, Sun: 3.0, Mars: 3.0,
    Mercury: 3.0, Saturn: 2.0, Rahu: 4.0, Ketu: 2.0
  };

  for (const p of source.planets) {
    const h = houseFrom(target.ascendant, p);
    if (h === 7) {
      directHighlight(out, `${p.name} → ${targetName} 7th house`, weights[p.name] || 2.0, 5, `${p.name} activates partnership themes.`, `${sourceName} ${p.name} falls in ${targetName}'s 7th house.`);
    }
    if (p.name === 'Venus' && h !== 7) {
      const points = h === 1 || h === 8 ? 4 : h === 5 ? 5 : h === 11 ? 3 : 0;
      directHighlight(out, `Venus → ${targetName} H${h}`, points, 5, h === 1 ? 'Attraction and recognition.' : h === 5 ? 'Strong romance and affection.' : h === 8 ? 'Attraction and intimacy.' : h === 11 ? 'Friendship and shared goals.' : 'Affection.', `${sourceName} Venus falls in ${targetName}'s ${h}th house.`);
    }
    if (p.name === 'Moon' && h !== 7) {
      const points = [1, 4, 5, 7].includes(h) ? 4 : h === 8 ? 3 : h === 12 ? 1 : 0;
      directHighlight(out, `Moon → ${targetName} H${h}`, points, 4, h === 8 ? 'Emotional intensity.' : h === 12 ? 'Private emotional connection.' : 'Emotional comfort.', `${sourceName} Moon falls in ${targetName}'s ${h}th house.`);
    }
    if (p.name === 'Mars' && h !== 7 && [1, 5, 8].includes(h)) {
      directHighlight(out, `Mars → ${targetName} H${h}`, h === 8 ? 4 : 3, 4, h === 8 ? 'Physical and intimate intensity.' : 'Physical chemistry.', `${sourceName} Mars falls in ${targetName}'s ${h}th house.`);
    }
    if (p.name === 'Jupiter' && h !== 7 && [1, 4, 5, 7, 9].includes(h)) {
      directHighlight(out, `Jupiter → ${targetName} H${h}`, h === 1 || h === 7 ? 5 : 4, 5, 'Jupiter supports goodwill, growth and trust.', `${sourceName} Jupiter falls in ${targetName}'s ${h}th house.`);
    }
    if (p.name === 'Saturn' && h !== 7 && [1, 4, 5, 7, 8, 10].includes(h)) {
      directHighlight(out, `Saturn → ${targetName} H${h}`, [1, 7].includes(h) ? 3 : 2, 5, 'Responsibility and durability.', `${sourceName} Saturn falls in ${targetName}'s ${h}th house.`);
    }
    if (p.name === 'Rahu' && h !== 7 && [1, 4, 5, 8].includes(h)) {
      directHighlight(out, `Rahu intensity → ${targetName} H${h}`, 4, 5, 'Strong fascination or unconventional pull.', `${sourceName} Rahu falls in ${targetName}'s ${h}th house.`);
    }
    if (p.name === 'Ketu' && h !== 7 && [1, 4, 5, 8, 12].includes(h)) {
      directHighlight(out, `Ketu familiarity / detachment → ${targetName} H${h}`, 0, 5, 'A familiar or spiritual pull with a possible need for space.', `${sourceName} Ketu falls in ${targetName}'s ${h}th house.`);
    }
    if (p.name === 'Mercury' && [4, 5, 11].includes(h)) {
      directHighlight(out, `Mercury → ${targetName} H${h}`, 3, 5, h === 11 ? 'Conversation and shared goals.' : 'Playful communication.', `${sourceName} Mercury falls in ${targetName}'s ${h}th house.`);
    }
    if (p.name === 'Sun' && [1, 5, 7].includes(h)) {
      directHighlight(out, `Sun → ${targetName} H${h}`, 3, 5, 'Visibility and identity in the relationship.', `${sourceName} Sun falls in ${targetName}'s ${h}th house.`);
    }
  }
}

function crossPersonal(out: CompatibilityRule[], label: string, source: Position, target: Chart, targetNames: string[]): void {
  for (const targetName of targetNames) {
    const p = find(target, targetName);
    const h = houseFrom(p, source);
    let points = source.signNumber === p.signNumber ? 5 : [1, 5, 7, 9].includes(h) ? 4 : 0;
    if (source.name === 'Rahu') points = source.signNumber === p.signNumber ? 4 : 0;
    if (source.name === 'Ketu') points = 0;
    directHighlight(out, label, points, 5,
      source.name === 'Saturn' ? 'Commitment and responsibility.'
        : source.name === 'Rahu' ? 'Intensity or fascination.'
          : source.name === 'Ketu' ? 'Familiarity or detachment.' : 'Supportive emotional connection.',
      `${source.name} in ${signName(source.signNumber - 1)} and ${targetName} in ${signName(p.signNumber - 1)} (${h} signs apart).`
    );
  }
}

function marriageSynastry(bride: Chart, groom: Chart): CompatibilityRule[] {
  const out: CompatibilityRule[] = [];
  overlayHighlights(out, 'Groom', groom, 'Bride', bride);
  overlayHighlights(out, 'Bride', bride, 'Groom', groom);
  addSeventhLord(out, 'Groom', groom, 'Bride', bride);
  addSeventhLord(out, 'Bride', bride, 'Groom', groom);
  addJaiminiPartnerSignals(out, bride, groom);
  addLagnaLordSynastry(out, bride, groom);
  return out;
}

function charaKaraka(chart: Chart, rank: number): Position {
  const visible = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const sorted = chart.planets
    .filter((p) => visible.includes(p.name))
    .sort((a, b) => b.degreeInSign - a.degreeInSign);
  return sorted[rank];
}

function addJaiminiPartnerSignals(out: CompatibilityRule[], bride: Chart, groom: Chart): void {
  const brideAk = charaKaraka(bride, 0), brideDk = charaKaraka(bride, 6);
  const groomAk = charaKaraka(groom, 0), groomDk = charaKaraka(groom, 6);
  addKarakaOverlay(out, `Groom DK ${groomDk.name}`, groomDk, 'Bride', bride);
  addKarakaOverlay(out, `Bride DK ${brideDk.name}`, brideDk, 'Groom', groom);
  addPairSignal(out, 'Groom AK ↔ Bride DK', groomAk, brideDk, 6);
  addPairSignal(out, 'Bride AK ↔ Groom DK', brideAk, groomDk, 6);

  const relationship = friendship(brideDk.name, groomDk.name);
  const r = rel(brideDk.signNumber, groomDk.signNumber);
  const friendshipPoints = relationship === 'mutual friends' || relationship === 'same ruler' ? 3
    : relationship === 'friend and neutral' ? 2 : relationship === 'mutual neutral' ? 1
      : relationship === 'mutual enemies' ? -1 : 0;
  const positionPoints = [1, 5, 7, 9].includes(r) ? 1 : 0;

  out.push(rule('DK ↔ DK', friendshipPoints + positionPoints, 4,
    'Compares the two spouse significators by planetary friendship and sign relationship.',
    [`Bride DK ${brideDk.name} and Groom DK ${groomDk.name} are ${relationship}.`, `They are ${r} signs apart.`]
  ));
}

function addKarakaOverlay(out: CompatibilityRule[], label: string, karaka: Position, targetName: string, target: Chart): void {
  const moon = find(target, 'Moon'), venus = find(target, 'Venus');
  const contacts = [
    { label: 'Ascendant', signNum: target.ascendant.signNumber },
    { label: 'Moon', signNum: moon.signNumber },
    { label: 'Venus', signNum: venus.signNumber },
    { label: '7th house', signNum: signAtHouse(target.ascendant.signNumber, 7) },
  ];
  for (const c of contacts) {
    const d = rel(c.signNum, karaka.signNumber);
    if ([1, 5, 7, 9].includes(d)) {
      out.push(rule(`${label} → ${targetName} ${c.label}`, 5, 5, 'Jaimini spouse significator contacts a key point.', [
        `${karaka.name} falls ${d} signs from ${targetName} ${c.label}.`
      ]));
    }
  }
}

function addPairSignal(out: CompatibilityRule[], label: string, a: Position, b: Position, max: number): void {
  const d = rel(a.signNumber, b.signNumber);
  const points = a.signNumber === b.signNumber ? 6 : [1, 7].includes(d) ? 5 : [5, 9].includes(d) ? 4 : 0;
  if (points > 0) {
    out.push(rule(label, points, max, 'Soul and spouse significators connect, a notable Jaimini signal.', [
      `${a.name} and ${b.name} are ${d} signs apart.`
    ]));
  }
}

function addLagnaLordSynastry(out: CompatibilityRule[], bride: Chart, groom: Chart): void {
  const brideLord = lord(bride.ascendant.signNumber);
  const groomLord = lord(groom.ascendant.signNumber);
  const b = find(bride, brideLord), g = find(groom, groomLord);
  const gInBride = houseFrom(bride.ascendant, g), bInGroom = houseFrom(groom.ascendant, b);
  const signRelation = rel(b.signNumber, g.signNumber);
  const friends = mutualFriend(brideLord, groomLord) ? 3 : friend(brideLord, groomLord) || friend(groomLord, brideLord) ? 2 : 0;
  const placements = ([1, 5, 7, 9].includes(gInBride) ? 1 : 0) + ([1, 5, 7, 9].includes(bInGroom) ? 1 : 0);
  out.push(rule('Lagna Lord ↔ Lagna Lord synastry', friends + placements, 5, 'Shows whether the partners\' basic drives cooperate.', [
    `Groom Lagna lord ${groomLord} falls in Bride H${gInBride}.`,
    `Bride Lagna lord ${brideLord} falls in Groom H${bInGroom}.`,
    `Their relationship is ${friendship(brideLord, groomLord)}; the planets are ${signRelation} signs apart.`
  ]));
}

function addSeventhLord(out: CompatibilityRule[], sourceName: string, source: Chart, targetName: string, target: Chart): void {
  const seventhLord = lord(signAtHouse(source.ascendant.signNumber, 7));
  const p = find(source, seventhLord);
  const houseFromAsc = houseFrom(target.ascendant, p);
  const houseFromSeventh = houseFrom(find(target, lord(signAtHouse(target.ascendant.signNumber, 7))), p);
  directHighlight(out, `${seventhLord} (7th lord) → ${targetName} Ascendant`, [1, 5, 7, 9, 10, 11].includes(houseFromAsc) ? 5 : 0, 5,
    'Your partner\'s marriage ruler landing in your rising-sign area can make the relationship central.',
    `${sourceName} 7th lord ${seventhLord} falls in ${targetName} H${houseFromAsc}.`
  );
  directHighlight(out, `${seventhLord} (7th lord) → ${targetName} 7th`, houseFromSeventh === 1 ? 5 : 0, 5,
    'Your partner\'s marriage ruler activates your partnership house.',
    `${sourceName} 7th lord ${seventhLord} falls in ${targetName}'s 7th-house sign (relative H${houseFromSeventh}).`
  );
}

export function scoreCompatibility(bride: Chart, groom: Chart): CompatibilityReport {
  const other: CompatibilityRule[] = [];
  kuja(other, bride, groom);
  malefics(other, bride, groom);
  lagnas(other, bride, groom);
  lagnaLords(other, bride, groom);
  seventhHouses(other, bride, groom);
  seventhLords(other, bride, groom);
  eighthLords(other, bride, groom);
  eightPlanets(other, bride, groom);
  lagnaMoon(other, bride, groom);
  venusMars(other, bride, groom);
  venusAssociation(other, bride, groom);
  const otherScore = layer('Other Vedic', 50, other);

  const connections = connectionSimilarity(bride, groom);
  const matchedHouses = connections.filter((c) => c.matched).length;
  const chancePoints = matchedHouses * (5.0 / 12.0);
  const connectionRule = rule('Connection-set similarity', chancePoints, 5,
    `${matchedHouses} of 12 corresponding house connection sets overlap.`,
    connections.map((c) => `H${c.house} ${c.matched ? 'matches' : 'does not match'} (overlap [${c.overlap.join(', ')}])`)
  );
  const chanceRules = [connectionRule, ...similarityIndicators(bride, groom)];
  const chance = layer('Chance of Marriage', 5, chanceRules);

  const direct = directSynastry(bride, groom);
  const marriage = marriageSynastry(bride, groom);

  const notes = [
    'Ashtakoota / Moon Vedic scoring remains its own 36-point system and is not added to Other Vedic or synastry.',
    'Other Vedic is scored out of 50. Chance of Marriage is a separate connection-pattern score out of 5.',
    'Direct and marriage-specific synastry highlights have their own per-rule points; they are not added to either compatibility total.'
  ];

  return {
    otherVedic: otherScore,
    chanceOfMarriage: chance,
    directSynastry: direct,
    marriageSynastry: marriage,
    connectionSets: connections,
    notes,
  };
}
