import { dayTimings } from './dayTimings';
import { WEEKDAY_LORDS } from './constants';
import type { Chart } from './types';

export interface BirthTiming {
  dayDate: string;
  sunrise: string;
  sunset: string;
  hora: string;
  horaStart: string;
  horaEnd: string;
  weekday: string;
  weekdayLord: string;
  timezoneLabel: string;
  offset: string;
  daylightSaving: boolean;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function shiftDate(iso: string, amount: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function offsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, timeZoneName: 'longOffset', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant);
  const label = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = label.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  return (match[1] === '+' ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3]));
}

function isDaylightSaving(instant: Date, timeZone: string): boolean {
  const year = instant.getUTCFullYear();
  const offsets = Array.from({ length: 12 }, (_, month) => offsetMinutes(new Date(Date.UTC(year, month, 15, 12)), timeZone));
  const standard = Math.min(...offsets);
  return offsets.some((offset) => offset !== standard) && offsetMinutes(instant, timeZone) !== standard;
}

function time(instant: Date, timeZone: string): string {
  return instant.toLocaleTimeString(undefined, { timeZone, hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}

/** Sunrise-based birth hora using the chart's actual UTC instant and birthplace timezone. */
export function birthTiming(chart: Chart): BirthTiming | null {
  const { birthDetails } = chart;
  const instant = new Date(birthDetails.utcTime);
  let date = birthDetails.date;
  let timings = dayTimings(date, birthDetails.latitude, birthDetails.longitude);
  if (!timings) return null;
  if (instant < timings.sunrise) {
    date = shiftDate(date, -1);
    timings = dayTimings(date, birthDetails.latitude, birthDetails.longitude);
    if (!timings) return null;
  }
  const sunrise = timings.sunrise;
  const sunset = timings.sunset;
  const slots = instant >= sunrise && instant < sunset ? timings.hora.day : timings.hora.night;
  const hora = slots.find((slot) => instant >= slot.start && instant < slot.end);
  const offset = birthDetails.utcOffset;
  const timezoneLabel = new Intl.DateTimeFormat(undefined, { timeZone: birthDetails.timeZone, timeZoneName: 'short' })
    .formatToParts(instant).find((part) => part.type === 'timeZoneName')?.value ?? birthDetails.timeZone;
  return {
    dayDate: date,
    sunrise: time(sunrise, birthDetails.timeZone),
    sunset: time(sunset, birthDetails.timeZone),
    hora: hora?.label ?? 'Unavailable',
    horaStart: hora ? time(hora.start, birthDetails.timeZone) : '',
    horaEnd: hora ? time(hora.end, birthDetails.timeZone) : '',
    weekday: WEEKDAYS[timings.weekday],
    weekdayLord: WEEKDAY_LORDS[timings.weekday],
    timezoneLabel,
    offset,
    daylightSaving: isDaylightSaving(instant, birthDetails.timeZone),
  };
}
