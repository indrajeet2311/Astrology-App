import type {
  AnnualChartsResponse,
  BirthDetails,
  BirthPayload,
  Chart,
  DailyPanchang,
  PanchangRequest,
} from '../types';
import {
  calculateAyanamsaDegrees,
  calculatePlanetsAt,
  calculateSiderealAscendant,
  createPosition,
} from './ephemeris';
import { computeChara, computeVimshottari, computeYogini } from './dashaBuilder';
import { aspects, sadeSati, yogas } from './chartInsights';
import { calculatePanchang } from './panchang';

function parseBirthInstant(dateStr: string, timeStr: string, timeZone: string): {
  date: Date;
  utcOffset: string;
  utcTime: string;
} {
  // Use Intl to find the timezone offset
  const testDate = new Date(`${dateStr}T${timeStr}:00Z`);
  const invDate = new Date(testDate.toLocaleString('en-US', { timeZone: 'UTC' }));
  const targetDate = new Date(testDate.toLocaleString('en-US', { timeZone }));
  const diffMinutes = Math.round((targetDate.getTime() - invDate.getTime()) / 60000);

  const localTimeMs = new Date(`${dateStr}T${timeStr}:00Z`).getTime();
  const utcMs = localTimeMs - diffMinutes * 60000;
  const actualDate = new Date(utcMs);

  const sign = diffMinutes >= 0 ? '+' : '-';
  const absMin = Math.abs(diffMinutes);
  const hours = String(Math.floor(absMin / 60)).padStart(2, '0');
  const mins = String(absMin % 60).padStart(2, '0');
  const utcOffset = `${sign}${hours}:${mins}`;

  return {
    date: actualDate,
    utcOffset,
    utcTime: actualDate.toISOString().replace('.000', ''),
  };
}

export function calculateChart(payload: BirthPayload): Chart {
  const ayanamsa = payload.ayanamsa || 'LAHIRI';
  const trueNode = Boolean(payload.trueNode);
  const houseSystem = payload.houseSystem || 'WHOLE_SIGN';
  const laterOffset = Boolean(payload.laterOffset);

  const { date: natalDate, utcOffset, utcTime } = parseBirthInstant(
    payload.date,
    payload.time,
    payload.timeZone
  );

  const ascLon = calculateSiderealAscendant(natalDate, payload.latitude, payload.longitude, ayanamsa);
  const ascendant = createPosition('Ascendant', ascLon, ascLon, false, NaN, houseSystem);

  const planets = calculatePlanetsAt(natalDate, ascLon, ayanamsa, trueNode, houseSystem);
  const moon = planets.find((p) => p.name === 'Moon')!;
  const sun = planets.find((p) => p.name === 'Sun')!;

  const birthEpochSeconds = Math.floor(natalDate.getTime() / 1000);
  const dashas = computeVimshottari(moon.longitude, birthEpochSeconds, payload.timeZone);
  const yoginiDashas = computeYogini(moon.longitude, birthEpochSeconds, payload.timeZone);
  const charaDashas = computeChara(ascendant.signNumber, planets, birthEpochSeconds, payload.timeZone);

  const aspectList = aspects(planets);
  const yogaList = yogas(ascendant, planets);

  // Transits
  const transitDate = payload.transitDate
    ? new Date(`${payload.transitDate}T12:00:00Z`)
    : new Date();
  const transitPlanets = calculatePlanetsAt(transitDate, ascLon, ayanamsa, trueNode, houseSystem);
  const saturn = transitPlanets.find((p) => p.name === 'Saturn')!;
  const sadeSatiInfo = sadeSati(moon.signNumber, saturn.signNumber);

  const transits = {
    asOf: transitDate.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    planets: transitPlanets,
    sadeSati: sadeSatiInfo,
  };

  const panchang = calculatePanchang(sun.longitude, moon.longitude, payload.date);

  const birthDetails: BirthDetails = {
    name: payload.name ? payload.name.trim() : null,
    date: payload.date,
    localTime: payload.time,
    utcOffset,
    utcTime,
    placeName: payload.placeName,
    latitude: payload.latitude,
    longitude: payload.longitude,
    timeZone: payload.timeZone,
    ayanamsa,
    ayanamsaDegrees: calculateAyanamsaDegrees(natalDate, ayanamsa),
    trueNode,
    houseSystem,
    laterOffset,
  };

  return {
    birthDetails,
    ascendant,
    planets,
    dashas,
    yoginiDashas,
    charaDashas,
    aspects: aspectList,
    yogas: yogaList,
    transits,
    panchang,
  };
}

export function calculateDailyPanchang(req: PanchangRequest): DailyPanchang {
  const chart = calculateChart({
    name: 'Daily Panchang',
    date: req.date,
    time: '12:00',
    placeName: req.placeName,
    latitude: req.latitude,
    longitude: req.longitude,
    timeZone: req.timeZone,
    ayanamsa: req.ayanamsa,
  });

  const moon = chart.planets.find((p) => p.name === 'Moon')!;
  return {
    asOf: new Date(`${req.date}T12:00:00Z`).toISOString().slice(0, 16) + 'Z',
    panchang: chart.panchang,
    moon,
  };
}

export function calculateAnnualCharts(birth: BirthPayload, year: number): AnnualChartsResponse {
  // Natal chart
  calculateChart(birth);

  // Approximate solar return around birthday of return year
  const [, bMonth, bDay] = birth.date.split('-').map(Number);
  const approxReturn = new Date(`${year}-${String(bMonth).padStart(2, '0')}-${String(bDay).padStart(2, '0')}T${birth.time}:00Z`);

  const varshaphal = calculateChart({
    ...birth,
    date: `${year}-${String(bMonth).padStart(2, '0')}-${String(bDay).padStart(2, '0')}`,
  });

  const tithiPravesh = calculateChart({
    ...birth,
    date: `${year}-${String(bMonth).padStart(2, '0')}-${String(bDay).padStart(2, '0')}`,
  });

  return {
    year,
    varshaphalAt: approxReturn.toISOString(),
    varshaphal,
    tithiPraveshAt: approxReturn.toISOString(),
    tithiPravesh,
  };
}
