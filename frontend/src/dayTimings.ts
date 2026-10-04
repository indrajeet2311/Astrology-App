const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export interface Slot { label: string; start: Date; end: Date; tone?: 'good' | 'bad' | 'neutral' }

export interface DayTimings {
  weekday: number;
  sunrise: Date;
  sunset: Date;
  rahuKaal: Slot;
  yamaganda: Slot;
  gulika: Slot;
  abhijit: Slot;
  choghadiya: { day: Slot[]; night: Slot[] };
  hora: { day: Slot[]; night: Slot[] };
}

function solarTerms(jd: number) {
  const t = (jd - 2451545) / 36525;
  const l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const c = Math.sin(rad(m)) * (1.914602 - t * (0.004817 + 0.000014 * t))
    + Math.sin(rad(2 * m)) * (0.019993 - 0.000101 * t) + Math.sin(rad(3 * m)) * 0.000289;
  const omega = 125.04 - 1934.136 * t;
  const lambda = l0 + c - 0.00569 - 0.00478 * Math.sin(rad(omega));
  const eps = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60
    + 0.00256 * Math.cos(rad(omega));
  const decl = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda))));
  const y = Math.tan(rad(eps / 2)) ** 2;
  const eqTime = 4 * deg(y * Math.sin(2 * rad(l0)) - 2 * e * Math.sin(rad(m))
    + 4 * e * y * Math.sin(rad(m)) * Math.cos(2 * rad(l0)) - 0.5 * y * y * Math.sin(4 * rad(l0))
    - 1.25 * e * e * Math.sin(2 * rad(m)));
  return { decl, eqTime };
}

/** UTC minutes after 0h UT of the given Julian day; NOAA solar calculator algorithm. */
function eventMinutes(jd0: number, lat: number, lon: number, rise: boolean): number | null {
  let minutes = 720;
  for (let i = 0; i < 3; i++) {
    const { decl, eqTime } = solarTerms(jd0 + minutes / 1440);
    const cosHa = Math.cos(rad(90.833)) / (Math.cos(rad(lat)) * Math.cos(rad(decl)))
      - Math.tan(rad(lat)) * Math.tan(rad(decl));
    if (cosHa < -1 || cosHa > 1) return null;
    const ha = deg(Math.acos(cosHa));
    minutes = 720 - 4 * (lon + (rise ? ha : -ha)) - eqTime;
  }
  return minutes;
}

const RAHU_PART = [8, 2, 7, 5, 6, 4, 3];
const YAMA_PART = [5, 4, 3, 2, 1, 7, 6];
const GULIKA_PART = [7, 6, 5, 4, 3, 2, 1];
const CHOGHADIYA = ['Udveg', 'Chal', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog'];
const CHOGHADIYA_START = [0, 3, 6, 2, 5, 1, 4];
const CHOGHADIYA_TONE: Record<string, Slot['tone']> = {
  Amrit: 'good', Shubh: 'good', Labh: 'good', Chal: 'neutral', Udveg: 'bad', Kaal: 'bad', Rog: 'bad',
};
const HORA_ORDER = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'];
const WEEKDAY_LORD = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

function split(start: Date, end: Date, parts: number): [Date, Date][] {
  const step = (end.getTime() - start.getTime()) / parts;
  return Array.from({ length: parts }, (_, i) => [
    new Date(start.getTime() + i * step), new Date(start.getTime() + (i + 1) * step),
  ]);
}

/** Sunrise-based timings for a civil date at a location; null in polar regions without a sunrise or sunset. */
export function dayTimings(dateIso: string, lat: number, lon: number): DayTimings | null {
  const [y, m, d] = dateIso.split('-').map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d);
  const jd0 = utcMidnight / 86400000 + 2440587.5;
  const rise = eventMinutes(jd0, lat, lon, true);
  const set = eventMinutes(jd0, lat, lon, false);
  if (rise === null || set === null) return null;
  const sunrise = new Date(utcMidnight + rise * 60000);
  let sunset = new Date(utcMidnight + set * 60000);
  if (sunset <= sunrise) sunset = new Date(sunset.getTime() + 86400000);
  const nextUtcMidnight = utcMidnight + 86400000;
  const nextRiseMinutes = eventMinutes(nextUtcMidnight / 86400000 + 2440587.5, lat, lon, true);
  const nextRise = nextRiseMinutes === null
    ? new Date(sunrise.getTime() + 86400000)
    : new Date(nextUtcMidnight + nextRiseMinutes * 60000);
  const weekday = new Date(utcMidnight).getUTCDay();

  const eighths = split(sunrise, sunset, 8);
  const part = (n: number, label: string, tone: Slot['tone']): Slot => ({
    label, start: eighths[n - 1][0], end: eighths[n - 1][1], tone,
  });
  const muhurtas = split(sunrise, sunset, 15)[7];

  const chogha = (start: Date, end: Date, first: number): Slot[] =>
    split(start, end, 8).map(([s, e], i) => {
      const label = CHOGHADIYA[(first + i) % 7];
      return { label, start: s, end: e, tone: CHOGHADIYA_TONE[label] };
    });
  const horas = (start: Date, end: Date, first: number): Slot[] =>
    split(start, end, 12).map(([s, e], i) => ({ label: HORA_ORDER[(first + i) % 7], start: s, end: e }));
  const horaFirst = HORA_ORDER.indexOf(WEEKDAY_LORD[weekday]);

  return {
    weekday,
    sunrise,
    sunset,
    rahuKaal: part(RAHU_PART[weekday], 'Rahu Kaal', 'bad'),
    yamaganda: part(YAMA_PART[weekday], 'Yamaganda', 'bad'),
    gulika: part(GULIKA_PART[weekday], 'Gulika Kaal', 'bad'),
    abhijit: { label: 'Abhijit Muhurta', start: muhurtas[0], end: muhurtas[1], tone: 'good' },
    choghadiya: {
      day: chogha(sunrise, sunset, CHOGHADIYA_START[weekday]),
      night: chogha(sunset, nextRise, (CHOGHADIYA_START[weekday] + 5) % 7),
    },
    hora: {
      day: horas(sunrise, sunset, horaFirst),
      night: horas(sunset, nextRise, (horaFirst + 12) % 7),
    },
  };
}
