import type { Panchang } from '../types';
import { norm } from './astroMath';

const TITHIS = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami',
  'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi'
];

const YOGAS = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda',
  'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyana', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti'
];

const MOVABLE_KARANAS = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti'];

// Day of week index: 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
const VARA_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const VARA_LORDS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

function karana(index: number): string {
  switch (index) {
    case 0: return 'Kimstughna';
    case 57: return 'Shakuni';
    case 58: return 'Chatushpada';
    case 59: return 'Naga';
    default: return MOVABLE_KARANAS[(index - 1) % 7];
  }
}

export function calculatePanchang(sunLongitude: number, moonLongitude: number, localDate: string): Panchang {
  const elongation = norm(moonLongitude - sunLongitude);
  const tithi = Math.min(29, Math.floor(elongation / 12.0)) + 1;
  const shukla = tithi <= 15;
  const tithiName = tithi === 15 ? 'Purnima' : tithi === 30 ? 'Amavasya' : TITHIS[(tithi - 1) % 15];

  const yoga = Math.min(26, Math.floor(norm(sunLongitude + moonLongitude) / (360.0 / 27.0)));

  const dateObj = new Date(localDate + 'T12:00:00Z');
  const dayIndex = dateObj.getUTCDay();

  return {
    tithiNumber: tithi,
    tithi: tithiName,
    paksha: shukla ? 'Shukla' : 'Krishna',
    vara: VARA_NAMES[dayIndex],
    varaLord: VARA_LORDS[dayIndex],
    yoga: YOGAS[yoga],
    karana: karana(Math.min(59, Math.floor(elongation / 6.0)))
  };
}

export function calculateSunTimes(date: string, latitude: number, longitude: number): { sunrise: string; sunset: string } {
  const [year, month, day] = date.split('-').map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  const sunriseInst = event(dateObj, latitude, longitude, true);
  const sunsetInst = event(dateObj, latitude, longitude, false);
  return {
    sunrise: sunriseInst.toISOString(),
    sunset: sunsetInst.toISOString()
  };
}

function event(date: Date, lat: number, lon: number, rise: boolean): Date {
  const utcMidnight = date.getTime();
  const jd0 = utcMidnight / 86400000.0 + 2440587.5;
  let minutes = 720;
  let found = true;

  for (let i = 0; i < 3 && found; i++) {
    const t = (jd0 + minutes / 1440.0 - 2451545.0) / 36525.0;
    const l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
    const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
    const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
    const c = Math.sin((m * Math.PI) / 180) * (1.914602 - t * (0.004817 + 0.000014 * t))
      + Math.sin((2 * m * Math.PI) / 180) * (0.019993 - 0.000101 * t)
      + Math.sin((3 * m * Math.PI) / 180) * 0.000289;
    const omega = 125.04 - 1934.136 * t;
    const lambda = l0 + c - 0.00569 - 0.00478 * Math.sin((omega * Math.PI) / 180);
    const eps = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60
      + 0.00256 * Math.cos((omega * Math.PI) / 180);
    const decl = (Math.asin(Math.sin((eps * Math.PI) / 180) * Math.sin((lambda * Math.PI) / 180)) * 180) / Math.PI;
    const y = Math.pow(Math.tan(((eps / 2) * Math.PI) / 180), 2);
    const eqTime = 4 * ((y * Math.sin((2 * l0 * Math.PI) / 180)
      - 2 * e * Math.sin((m * Math.PI) / 180)
      + 4 * e * y * Math.sin((m * Math.PI) / 180) * Math.cos((2 * l0 * Math.PI) / 180)
      - 0.5 * y * y * Math.sin((4 * l0 * Math.PI) / 180)
      - 1.25 * e * e * Math.sin((2 * m * Math.PI) / 180)) * 180) / Math.PI;

    const cosHa = Math.cos((90.833 * Math.PI) / 180) / (Math.cos((lat * Math.PI) / 180) * Math.cos((decl * Math.PI) / 180))
      - Math.tan((lat * Math.PI) / 180) * Math.tan((decl * Math.PI) / 180);

    if (cosHa < -1 || cosHa > 1) {
      found = false;
      break;
    }
    const ha = (Math.acos(cosHa) * 180) / Math.PI;
    minutes = 720 - 4 * (lon + (rise ? ha : -ha)) - eqTime;
  }

  if (!found) {
    minutes = 720 - 4 * lon + (rise ? -360 : 360);
  }

  return new Date(utcMidnight + Math.round(minutes * 60000));
}
