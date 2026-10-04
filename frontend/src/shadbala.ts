import { dayTimings } from './dayTimings';
import { WEEKDAY_LORDS } from './constants';
import type { Chart } from './types';
import {
  MOOLATRIKONA, SEVEN, compoundRelations, signRelation, vargaSign,
} from './vargas';
import type { Seven } from './vargas';

// Minimum Shadbala in rupas; the Sun's 5 follows JHora (some texts give 6.5).
const REQUIRED: Record<Seven, number> = { Sun: 5, Moon: 6, Mars: 5, Mercury: 7, Jupiter: 6.5, Venus: 5.5, Saturn: 5 };
const DEBILITATION: Record<Seven, number> = { Sun: 190, Moon: 213, Mars: 118, Mercury: 345, Jupiter: 275, Venus: 177, Saturn: 20 };
const DIG_POINT: Record<Seven, number> = { Jupiter: 0, Mercury: 0, Moon: 90, Venus: 90, Saturn: 180, Sun: 270, Mars: 270 };
const NAISARGIKA: Record<Seven, number> = {
  Sun: 60, Moon: 51.43, Venus: 42.85, Jupiter: 34.28, Mercury: 25.71, Mars: 17.14, Saturn: 8.57,
};
const SAPTAVARGAJA_VARGAS = ['D1', 'D2', 'D3', 'D7', 'D9', 'D12', 'D30'];
const SAPTAVARGAJA_POINTS: Record<string, number> = {
  Moolatrikona: 45, Own: 30, 'Adhi Mitra': 22.5, Mitra: 15, Sama: 7.5, Shatru: 3.75, 'Adhi Shatru': 1.875,
};
const BENEFICS: Seven[] = ['Jupiter', 'Venus', 'Moon', 'Mercury'];

export interface Shadbala {
  name: Seven;
  sthana: { uchcha: number; saptavargaja: number; ojayugma: number; kendradi: number; drekkana: number; total: number };
  dig: number;
  kala: {
    nathonnata: number; paksha: number; tribhaga: number; abda: number; masa: number; vara: number; hora: number;
    ayana: number; total: number;
  };
  cheshta: number;
  naisargika: number;
  drik: number;
  total: number;
  rupas: number;
  required: number;
  ratio: number;
  ishta: number;
  kashta: number;
  rank: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const arc = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** Sphuta drishti in virupas of a planet aspecting a point `a` degrees ahead of it (BPHS ch. 26). */
function drishti(planet: Seven, a: number): number {
  if (planet === 'Mars') {
    if (a >= 90 && a < 120) return 45 + (a - 90) / 2;
    if (a >= 120 && a < 150) return 2 * (150 - a);
    if (a >= 180 && a < 210) return 60;
    if (a >= 210 && a < 240) return 270 - a;
  }
  if (planet === 'Jupiter') {
    if (a >= 90 && a < 120) return 45 + (a - 90) / 2;
    if (a >= 120 && a < 150) return 2 * (150 - a);
    if (a >= 210 && a < 240) return 45 + (a - 210) / 2;
    if (a >= 240 && a < 270) return 15 + (2 * (270 - a)) / 3;
  }
  if (planet === 'Saturn') {
    if (a >= 30 && a < 60) return (a - 30) * 2;
    if (a >= 60 && a < 90) return 45 + (90 - a) / 2;
    if (a >= 240 && a < 270) return a - 210;
    if (a >= 270 && a < 330) return Math.max(0, 2 * (300 - a));
  }
  if (a < 30) return 0;
  if (a < 60) return (a - 30) / 2;
  if (a < 90) return a - 45;
  if (a < 120) return 30 + (120 - a) / 2;
  if (a < 150) return 150 - a;
  if (a < 180) return 2 * (a - 150);
  if (a < 300) return (300 - a) / 2;
  return 0;
}

const CHALDEAN: Seven[] = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];
// Weekday lords from Tuesday, as used by B.V. Raman's ahargana for Abda and Masa Bala.
const AHARGANA_LORDS: Seven[] = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Sun', 'Moon'];

/** B.V. Raman's ahargana: 174 days at the start of 1952 plus the days elapsed since. */
function ahargana(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return 174 + (Date.UTC(y, m - 1, d) - Date.UTC(1952, 0, 1)) / 86400000 + 1;
}

// Tropical mean longitudes at J2000 and motion per Julian century (Meeus); planets are heliocentric.
const MEAN_ELEMENTS: Record<'Sun' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn', [number, number]> = {
  Sun: [280.46646, 36000.76983], Mercury: [252.250906, 149472.6746358], Venus: [181.979801, 58517.815676],
  Mars: [355.433, 19141.6964471], Jupiter: [34.351519, 3036.3027748], Saturn: [50.077444, 1222.1137943],
};
const norm360 = (v: number) => ((v % 360) + 360) % 360;

/** Cheshta Bala from the cheshta kendra: sighrochcha minus the mean of the mean and true planet. */
function cheshtaKendraBala(name: 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn', trueTropical: number, t: number): number {
  const mean = (key: keyof typeof MEAN_ELEMENTS) => norm360(MEAN_ELEMENTS[key][0] + MEAN_ELEMENTS[key][1] * t);
  const inner = name === 'Mercury' || name === 'Venus';
  const meanPlanet = inner ? mean('Sun') : mean(name);
  const sighra = inner ? mean(name) : mean('Sun');
  const diff = ((trueTropical - meanPlanet + 540) % 360) - 180;
  const kendra = norm360(sighra - (meanPlanet + diff / 2));
  return (kendra > 180 ? 360 - kendra : kendra) / 3;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function shadbala(chart: Chart): Shadbala[] {
  const b = chart.birthDetails;
  const planet = (n: Seven) => chart.planets.find((p) => p.name === n)!;
  const birth = new Date(b.utcTime);
  let effectiveDate = b.date;
  let timings = dayTimings(b.date, b.latitude, b.longitude);
  // The Vedic day starts at sunrise, so an early-morning birth belongs to the previous weekday.
  if (timings && birth < timings.sunrise) {
    effectiveDate = addDays(b.date, -1);
    timings = dayTimings(effectiveDate, b.latitude, b.longitude);
  }

  const elongation = arc(planet('Moon').longitude, planet('Sun').longitude);
  const subha = elongation / 3;

  let unnata = 30;
  let tribhagaLord: Seven | null = null;
  let varaLord: string | null = null;
  let horaLord: string | null = null;
  if (timings) {
    const sunrise = timings.sunrise.getTime();
    const sunset = timings.sunset.getTime();
    const nextSunrise = dayTimings(addDays(effectiveDate, 1), b.latitude, b.longitude)?.sunrise.getTime()
      ?? sunrise + 86400000;
    const t = birth.getTime();
    const isDay = t >= sunrise && t < sunset;
    const part = isDay
      ? Math.floor(((t - sunrise) / (sunset - sunrise)) * 3)
      : Math.floor(((t - sunset) / (nextSunrise - sunset)) * 3);
    // Day planets score 60 at mid-day, 30 at sunrise/sunset and 0 at mid-night, linear within day and night.
    const fraction = isDay ? (t - sunrise) / (sunset - sunrise) : (t - sunset) / (nextSunrise - sunset);
    const fromMiddle = Math.abs(2 * clamp(fraction, 0, 1) - 1);
    unnata = isDay ? 60 - 30 * fromMiddle : 30 * fromMiddle;
    tribhagaLord = (isDay ? ['Mercury', 'Sun', 'Saturn'] : ['Moon', 'Venus', 'Mars'])[clamp(part, 0, 2)] as Seven;
    varaLord = WEEKDAY_LORDS[timings.weekday];
    // Hora Bala uses 60-minute horas counted from sunrise.
    const hour = Math.floor((t - sunrise) / 3600000);
    horaLord = CHALDEAN[(CHALDEAN.indexOf(varaLord as Seven) + hour) % 7];
  }
  const days = ahargana(b.date);
  const abdaLord = AHARGANA_LORDS[(Math.floor(days / 360) * 3 + 1) % 7];
  const masaLord = AHARGANA_LORDS[(Math.floor(days / 30) * 2 + 1) % 7];
  const moonBenefic = elongation > 90;
  const benefic = (n: Seven) => (n === 'Moon' ? moonBenefic : BENEFICS.includes(n));
  const d1Relations = compoundRelations(chart, 'D1');

  const centuries = (birth.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400000 / 36525;
  const declination = (lon: number) => {
    const tropical = (lon + b.ayanamsaDegrees) % 360;
    return (Math.asin(Math.sin((23.4393 * Math.PI) / 180) * Math.sin((tropical * Math.PI) / 180)) * 180) / Math.PI;
  };
  const ayana = (n: Seven) => {
    const d = declination(planet(n).longitude);
    const value = n === 'Moon' || n === 'Saturn' ? 23.45 - d : n === 'Mercury' ? 23.45 + Math.abs(d) : 23.45 + d;
    return clamp((value / 46.9) * 60, 0, 60) * (n === 'Sun' ? 2 : 1);
  };

  const results = SEVEN.map((name): Omit<Shadbala, 'rank'> => {
    const p = planet(name);

    const uchcha = arc(p.longitude, DEBILITATION[name]) / 3;
    const saptavargaja = SAPTAVARGAJA_VARGAS.reduce((sum, division) => {
      const sign = vargaSign(chart, name, division);
      const mt = MOOLATRIKONA[name];
      const inMoola = division === 'D1' && sign === mt.sign && p.degreeInSign >= mt.from && p.degreeInSign < mt.to;
      // JHora judges every varga by the Rasi chart's compound friendships.
      return sum + SAPTAVARGAJA_POINTS[inMoola ? 'Moolatrikona' : signRelation(name, sign, d1Relations)];
    }, 0);
    const odd = (sign: number) => sign % 2 === 1;
    const ojaVarga = name === 'Moon' || name === 'Venus' ? (s: number) => !odd(s) : odd;
    const ojayugma = (ojaVarga(p.signNumber) ? 15 : 0) + (ojaVarga(vargaSign(chart, name, 'D9')) ? 15 : 0);
    const kendradi = [1, 4, 7, 10].includes(p.house) ? 60 : [2, 5, 8, 11].includes(p.house) ? 30 : 15;
    const decan = Math.min(2, Math.floor(p.degreeInSign / 10));
    const wantedDecan = name === 'Moon' || name === 'Venus' ? 2 : name === 'Mercury' || name === 'Saturn' ? 1 : 0;
    const drekkana = decan === wantedDecan ? 15 : 0;
    const sthanaTotal = uchcha + saptavargaja + ojayugma + kendradi + drekkana;

    const bhava = (p.longitude - chart.ascendant.longitude + 360) % 360;
    const dig = (180 - arc(bhava, DIG_POINT[name])) / 3;

    const dayPlanet = name === 'Sun' || name === 'Jupiter' || name === 'Venus';
    const nathonnata = name === 'Mercury' ? 60 : dayPlanet ? unnata : 60 - unnata;
    const paksha = (benefic(name) ? subha : 60 - subha) * (name === 'Moon' ? 2 : 1);
    const tribhaga = name === 'Jupiter' || name === tribhagaLord ? 60 : 0;
    const abda = name === abdaLord ? 15 : 0;
    const masa = name === masaLord ? 30 : 0;
    const vara = name === varaLord ? 45 : 0;
    const hora = name === horaLord ? 60 : 0;
    const ayanaBala = ayana(name);
    const kalaTotal = nathonnata + paksha + tribhaga + abda + masa + vara + hora + ayanaBala;

    // Sun and Moon Cheshta repeat Ayana and Paksha, so they are shown for Ishta/Kashta but not added to the total.
    const cheshta = name === 'Sun' ? ayanaBala : name === 'Moon' ? subha
      : cheshtaKendraBala(name, norm360(p.longitude + b.ayanamsaDegrees), centuries);

    let drikSum = 0;
    for (const other of SEVEN) {
      if (other === name) continue;
      const value = drishti(other, (p.longitude - planet(other).longitude + 360) % 360);
      drikSum += benefic(other) ? value : -value;
    }
    const drik = drikSum / 4;

    const naisargika = NAISARGIKA[name];
    const total = sthanaTotal + dig + kalaTotal + (name === 'Sun' || name === 'Moon' ? 0 : cheshta) + naisargika + drik;
    const rupas = total / 60;
    return {
      name,
      sthana: { uchcha, saptavargaja, ojayugma, kendradi, drekkana, total: sthanaTotal },
      dig,
      kala: { nathonnata, paksha, tribhaga, abda, masa, vara, hora, ayana: ayanaBala, total: kalaTotal },
      cheshta,
      naisargika,
      drik,
      total,
      rupas,
      required: REQUIRED[name],
      ratio: rupas / REQUIRED[name],
      ishta: Math.sqrt(uchcha * cheshta),
      kashta: Math.sqrt((60 - uchcha) * (60 - cheshta)),
    };
  });
  const order = [...results].sort((a, b) => b.ratio - a.ratio).map((r) => r.name);
  return results.map((r) => ({ ...r, rank: order.indexOf(r.name) + 1 }));
}
