import { dayTimings } from './dayTimings';
import { WEEKDAY_LORDS } from './constants';
import type { Chart } from './types';
import {
  MOOLATRIKONA, SEVEN, compoundRelations, signRelation, vargaSign,
} from './vargas';
import type { Seven } from './vargas';

// Minimum Shadbala in rupas needed for a planet to be considered well-placed (BPHS).
const REQUIRED: Record<Seven, number> = { Sun: 6.5, Moon: 6, Mars: 5, Mercury: 7, Jupiter: 6.5, Venus: 5.5, Saturn: 5 };
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
    nathonnata: number; paksha: number; tribhaga: number; vara: number; hora: number; ayana: number; total: number;
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

/** Aspect strength in virupas (0-60) of a planet aspecting a point `d` degrees ahead of it. */
function drishti(planet: Seven, d: number): number {
  if (planet === 'Mars' && ((d >= 90 && d < 120) || (d >= 210 && d < 240))) return 60;
  if (planet === 'Jupiter' && ((d >= 120 && d < 150) || (d >= 240 && d < 270))) return 60;
  if (planet === 'Saturn' && ((d >= 60 && d < 90) || (d >= 270 && d < 300))) return 60;
  if (d < 30) return 0;
  if (d < 60) return (d - 30) / 2;
  if (d < 90) return d - 60 + 15;
  if (d < 120) return (120 - d) / 2 + 30;
  if (d < 150) return 150 - d;
  if (d < 180) return (d - 150) * 2;
  if (d <= 300) return (300 - d) / 2;
  return 0;
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
    const noon = (sunrise + sunset) / 2;
    const diff = Math.abs(t - noon) / 3600000;
    unnata = clamp(60 * (1 - Math.min(diff, 24 - diff) / 12), 0, 60);
    const isDay = t >= sunrise && t < sunset;
    const part = isDay
      ? Math.floor(((t - sunrise) / (sunset - sunrise)) * 3)
      : Math.floor(((t - sunset) / (nextSunrise - sunset)) * 3);
    tribhagaLord = (isDay ? ['Mercury', 'Sun', 'Saturn'] : ['Moon', 'Venus', 'Mars'])[clamp(part, 0, 2)] as Seven;
    varaLord = WEEKDAY_LORDS[timings.weekday];
    const slots = isDay ? timings.hora.day : timings.hora.night;
    horaLord = slots.find((s) => t >= s.start.getTime() && t < s.end.getTime())?.label ?? null;
  }

  const sunLon = planet('Sun').longitude;
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
      const divisionRelations = compoundRelations(chart, division);
      const mt = MOOLATRIKONA[name];
      const inMoola = division === 'D1' && sign === mt.sign && p.degreeInSign >= mt.from && p.degreeInSign < mt.to;
      return sum + SAPTAVARGAJA_POINTS[inMoola ? 'Moolatrikona' : signRelation(name, sign, divisionRelations)];
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
    const paksha = BENEFICS.includes(name) ? subha : 60 - subha;
    const tribhaga = name === 'Jupiter' || name === tribhagaLord ? 60 : 0;
    const vara = name === varaLord ? 45 : 0;
    const hora = name === horaLord ? 60 : 0;
    const ayanaBala = ayana(name);
    const kalaTotal = nathonnata + paksha + tribhaga + vara + hora + ayanaBala;

    // Cheshta needs mean motion; Sun and Moon use Ayana and Paksha, others are approximated from elongation and retrogression.
    const sunDistance = arc(p.longitude, sunLon);
    const cheshta = name === 'Sun' ? ayanaBala : name === 'Moon' ? paksha
      : p.retrograde ? 60 : name === 'Mercury' || name === 'Venus' ? 30 : clamp(sunDistance / 3, 0, 60);

    let drikSum = 0;
    for (const other of SEVEN) {
      if (other === name) continue;
      const value = drishti(other, (p.longitude - planet(other).longitude + 360) % 360);
      const benefic = other === 'Moon' ? elongation > 90 : BENEFICS.includes(other);
      drikSum += benefic ? value : -value;
    }
    const drik = drikSum / 4;

    const naisargika = NAISARGIKA[name];
    const total = sthanaTotal + dig + kalaTotal + cheshta + naisargika + drik;
    const rupas = total / 60;
    return {
      name,
      sthana: { uchcha, saptavargaja, ojayugma, kendradi, drekkana, total: sthanaTotal },
      dig,
      kala: { nathonnata, paksha, tribhaga, vara, hora, ayana: ayanaBala, total: kalaTotal },
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
