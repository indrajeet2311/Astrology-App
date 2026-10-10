import type { Chart, KundliMatch, KootaScore } from '../types';
import { nakshatraIndex, norm, sign, signName } from './astroMath';
import { signLord } from './dignity';
import { mangal } from './doshas';
import { scoreCompatibility } from './vedicSynastry';

const MAX_SCORE = 36.0;

const NAKSHATRA_GANA = [
  0, 1, 2, 1, 0, 2, 0, 0, 2, 2, 1, 1, 0, 2, 0, 1, 0, 2, 2, 1, 1, 0, 2, 0, 2, 1, 0,
];

const YONI = [
  'Horse', 'Elephant', 'Sheep', 'Serpent', 'Serpent', 'Dog', 'Cat', 'Sheep', 'Cat', 'Rat', 'Rat',
  'Cow', 'Buffalo', 'Tiger', 'Buffalo', 'Tiger', 'Deer', 'Deer', 'Dog', 'Monkey', 'Mongoose',
  'Monkey', 'Lion', 'Horse', 'Lion', 'Cow', 'Elephant',
];

function pairStr(first: string, second: string): string {
  return first < second ? `${first}/${second}` : `${second}/${first}`;
}

const ENEMY_YONI_PAIRS = new Set([
  pairStr('Horse', 'Buffalo'),
  pairStr('Elephant', 'Lion'),
  pairStr('Sheep', 'Monkey'),
  pairStr('Serpent', 'Mongoose'),
  pairStr('Dog', 'Deer'),
  pairStr('Cat', 'Rat'),
  pairStr('Cow', 'Tiger'),
]);

const VASHYA_POINTS: number[][] = [
  [2, 1, 1, 1, 0],
  [1, 2, 1, 1, 0],
  [1, 1, 2, 0, 1],
  [1, 1, 0, 2, 0],
  [0, 0, 1, 0, 2],
];

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

function varnaRank(s: number): number {
  switch (s % 4) {
    case 0: return 3;
    case 1: return 2;
    case 2: return 1;
    default: return 4;
  }
}

function varna(brideSign: number, groomSign: number): number {
  return varnaRank(groomSign) >= varnaRank(brideSign) ? 1 : 0;
}

function vashyaClass(s: number, longitude: number): number {
  const degree = norm(longitude) - s * 30.0;
  switch (s) {
    case 0:
    case 1:
      return 0;
    case 2:
    case 5:
    case 6:
    case 10:
      return 1;
    case 3:
    case 11:
      return 2;
    case 4:
      return 3;
    case 7:
      return 4;
    case 8:
      return degree < 15 ? 1 : 0;
    case 9:
      return degree < 15 ? 0 : 2;
    default:
      throw new Error(`Invalid Moon sign index ${s}`);
  }
}

function taraDirection(from: number, to: number): boolean {
  const count = ((to - from + 270) % 27) + 1;
  const rem = count % 9;
  return rem === 0 || rem === 2 || rem === 4 || rem === 6 || rem === 8;
}

function tara(brideNakshatra: number, groomNakshatra: number): number {
  return (taraDirection(brideNakshatra, groomNakshatra) ? 1.5 : 0) +
    (taraDirection(groomNakshatra, brideNakshatra) ? 1.5 : 0);
}

function yoni(brideNakshatra: number, groomNakshatra: number): number {
  const b = YONI[brideNakshatra];
  const g = YONI[groomNakshatra];
  if (b === g) return 4;
  return ENEMY_YONI_PAIRS.has(pairStr(b, g)) ? 0 : 2;
}

function grahaMaitri(brideSign: number, groomSign: number): number {
  const bLord = signLord(brideSign);
  const gLord = signLord(groomSign);
  if (bLord === gLord) return 5;
  const bFriend = FRIENDS[bLord]?.has(gLord) ?? false;
  const gFriend = FRIENDS[gLord]?.has(bLord) ?? false;
  const bEnemy = ENEMIES[bLord]?.has(gLord) ?? false;
  const gEnemy = ENEMIES[gLord]?.has(bLord) ?? false;

  if (bFriend && gFriend) return 5;
  if (bEnemy && gEnemy) return 0;
  if ((bFriend && gEnemy) || (bEnemy && gFriend)) return 1;
  if (bFriend || gFriend) return 4;
  if (bEnemy || gEnemy) return 0.5;
  return 3;
}

function gana(brideNak: number, groomNak: number): number {
  const b = NAKSHATRA_GANA[brideNak];
  const g = NAKSHATRA_GANA[groomNak];
  if (b === g) return 6;
  if (Math.min(b, g) === 0 && Math.max(b, g) === 1) return 5;
  if (Math.min(b, g) === 0) return 1;
  return 0;
}

function bhakoot(brideSign: number, groomSign: number): number {
  const distance = ((groomSign - brideSign + 120) % 12);
  return [1, 11, 4, 8, 5, 7].includes(distance) ? 0 : 7;
}

function nadi(brideNak: number, groomNak: number): number {
  return brideNak % 3 === groomNak % 3 ? 0 : 8;
}

export function matchMoons(brideMoonLon: number, groomMoonLon: number): {
  score: number;
  maxScore: number;
  brideMoonSign: string;
  groomMoonSign: string;
  kootas: KootaScore[];
  notes: string[];
} {
  const brideSign = sign(brideMoonLon);
  const groomSign = sign(groomMoonLon);
  const brideNak = nakshatraIndex(brideMoonLon);
  const groomNak = nakshatraIndex(groomMoonLon);

  const kootas: KootaScore[] = [
    { name: 'Varna', score: varna(brideSign, groomSign), maxScore: 1, detail: 'Moon-sign social class compatibility.' },
    { name: 'Vashya', score: VASHYA_POINTS[vashyaClass(brideSign, brideMoonLon)][vashyaClass(groomSign, groomMoonLon)], maxScore: 2, detail: 'Mutual influence based on Moon-sign groups.' },
    { name: 'Tara', score: tara(brideNak, groomNak), maxScore: 3, detail: 'Birth-star compatibility in both directions.' },
    { name: 'Yoni', score: yoni(brideNak, groomNak), maxScore: 4, detail: 'Nakshatra animal compatibility.' },
    { name: 'Graha Maitri', score: grahaMaitri(brideSign, groomSign), maxScore: 5, detail: 'Friendship between the Moon-sign rulers.' },
    { name: 'Gana', score: gana(brideNak, groomNak), maxScore: 6, detail: 'Temperament compatibility by birth star.' },
    { name: 'Bhakoot', score: bhakoot(brideSign, groomSign), maxScore: 7, detail: 'Moon-sign relationship.' },
    { name: 'Nadi', score: nadi(brideNak, groomNak), maxScore: 8, detail: 'Nadi compatibility by birth star.' },
  ];

  const total = kootas.reduce((acc, k) => acc + k.score, 0);
  const notes: string[] = [];
  if (kootas.find((k) => k.name === 'Bhakoot')?.score === 0) {
    notes.push('Bhakoot Dosha is indicated by the Moon-sign relationship.');
  }
  if (kootas.find((k) => k.name === 'Nadi')?.score === 0) {
    notes.push('Nadi Dosha is indicated because both stars are in the same Nadi group.');
  }
  if (total < 18) {
    notes.push('The score is below 18 of 36, a commonly used traditional threshold.');
  } else {
    notes.push('The score is at or above 18 of 36, a commonly used traditional threshold.');
  }

  return {
    score: total,
    maxScore: MAX_SCORE,
    brideMoonSign: signName(brideSign),
    groomMoonSign: signName(groomSign),
    kootas,
    notes,
  };
}

export function matchCharts(bride: Chart, groom: Chart): KundliMatch {
  const brideMoon = bride.planets.find((p) => p.name === 'Moon')!;
  const groomMoon = groom.planets.find((p) => p.name === 'Moon')!;

  const base = matchMoons(brideMoon.longitude, groomMoon.longitude);
  const brideMangal = mangal(bride.planets);
  const groomMangal = mangal(groom.planets);

  const brideActive = brideMangal.present && brideMangal.level !== 'Cancelled';
  const groomActive = groomMangal.present && groomMangal.level !== 'Cancelled';
  const balanced = brideActive === groomActive;

  const verdict = !brideActive && !groomActive
    ? 'Neither chart carries an active Mangal dosha.'
    : brideActive && groomActive
      ? 'Both charts carry Mangal dosha, which traditionally balances each other.'
      : `${brideActive ? "Only the bride's chart" : "Only the groom's chart"} carries an active Mangal dosha; traditional practice recommends remedies or a balancing match.`;

  const remedies: string[] = [];
  const notes = [...base.notes];
  const brideNak = nakshatraIndex(brideMoon.longitude);
  const groomNak = nakshatraIndex(groomMoon.longitude);
  const sameSignMoon = brideMoon.signNumber === groomMoon.signNumber;
  const nadiDosha = base.kootas.some((k) => k.name === 'Nadi' && k.score === 0);
  const nadiException = nadiDosha && (sameSignMoon !== (brideNak === groomNak));

  if (nadiDosha && nadiException) {
    notes.push('Nadi Dosha is traditionally considered cancelled because the two Moons share either a sign or a star, but not both.');
  } else if (nadiDosha) {
    remedies.push('Nadi Dosha: recite the Maha Mrityunjaya mantra, perform a Nadi Dosha Nivaran puja before the wedding, and make traditional donations (grain, cow or gold) as advised by a priest.');
  }

  const bhakootDosha = base.kootas.some((k) => k.name === 'Bhakoot' && k.score === 0);
  if (bhakootDosha) {
    remedies.push('Bhakoot Dosha: it is eased when both Moon-sign lords are the same or friendly; otherwise worship of the Moon-sign deities and Vishnu Sahasranama are traditionally suggested.');
  }

  if (brideActive !== groomActive) {
    remedies.push("Kuja (Mangal) Dosha: Tuesday fasting, Hanuman Chalisa, Mangal Shanti puja and donating red lentils or jaggery are traditional remedies; some families also perform Kumbh Vivah. Do not wear red coral without an astrologer's advice.");
  }

  if (remedies.length === 0) {
    remedies.push('No major dosha remedies are indicated by this screening.');
  }

  const score = base.score;
  const band = score >= 33 ? 'excellent' : score >= 25 ? 'very good' : score >= 18 ? 'acceptable' : 'below the traditional threshold';
  const summary = `Guna Milan score ${score.toFixed(1)} of 36 is ${band}. ${verdict}`;

  const compatibility = scoreCompatibility(bride, groom);

  return {
    ...base,
    notes,
    manglik: {
      bride: brideMangal,
      groom: groomMangal,
      balanced,
      verdict,
    },
    remedies,
    summary,
    compatibility,
  };
}
