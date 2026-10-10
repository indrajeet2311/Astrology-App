import type { Dasha, SubPeriod, Position } from '../types';
import { nakshatraIndex, norm, NAKSHATRA_SPAN } from './astroMath';

const SECONDS_PER_YEAR = 365.25 * 86_400.0;
const SIDEREAL_YEAR_SECONDS = 365.256363 * 86_400.0;

function formatDate(epochSeconds: number, timeZone: string): string {
  const d = new Date(epochSeconds * 1000);
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString().split('T')[0];
  }
}

export function buildDashas(
  names: string[], yearsByIndex: number[], sequence: number[],
  elapsedFraction: number, birthEpochSeconds: number, timeZone: string,
  secondsPerYear = SECONDS_PER_YEAR, equalAntardashas = false
): Dasha[] {
  const firstLength = yearsByIndex[sequence[0]] * secondsPerYear;
  let cursor = birthEpochSeconds - elapsedFraction * firstLength;
  const cycleYears = yearsByIndex.reduce((acc, y) => acc + y, 0);

  const result: Dasha[] = [];
  for (const lord of sequence) {
    const length = yearsByIndex[lord] * secondsPerYear;
    const end = cursor + length;
    const antardashas = subPeriods(
      names, yearsByIndex, sequence, lord, cursor, length,
      cycleYears, timeZone, equalAntardashas
    );
    result.push({
      lord: names[lord],
      start: formatDate(cursor, timeZone),
      end: formatDate(end, timeZone),
      antardashas,
      pratyantardashas: [],
    });
    cursor = end;
  }
  return result;
}

function subPeriods(
  names: string[], years: number[], sequence: number[], startIndex: number,
  start: number, length: number, totalYears: number, timeZone: string,
  equalPeriods: boolean
): SubPeriod[] {
  let startAt = 0;
  while (sequence[startAt] !== startIndex) startAt++;
  if (equalPeriods) startAt = (startAt + 1) % sequence.length;

  const result: SubPeriod[] = [];
  let cursor = start;
  for (let i = 0; i < sequence.length; i++) {
    const lord = sequence[(startAt + i) % sequence.length];
    const subLength = i === sequence.length - 1
      ? start + length - cursor
      : equalPeriods ? length / sequence.length : (length * years[lord]) / totalYears;
    const end = cursor + subLength;
    const pratyantars = pratyantardashas(names, years, sequence, lord, cursor, subLength, totalYears, timeZone);
    result.push({
      lord: names[lord],
      start: formatDate(cursor, timeZone),
      end: formatDate(end, timeZone),
      pratyantardashas: pratyantars,
    });
    cursor = end;
  }
  return result;
}

function pratyantardashas(
  names: string[], years: number[], sequence: number[], startIndex: number,
  start: number, length: number, totalYears: number, timeZone: string
): SubPeriod[] {
  let startAt = 0;
  while (sequence[startAt] !== startIndex) startAt++;

  const result: SubPeriod[] = [];
  let cursor = start;
  for (let i = 0; i < sequence.length; i++) {
    const lord = sequence[(startAt + i) % sequence.length];
    const subLength = i === sequence.length - 1
      ? start + length - cursor
      : (length * years[lord]) / totalYears;
    const end = cursor + subLength;
    result.push({
      lord: names[lord],
      start: formatDate(cursor, timeZone),
      end: formatDate(end, timeZone),
      pratyantardashas: [],
    });
    cursor = end;
  }
  return result;
}

// ---------------- Vimshottari Dasha ----------------
const VIMSHOTTARI_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const VIMSHOTTARI_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17];

export function computeVimshottari(moonLongitude: number, birthEpochSeconds: number, timeZone: string): Dasha[] {
  const lon = norm(moonLongitude);
  const nakshatra = nakshatraIndex(lon);
  const elapsedFraction = (lon - nakshatra * NAKSHATRA_SPAN) / NAKSHATRA_SPAN;
  const first = nakshatra % 9;
  const sequence = Array.from({ length: 9 }, (_, i) => (first + i) % 9);
  return buildDashas(VIMSHOTTARI_LORDS, VIMSHOTTARI_YEARS, sequence, elapsedFraction, birthEpochSeconds, timeZone);
}

// ---------------- Yogini Dasha ----------------
const YOGINIS = ['Mangala', 'Pingala', 'Dhanya', 'Bhramari', 'Bhadrika', 'Ulka', 'Siddha', 'Sankata'];
const YOGINI_YEARS = [1, 2, 3, 4, 5, 6, 7, 8];

export function computeYogini(moonLongitude: number, birthEpochSeconds: number, timeZone: string): Dasha[] {
  const lon = norm(moonLongitude);
  const nakshatra = nakshatraIndex(lon);
  const withinNakshatra = lon - nakshatra * NAKSHATRA_SPAN;
  const elapsed = withinNakshatra / NAKSHATRA_SPAN;
  const first = (nakshatra + 3) % YOGINIS.length;
  const sequence = Array.from({ length: YOGINIS.length }, (_, i) => (first + i) % YOGINIS.length);
  return buildDashas(YOGINIS, YOGINI_YEARS, sequence, elapsed, birthEpochSeconds, timeZone);
}

// ---------------- Chara Dasha ----------------
const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

function findPlanet(planets: Position[], name: string): Position {
  const p = planets.find((x) => x.name === name);
  if (!p) throw new Error(`Planet ${name} not found`);
  return p;
}

function strongerLord(signIndex: number, planets: Position[], a: Position, b: Position): Position {
  const aHome = a.signNumber - 1 === signIndex;
  const bHome = b.signNumber - 1 === signIndex;
  if (aHome !== bHome) return aHome ? b : a;
  const aCount = planets.filter((p) => p !== a && p.signNumber === a.signNumber).length;
  const bCount = planets.filter((p) => p !== b && p.signNumber === b.signNumber).length;
  if (aCount !== bCount) return aCount > bCount ? a : b;
  return a.degreeInSign >= b.degreeInSign ? a : b;
}

function lordOfSign(signIndex: number, planets: Position[]): Position {
  switch (signIndex) {
    case 0: return findPlanet(planets, 'Mars');
    case 7: return strongerLord(signIndex, planets, findPlanet(planets, 'Mars'), findPlanet(planets, 'Ketu'));
    case 1:
    case 6: return findPlanet(planets, 'Venus');
    case 2:
    case 5: return findPlanet(planets, 'Mercury');
    case 3: return findPlanet(planets, 'Moon');
    case 4: return findPlanet(planets, 'Sun');
    case 8:
    case 11: return findPlanet(planets, 'Jupiter');
    case 9: return findPlanet(planets, 'Saturn');
    case 10: return strongerLord(signIndex, planets, findPlanet(planets, 'Saturn'), findPlanet(planets, 'Rahu'));
    default: throw new Error(`Invalid sign index ${signIndex}`);
  }
}

function durationYears(signIndex: number, planets: Position[]): number {
  const countDirection = [0, 1, 2, 6, 7, 8].includes(signIndex) ? 1 : -1;
  const rulerSign = lordOfSign(signIndex, planets).signNumber - 1;
  const distance = ((rulerSign - signIndex) * countDirection + 120) % 12;
  return distance === 0 ? 12 : distance;
}

export function computeChara(
  ascendantSignNumber: number, planets: Position[],
  birthEpochSeconds: number, timeZone: string
): Dasha[] {
  const start = ascendantSignNumber - 1;
  const sequenceDirection = ((start + 8) % 12) % 2 === 0 ? 1 : -1;
  const sequence = Array.from({ length: SIGNS.length }, (_, i) => (start + sequenceDirection * i + 120) % 12);
  const years = Array.from({ length: SIGNS.length }, (_, signIndex) => durationYears(signIndex, planets));
  return buildDashas(
    SIGNS, years, sequence, 0, birthEpochSeconds, timeZone,
    SIDEREAL_YEAR_SECONDS, true
  );
}
