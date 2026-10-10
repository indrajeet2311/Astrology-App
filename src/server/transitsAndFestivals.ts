import * as Astronomy from 'astronomy-engine';
import type {
  BirthPayload,
  Ayanamsa,
} from '../types';
import type {
  SaturnCycles,
  SaturnPeriod,
  TransitCalendar,
  CalendarEvent,
  MonthSnapshot,
  Placement,
  FestivalCalendar,
  FestivalEvent,
  LunarMonth,
} from '../timelineTypes';
import type { SlowTransits, SlowTrack, SlowSegment } from '../ask/transitTypes';
import {
  norm,
  sign,
  signName,
  nakshatraIndex,
} from './astroMath';
import {
  calculateAyanamsaDegrees,
  calculateSiderealAscendant,
} from './ephemeris';

function dateToStr(d: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(d);
  } catch {
    return d.toISOString().split('T')[0];
  }
}

function siderealLongitude(bodyName: string, date: Date, ayanamsa: Ayanamsa): number {
  const ayan = calculateAyanamsaDegrees(date, ayanamsa);
  if (bodyName === 'Rahu' || bodyName === 'Ketu') {
    const jd = 2440587.5 + date.getTime() / 86_400_000.0;
    const t = (jd - 2451545.0) / 36525.0;
    const omega = 125.04452 - 1934.136261 * t + 0.0020708 * t * t;
    const rahu = norm(omega - ayan);
    return bodyName === 'Rahu' ? rahu : norm(rahu + 180.0);
  }
  const v = Astronomy.GeoVector(bodyName as Astronomy.Body, date, false);
  const ecl = Astronomy.Ecliptic(v);
  return norm(ecl.elon - ayan);
}

function bodySpeed(bodyName: string, date: Date, ayanamsa: Ayanamsa): number {
  if (bodyName === 'Rahu' || bodyName === 'Ketu') return -0.0529;
  const d1 = new Date(date.getTime() - 1800_000);
  const d2 = new Date(date.getTime() + 1800_000);
  const l1 = siderealLongitude(bodyName, d1, ayanamsa);
  const l2 = siderealLongitude(bodyName, d2, ayanamsa);
  let diff = l2 - l1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff * 24.0;
}

// ---------------- Saturn Cycles ----------------
interface Phase {
  kind: 'Sade Sati' | 'Dhaiya';
  phase: string;
}

function phaseFor(saturnSign: number, moonSign: number): Phase | null {
  const diff = ((saturnSign - moonSign + 120) % 12);
  switch (diff) {
    case 11: return { kind: 'Sade Sati', phase: 'Rising' };
    case 0: return { kind: 'Sade Sati', phase: 'Peak' };
    case 1: return { kind: 'Sade Sati', phase: 'Setting' };
    case 3: return { kind: 'Dhaiya', phase: 'Kantaka (4th from Moon)' };
    case 7: return { kind: 'Dhaiya', phase: 'Ashtama (8th from Moon)' };
    default: return null;
  }
}

export function calculateSaturnCycles(birth: BirthPayload): SaturnCycles {
  const birthDate = new Date(`${birth.date}T${birth.time}:00Z`);
  const natalMoonLon = siderealLongitude('Moon', birthDate, birth.ayanamsa);
  const moonSignNum = sign(natalMoonLon) + 1;

  const now = new Date();
  const currentSaturnLon = siderealLongitude('Saturn', now, birth.ayanamsa);
  const currentSaturnSign = signName(sign(currentSaturnLon));

  const startMs = birthDate.getTime();
  const endMs = startMs + 100 * 365.25 * 86400_000;
  const stepMs = 5 * 86400_000;

  const periods: SaturnPeriod[] = [];
  let periodStartMs = startMs;
  let saturnLon = siderealLongitude('Saturn', birthDate, birth.ayanamsa);
  let signNum = sign(saturnLon) + 1;
  let currentPhase = phaseFor(signNum, moonSignNum);

  for (let t = startMs + stepMs; t <= endMs; t += stepMs) {
    const d = new Date(t);
    const lon = siderealLongitude('Saturn', d, birth.ayanamsa);
    const s = sign(lon) + 1;
    const nextPhase = phaseFor(s, moonSignNum);

    const phaseChanged = (currentPhase?.kind !== nextPhase?.kind) || (currentPhase?.phase !== nextPhase?.phase);
    if (phaseChanged) {
      if (currentPhase) {
        periods.push({
          kind: currentPhase.kind,
          phase: currentPhase.phase,
          sign: signName(signNum - 1),
          start: dateToStr(new Date(periodStartMs), birth.timeZone),
          end: dateToStr(new Date(t), birth.timeZone),
          current: now.getTime() >= periodStartMs && now.getTime() < t,
        });
      }
      periodStartMs = t;
      currentPhase = nextPhase;
      signNum = s;
    }
  }

  return {
    moonSign: signName(moonSignNum - 1),
    currentSaturnSign,
    periods,
  };
}

// ---------------- Slow Transits ----------------
export function calculateSlowTransits(birth: BirthPayload, fromStr: string, toStr: string): SlowTransits {
  const fromDate = new Date(`${fromStr}T00:00:00Z`);
  const toDate = new Date(`${toStr}T00:00:00Z`);

  const trackNames = ['Jupiter', 'Saturn', 'Rahu'];
  const tracks: SlowTrack[] = [];

  for (const name of trackNames) {
    const segments: SlowSegment[] = [];
    const stepMs = 4 * 86400_000;
    let segStart = fromDate.getTime();
    let prevLon = siderealLongitude(name, fromDate, birth.ayanamsa);
    let prevSign = sign(prevLon) + 1;
    let prevNak = nakshatraIndex(prevLon);

    for (let t = fromDate.getTime() + stepMs; t <= toDate.getTime(); t += stepMs) {
      const lon = siderealLongitude(name, new Date(t), birth.ayanamsa);
      const s = sign(lon) + 1;
      const n = nakshatraIndex(lon);

      if (s !== prevSign || n !== prevNak) {
        segments.push({
          signNumber: prevSign,
          nakshatraIndex: prevNak,
          start: dateToStr(new Date(segStart), birth.timeZone),
          end: dateToStr(new Date(t), birth.timeZone),
        });
        segStart = t;
        prevSign = s;
        prevNak = n;
      }
    }
    segments.push({
      signNumber: prevSign,
      nakshatraIndex: prevNak,
      start: dateToStr(new Date(segStart), birth.timeZone),
      end: dateToStr(toDate, birth.timeZone),
    });

    tracks.push({ name, segments });
  }

  return { from: fromStr, to: toStr, tracks };
}

// ---------------- Transit Calendar ----------------
export function calculateTransitCalendar(birth: BirthPayload, fromStr?: string): TransitCalendar {
  const birthDate = new Date(`${birth.date}T${birth.time}:00Z`);
  const ascLon = calculateSiderealAscendant(birthDate, birth.latitude, birth.longitude, birth.ayanamsa);
  const ascSign = sign(ascLon) + 1;
  const natalMoonLon = siderealLongitude('Moon', birthDate, birth.ayanamsa);
  const moonSign = sign(natalMoonLon) + 1;

  const fromDate = fromStr ? new Date(`${fromStr}T00:00:00Z`) : new Date();
  const toDate = new Date(fromDate.getTime() + 365 * 86400_000);

  const events: CalendarEvent[] = [];
  const movers = ['Sun', 'Mars', 'Mercury', 'Venus', 'Jupiter', 'Saturn', 'Rahu', 'Ketu'];

  for (const name of movers) {
    let prevLon = siderealLongitude(name, fromDate, birth.ayanamsa);
    let prevSign = sign(prevLon) + 1;
    let prevSpd = bodySpeed(name, fromDate, birth.ayanamsa);

    const stepMs = 86400_000;
    for (let t = fromDate.getTime() + stepMs; t <= toDate.getTime(); t += stepMs) {
      const curDate = new Date(t);
      const curLon = siderealLongitude(name, curDate, birth.ayanamsa);
      const curSign = sign(curLon) + 1;
      const curSpd = bodySpeed(name, curDate, birth.ayanamsa);

      if (curSign !== prevSign) {
        const retro = name !== 'Rahu' && name !== 'Ketu' && curSpd < 0;
        events.push({
          at: curDate.toISOString(),
          type: 'INGRESS',
          planet: name,
          title: `${name} enters ${signName(curSign - 1)}${retro ? ' (retrograde)' : ''}`,
          sign: signName(curSign - 1),
          house: ((curSign - ascSign + 120) % 12) + 1,
          moonHouse: ((curSign - moonSign + 120) % 12) + 1,
          detail: '',
        });
      }

      if (name !== 'Sun' && name !== 'Rahu' && name !== 'Ketu' && Math.sign(prevSpd) !== Math.sign(curSpd)) {
        const turnsRetro = curSpd < 0;
        events.push({
          at: curDate.toISOString(),
          type: turnsRetro ? 'RETROGRADE' : 'DIRECT',
          planet: name,
          title: `${name} ${turnsRetro ? 'turns retrograde' : 'turns direct'} in ${signName(curSign - 1)}`,
          sign: signName(curSign - 1),
          house: ((curSign - ascSign + 120) % 12) + 1,
          moonHouse: ((curSign - moonSign + 120) % 12) + 1,
          detail: '',
        });
      }

      prevLon = curLon;
      prevSign = curSign;
      prevSpd = curSpd;
    }
  }

  // 12 Months snapshot
  const months: MonthSnapshot[] = [];
  for (let i = 0; i < 12; i++) {
    const mDate = new Date(fromDate.getTime() + i * 30 * 86400_000);
    const placements: Placement[] = [];
    for (const p of ['Jupiter', 'Saturn', 'Mars', 'Rahu', 'Ketu']) {
      const pLon = siderealLongitude(p, mDate, birth.ayanamsa);
      const pSign = sign(pLon) + 1;
      const pSpd = bodySpeed(p, mDate, birth.ayanamsa);
      placements.push({
        name: p,
        sign: signName(pSign - 1),
        signNumber: pSign,
        house: ((pSign - ascSign + 120) % 12) + 1,
        moonHouse: ((pSign - moonSign + 120) % 12) + 1,
        retrograde: p === 'Rahu' || p === 'Ketu' || pSpd < 0,
      });
    }
    months.push({
      date: dateToStr(mDate, birth.timeZone),
      planets: placements,
    });
  }

  events.sort((a, b) => a.at.localeCompare(b.at));

  return {
    from: dateToStr(fromDate, birth.timeZone),
    to: dateToStr(toDate, birth.timeZone),
    natalAscendantSign: signName(ascSign - 1),
    natalMoonSign: signName(moonSign - 1),
    events,
    months,
  };
}

// ---------------- Festival Calendar ----------------
const MONTH_NAMES = [
  'Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadrapada',
  'Ashvina', 'Kartika', 'Margashirsha', 'Pausha', 'Magha', 'Phalguna'
];

const SANKRANTI_NAMES = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
  'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'
];

const EKADASHI_SHUKLA = [
  'Kamada', 'Mohini', 'Nirjala', 'Devshayani', 'Shravana Putrada', 'Parivartini',
  'Papankusha', 'Devutthana', 'Mokshada', 'Pausha Putrada', 'Jaya', 'Amalaki'
];

const EKADASHI_KRISHNA = [
  'Papamochani', 'Varuthini', 'Apara', 'Yogini', 'Kamika', 'Aja',
  'Indira', 'Rama', 'Utpanna', 'Saphala', 'Shattila', 'Vijaya'
];

const FESTIVAL_RULES = [
  { name: 'Ugadi / Gudi Padwa (Chaitra Navratri begins)', month: 0, tithi: 1 },
  { name: 'Ram Navami', month: 0, tithi: 9 },
  { name: 'Hanuman Jayanti', month: 0, tithi: 15 },
  { name: 'Akshaya Tritiya', month: 1, tithi: 3 },
  { name: 'Buddha Purnima', month: 1, tithi: 15 },
  { name: 'Rath Yatra', month: 3, tithi: 2 },
  { name: 'Guru Purnima', month: 3, tithi: 15 },
  { name: 'Nag Panchami', month: 4, tithi: 5 },
  { name: 'Raksha Bandhan', month: 4, tithi: 15 },
  { name: 'Krishna Janmashtami', month: 4, tithi: 23 },
  { name: 'Ganesh Chaturthi', month: 5, tithi: 4 },
  { name: 'Sarva Pitru Amavasya (Mahalaya)', month: 5, tithi: 30 },
  { name: 'Sharad Navratri begins', month: 6, tithi: 1 },
  { name: 'Durga Ashtami', month: 6, tithi: 8 },
  { name: 'Vijayadashami (Dussehra)', month: 6, tithi: 10 },
  { name: 'Karwa Chauth', month: 6, tithi: 19 },
  { name: 'Dhanteras', month: 6, tithi: 28 },
  { name: 'Diwali (Lakshmi Puja)', month: 6, tithi: 30 },
  { name: 'Govardhan Puja', month: 7, tithi: 1 },
  { name: 'Bhai Dooj', month: 7, tithi: 2 },
  { name: 'Kartik Purnima (Dev Deepawali)', month: 7, tithi: 15 },
  { name: 'Vasant Panchami', month: 10, tithi: 5 },
  { name: 'Maha Shivaratri', month: 10, tithi: 29 },
  { name: 'Holi (Holika Dahan)', month: 11, tithi: 15 },
];

export function calculateFestivalCalendar(req: {
  year: number; placeName: string; latitude: number; longitude: number; timeZone: string; ayanamsa: Ayanamsa;
}): FestivalCalendar {
  const events: FestivalEvent[] = [];
  const months: LunarMonth[] = [];

  const startYear = new Date(Date.UTC(req.year, 0, 1));
  const endYear = new Date(Date.UTC(req.year, 11, 31));

  // Approximate Sankranti dates (when Sun enters next sidereal sign)
  let prevSunSign = sign(siderealLongitude('Sun', startYear, req.ayanamsa));
  for (let d = new Date(startYear); d <= endYear; d.setUTCDate(d.getUTCDate() + 1)) {
    const sunLon = siderealLongitude('Sun', d, req.ayanamsa);
    const curSunSign = sign(sunLon);
    if (curSunSign !== prevSunSign) {
      const name = SANKRANTI_NAMES[curSunSign];
      events.push({
        date: d.toISOString().split('T')[0],
        category: 'SANKRANTI',
        name: `${name} Sankranti${curSunSign === 9 ? ' (Makar Sankranti)' : ''}`,
        detail: `Sun enters ${signName(curSunSign)}.`,
      });
      prevSunSign = curSunSign;
    }

    const moonLon = siderealLongitude('Moon', d, req.ayanamsa);
    const elongation = norm(moonLon - sunLon);
    const tithi = Math.min(29, Math.floor(elongation / 12.0)) + 1;

    if (tithi === 11 || tithi === 26) {
      const shukla = tithi === 11;
      const monthIdx = curSunSign;
      const name = shukla ? EKADASHI_SHUKLA[monthIdx % 12] : EKADASHI_KRISHNA[(monthIdx + 1) % 12];
      events.push({
        date: d.toISOString().split('T')[0],
        category: 'EKADASHI',
        name: `${name} Ekadashi`,
        detail: `${shukla ? 'Shukla' : 'Krishna'} paksha observance.`,
      });
    }

    if (tithi === 15) {
      events.push({
        date: d.toISOString().split('T')[0],
        category: 'PURNIMA',
        name: 'Purnima',
        detail: 'Full moon tithi.',
      });
    }
    if (tithi === 30) {
      events.push({
        date: d.toISOString().split('T')[0],
        category: 'AMAVASYA',
        name: 'Amavasya',
        detail: 'New moon tithi.',
      });
    }
    if (tithi === 13 || tithi === 28) {
      events.push({
        date: d.toISOString().split('T')[0],
        category: 'PRADOSH',
        name: 'Pradosh Vrat',
        detail: 'Trayodashi (Pradosh kaal).',
      });
    }
    if (tithi === 19) {
      events.push({
        date: d.toISOString().split('T')[0],
        category: 'SANKASHTI',
        name: 'Sankashti Chaturthi',
        detail: 'Krishna Chaturthi.',
      });
    }

    for (const rule of FESTIVAL_RULES) {
      if (curSunSign === rule.month && tithi === rule.tithi) {
        events.push({
          date: d.toISOString().split('T')[0],
          category: 'FESTIVAL',
          name: rule.name,
          detail: `${MONTH_NAMES[rule.month]} observance.`,
        });
      }
    }
  }

  // Generate 12 lunar months
  for (let i = 0; i < 12; i++) {
    const s = new Date(Date.UTC(req.year, i, 1));
    const e = new Date(Date.UTC(req.year, i, 28));
    months.push({
      name: MONTH_NAMES[i],
      adhika: false,
      start: s.toISOString().split('T')[0],
      end: e.toISOString().split('T')[0],
    });
  }

  events.sort((a, b) => a.date.localeCompare(b.date));

  return {
    year: req.year,
    placeName: req.placeName,
    months,
    events,
  };
}
