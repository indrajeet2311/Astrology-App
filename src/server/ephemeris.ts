import * as Astronomy from 'astronomy-engine';
import type { Ayanamsa, HouseSystem, Position } from '../types';
import {
  divisionalSign,
  house,
  nakshatra,
  navamsaSign,
  norm,
  pada,
  sign,
  signName
} from './astroMath';
import { dignity, isCombust } from './dignity';

const BODIES = [
  { name: 'Sun', astro: 'Sun' },
  { name: 'Moon', astro: 'Moon' },
  { name: 'Mars', astro: 'Mars' },
  { name: 'Mercury', astro: 'Mercury' },
  { name: 'Jupiter', astro: 'Jupiter' },
  { name: 'Venus', astro: 'Venus' },
  { name: 'Saturn', astro: 'Saturn' },
] as const;

export function julianDay(date: Date): number {
  return 2440587.5 + date.getTime() / 86_400_000.0;
}

export function calculateAyanamsaDegrees(date: Date, ayanamsa: Ayanamsa): number {
  const jd = julianDay(date);
  const t = (jd - 2451545.0) / 36525.0;
  // Lahiri (Chitrapaksha) IAU standard model
  const lahiri = 23.85709167 + 1.39604167 * t + 0.00030778 * t * t;

  switch (ayanamsa) {
    case 'LAHIRI':
      return lahiri;
    case 'RAMAN':
      return lahiri - 1.4468;
    case 'KRISHNAMURTI':
      return lahiri - 0.0988;
    case 'TRUE_CHITRA':
      return lahiri - 0.014;
    case 'YUKTESHWAR':
      return lahiri - 2.87;
    default:
      return lahiri;
  }
}

export function calculateTropicalAscendant(date: Date, latitude: number, longitude: number): number {
  const astroTime = Astronomy.MakeTime(date);
  const gst = Astronomy.SiderealTime(date);
  const lstHours = (gst + longitude / 15.0 + 240.0) % 24.0;
  const ramcDeg = lstHours * 15.0;
  const tobl = Astronomy.e_tilt(astroTime).tobl;

  const r = (ramcDeg * Math.PI) / 180.0;
  const e = (tobl * Math.PI) / 180.0;
  const phi = (latitude * Math.PI) / 180.0;

  const y = Math.cos(r);
  const x = -(Math.sin(r) * Math.cos(e) + Math.tan(phi) * Math.sin(e));
  const asc = (Math.atan2(y, x) * 180.0) / Math.PI;
  return norm(asc);
}

export function calculateSiderealAscendant(
  date: Date, latitude: number, longitude: number, ayanamsa: Ayanamsa
): number {
  const trop = calculateTropicalAscendant(date, latitude, longitude);
  const ayan = calculateAyanamsaDegrees(date, ayanamsa);
  return norm(trop - ayan);
}

function tropicalBodyLongitude(name: string, date: Date): { longitude: number; retrograde: boolean } {
  const bodyName = name as Astronomy.Body;
  const v1 = Astronomy.GeoVector(bodyName, date, false);
  const ecl1 = Astronomy.Ecliptic(v1);

  // Speed calculation via 1-hour interval
  const dtHours = 1;
  const dLater = new Date(date.getTime() + dtHours * 3600_000);
  const v2 = Astronomy.GeoVector(bodyName, dLater, false);
  const ecl2 = Astronomy.Ecliptic(v2);

  let diff = ecl2.elon - ecl1.elon;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  return {
    longitude: norm(ecl1.elon),
    retrograde: diff < 0
  };
}

function lunarNodeLongitude(date: Date, trueNode: boolean): { longitude: number; retrograde: boolean } {
  const jd = julianDay(date);
  const t = (jd - 2451545.0) / 36525.0;
  // Mean ascending node (Rahu)
  const omega = 125.04452 - 1934.136261 * t + 0.0020708 * t * t + (t * t * t) / 450000.0;

  if (!trueNode) {
    return { longitude: norm(omega), retrograde: true };
  }

  // True node with principal nutation & lunar perturbations
  const d = (297.85036 + 445267.11148 * t) * (Math.PI / 180);
  const m = (357.52772 + 35999.05034 * t) * (Math.PI / 180);
  const mPrime = (134.96298 + 477198.867398 * t) * (Math.PI / 180);
  const f = (93.27191 + 483202.017538 * t) * (Math.PI / 180);

  const corr =
    -1.4979 * Math.sin(2 * (d - f)) -
    0.15 * Math.sin(m) -
    0.1226 * Math.sin(2 * d) +
    0.1176 * Math.sin(2 * f) -
    0.0801 * Math.sin(2 * (d - mPrime));

  return { longitude: norm(omega + corr), retrograde: true };
}

export function createPosition(
  name: string,
  rawLongitude: number,
  ascLongitude: number,
  retrograde: boolean,
  sunLongitude: number,
  houseSystem: HouseSystem = 'WHOLE_SIGN'
): Position {
  const lon = norm(rawLongitude);
  const s = sign(lon);
  const navamsa = navamsaSign(lon);
  const divisionalSigns: Record<string, number> = {};
  for (const div of [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60]) {
    divisionalSigns[`D${div}`] = divisionalSign(lon, div) + 1;
  }

  return {
    name,
    longitude: lon,
    sign: signName(s),
    signNumber: s + 1,
    house: house(lon, ascLongitude, houseSystem),
    degreeInSign: lon - s * 30.0,
    nakshatra: nakshatra(lon),
    pada: pada(lon),
    retrograde,
    navamsaSignNumber: navamsa + 1,
    dignity: dignity(name, s),
    combust: isCombust(name, lon, retrograde, sunLongitude),
    vargottama: navamsa === s,
    divisionalSigns,
  };
}

export function calculatePlanetsAt(
  date: Date,
  ascLongitude: number,
  ayanamsa: Ayanamsa,
  trueNode: boolean,
  houseSystem: HouseSystem = 'WHOLE_SIGN'
): Position[] {
  const ayan = calculateAyanamsaDegrees(date, ayanamsa);
  const planets: Position[] = [];
  let sunLon = NaN;

  for (const body of BODIES) {
    const trop = tropicalBodyLongitude(body.astro, date);
    const siderealLon = norm(trop.longitude - ayan);
    if (body.name === 'Sun') sunLon = siderealLon;
    planets.push(createPosition(body.name, siderealLon, ascLongitude, trop.retrograde, sunLon, houseSystem));
  }

  // Rahu & Ketu
  const nodeTrop = lunarNodeLongitude(date, trueNode);
  const rahuSidereal = norm(nodeTrop.longitude - ayan);
  const ketuSidereal = norm(rahuSidereal + 180.0);

  const rahu = createPosition('Rahu', rahuSidereal, ascLongitude, true, sunLon, houseSystem);
  planets.push(rahu);

  const ketu = createPosition('Ketu', ketuSidereal, ascLongitude, true, sunLon, houseSystem);
  planets.push(ketu);

  return planets;
}
